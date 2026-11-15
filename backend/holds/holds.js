const db = require("../db");
const { getLoanPolicy, LoanError } = require("../loans/loans");

// max waiting holds per user
const MAX_WAITING_HOLDS = 5;

// hold status: waiting -> fulfilled / cancelled
async function fulfillBorrowedHolds(userID) {
  await db.query(
    `UPDATE holds h
      SET h.status = 'fulfilled'
      WHERE h.userID = ?
      AND h.status = 'waiting'
      AND EXISTS (
        SELECT 1 FROM loans l
        WHERE l.userID = h.userID
        AND l.itemID = h.itemID
        AND l.returned_date IS NULL
      )`,
    [userID],
  );
}

// place a hold
async function placeHold(userID, itemID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // lock user row
    const [users] = await conn.query(
      "SELECT userID, role, is_active FROM users WHERE userID = ? FOR UPDATE",
      [userID],
    );

    if (users.length === 0) {
      throw new LoanError(404, "User not found");
    }

    if (!users[0].is_active) {
      throw new LoanError(403, "This account has been deactivated");
    }

    if (!getLoanPolicy(users[0].role)) {
      throw new LoanError(
        403,
        "Only student and faculty accounts can place holds",
      );
    }

    const [items] = await conn.query(
      "SELECT itemID, title, available_copies FROM items WHERE itemID = ? AND is_active = 1",
      [itemID],
    );

    if (items.length === 0) {
      throw new LoanError(404, "Item not found");
    }

    const item = items[0];

    const [reserved] = await conn.query(
      "SELECT COUNT(*) AS count FROM holds WHERE itemID = ? AND status = 'waiting'",
      [itemID],
    );

    if (item.available_copies > reserved[0].count) {
      throw new LoanError(
        409,
        `"${item.title}" is available right now, you can borrow it instead`,
      );
    }

    const [onLoan] = await conn.query(
      "SELECT COUNT(*) AS count FROM loans WHERE userID = ? AND itemID = ? AND returned_date IS NULL",
      [userID, itemID],
    );

    if (onLoan[0].count > 0) {
      throw new LoanError(409, `You already have "${item.title}" borrowed`);
    }

    const [existing] = await conn.query(
      "SELECT holdID FROM holds WHERE userID = ? AND itemID = ? AND status = 'waiting'",
      [userID, itemID],
    );

    if (existing.length > 0) {
      throw new LoanError(409, `You already have a hold on "${item.title}"`);
    }

    const [waiting] = await conn.query(
      "SELECT COUNT(*) AS count FROM holds WHERE userID = ? AND status = 'waiting'",
      [userID],
    );

    if (waiting[0].count >= MAX_WAITING_HOLDS) {
      throw new LoanError(
        409,
        `Hold limit reached. You can have up to ${MAX_WAITING_HOLDS} holds at a time.`,
      );
    }

    const [insert] = await conn.query(
      `INSERT INTO holds (userID, itemID, requestDate, status)
        VALUES (?, ?, CURDATE(), 'waiting')`,
      [userID, itemID],
    );

    // place in line
    const [position] = await conn.query(
      `SELECT COUNT(*) AS position FROM holds
        WHERE itemID = ? AND status = 'waiting' AND holdID <= ?`,
      [itemID, insert.insertId],
    );

    await conn.commit();

    return {
      hold: {
        holdID: insert.insertId,
        itemID: item.itemID,
        title: item.title,
        status: "waiting",
        queue_position: position[0].position,
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// cancel hold + notify next
async function cancelAndNotify(conn, holdID, itemID) {
  const [pos] = await conn.query(
    `SELECT COUNT(*) AS position FROM holds
      WHERE itemID = ? AND status = 'waiting' AND holdID <= ?`,
    [itemID, holdID],
  );

  await conn.query("UPDATE holds SET status = 'cancelled' WHERE holdID = ?", [holdID]);

  const [items] = await conn.query(
    "SELECT title, available_copies FROM items WHERE itemID = ? AND is_active = 1",
    [itemID],
  );

  if (items.length === 0) return;

  const available = Number(items[0].available_copies);

  if (available <= 0 || Number(pos[0].position) > available) return;

  const [next] = await conn.query(
    `SELECT userID FROM holds
      WHERE itemID = ? AND status = 'waiting'
      ORDER BY holdID
      LIMIT ?, 1`,
    [itemID, available - 1],
  );

  if (next.length > 0) {
    await conn.query(
      `INSERT INTO notifications (userID, type, message, itemID)
        VALUES (?, 'hold_ready', ?, ?)`,
      [next[0].userID, `A copy of "${items[0].title}" is ready for you. Borrow it now!`, itemID],
    );
  }
}

// cancel user holds
async function cancelUserHolds(conn, userID) {
  const [holds] = await conn.query(
    "SELECT holdID, itemID FROM holds WHERE userID = ? AND status = 'waiting' ORDER BY holdID",
    [userID],
  );

  for (const hold of holds) {
    await cancelAndNotify(conn, hold.holdID, hold.itemID);
  }
}

// cancel a hold
async function cancelHold(userID, holdID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [holds] = await conn.query(
      `SELECT holds.holdID, holds.userID, holds.itemID, holds.status, items.title
        FROM holds
        JOIN items ON items.itemID = holds.itemID
        WHERE holds.holdID = ?
        FOR UPDATE`,
      [holdID],
    );

    // own holds only
    if (holds.length === 0 || Number(holds[0].userID) !== userID) {
      throw new LoanError(404, "Hold not found");
    }

    const hold = holds[0];

    if (hold.status !== "waiting") {
      throw new LoanError(409, `This hold is already ${hold.status}`);
    }

    await cancelAndNotify(conn, holdID, hold.itemID);

    await conn.commit();

    return {
      hold: {
        holdID,
        itemID: hold.itemID,
        title: hold.title,
        status: "cancelled",
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// holds for one user
async function fetchUserHolds(userID) {
  const [users] = await db.query("SELECT userID FROM users WHERE userID = ?", [
    userID,
  ]);

  if (users.length === 0) {
    return null;
  }

  await fulfillBorrowedHolds(userID);

  const [holds] = await db.query(
    `SELECT
        h.holdID,
        h.itemID,
        h.status,
        DATE_FORMAT(h.requestDate, '%Y-%m-%d') AS request_date,
        items.title,
        items.item_type,
        items.total_copies,
        items.available_copies,
        items.is_active,
        COALESCE(book.author, media.author, device.brand) AS creator,
        CASE WHEN h.status = 'waiting' THEN
          (SELECT COUNT(*) FROM holds ahead
            WHERE ahead.itemID = h.itemID
            AND ahead.status = 'waiting'
            AND ahead.holdID <= h.holdID)
        END AS queue_position,
        CASE WHEN h.status = 'waiting' THEN
          (SELECT COUNT(*) FROM holds line
            WHERE line.itemID = h.itemID
            AND line.status = 'waiting')
        END AS queue_length
      FROM holds h
      JOIN items ON items.itemID = h.itemID
      LEFT JOIN book ON book.itemID = items.itemID
      LEFT JOIN media ON media.itemID = items.itemID
      LEFT JOIN device ON device.itemID = items.itemID
      WHERE h.userID = ?
      ORDER BY h.requestDate DESC, h.holdID DESC`,
    [userID],
  );

  for (const hold of holds) {
    hold.queue_position =
      hold.queue_position === null ? null : Number(hold.queue_position);
    hold.queue_length =
      hold.queue_length === null ? null : Number(hold.queue_length);

    // copy available for this user
    hold.ready =
      hold.status === "waiting" &&
      Number(hold.is_active) === 1 &&
      hold.queue_position <= hold.available_copies;
  }

  return {
    active: holds.filter((hold) => hold.status === "waiting"),
    cancelled: holds.filter((hold) => hold.status === "cancelled"),
    fulfilled: holds.filter((hold) => hold.status === "fulfilled"),
    max_holds: MAX_WAITING_HOLDS,
  };
}

module.exports = {
  fulfillBorrowedHolds,
  placeHold,
  cancelHold,
  cancelUserHolds,
  fetchUserHolds,
};
