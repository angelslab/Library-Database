const db = require("../db");

// loan rules
const LOAN_POLICY = {
  student: { maxLoans: 3, loanDays: 7 },
  faculty: { maxLoans: 5, loanDays: 14 },
};

function getLoanPolicy(role) {
  return LOAN_POLICY[role] || null;
}

class LoanError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function borrowItem(userID, itemID) {
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

    const role = users[0].role;
    const policy = getLoanPolicy(role);

    if (!policy) {
      throw new LoanError(403, "Only student and faculty accounts can borrow items");
    }

    // block if overdue
    const [overdueRows] = await conn.query(
      `SELECT items.title, DATE_FORMAT(loans.due_date, '%Y-%m-%d') AS due_date
        FROM loans
        JOIN items ON items.itemID = loans.itemID
        WHERE loans.userID = ?
        AND loans.returned_date IS NULL
        AND loans.due_date < CURDATE()
        ORDER BY loans.due_date`,
      [userID],
    );

    if (overdueRows.length > 0) {
      const first = overdueRows[0];

      throw new LoanError(
        409,
        overdueRows.length === 1
          ? `You have an overdue item: "${first.title}" was due on ${first.due_date}. Return it before borrowing anything else.`
          : `You have ${overdueRows.length} overdue items, including "${first.title}" (due ${first.due_date}). Return them before borrowing anything else.`,
      );
    }

    const [activeRows] = await conn.query(
      "SELECT COUNT(*) AS count FROM loans WHERE userID = ? AND returned_date IS NULL",
      [userID],
    );

    if (activeRows[0].count >= policy.maxLoans) {
      throw new LoanError(
        409,
        `Borrow limit reached. ${role === "student" ? "Students" : "Faculty"} can borrow up to ${policy.maxLoans} items at a time.`,
      );
    }

    // lock item row
    const [items] = await conn.query(
      "SELECT itemID, title, total_copies, available_copies FROM items WHERE itemID = ? AND is_active = 1 FOR UPDATE",
      [itemID],
    );

    if (items.length === 0) {
      throw new LoanError(404, "Item not found");
    }

    const item = items[0];

    if (item.available_copies <= 0) {
      throw new LoanError(409, `"${item.title}" has no copies available right now`);
    }

    // close stale holds
    await conn.query(
      `UPDATE holds h
        SET h.status = 'fulfilled'
        WHERE h.itemID = ?
        AND h.status = 'waiting'
        AND EXISTS (
          SELECT 1 FROM loans l
          WHERE l.userID = h.userID
          AND l.itemID = h.itemID
          AND l.returned_date IS NULL
        )`,
      [itemID],
    );

    // check hold line
    const [myHold] = await conn.query(
      `SELECT holdID FROM holds
        WHERE userID = ? AND itemID = ? AND status = 'waiting'
        ORDER BY holdID LIMIT 1`,
      [userID, itemID],
    );
    const myHoldID = myHold.length > 0 ? myHold[0].holdID : null;

    const [ahead] = await conn.query(
      `SELECT COUNT(*) AS count FROM holds
        WHERE itemID = ? AND status = 'waiting' AND userID <> ?
        AND (? IS NULL OR holdID < ?)`,
      [itemID, userID, myHoldID, myHoldID],
    );

    if (item.available_copies <= ahead[0].count) {
      throw new LoanError(
        409,
        myHoldID
          ? `"${item.title}" is reserved for people ahead of you in line`
          : `"${item.title}" is reserved for people on the hold list. Place a hold to get in line.`,
      );
    }

    const [insert] = await conn.query(
      `INSERT INTO loans (userID, itemID, borrow_date, due_date, status)
        VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'active')`,
      [userID, itemID, policy.loanDays],
    );

    await conn.query(
      "UPDATE items SET available_copies = available_copies - 1 WHERE itemID = ?",
      [itemID],
    );

    // fulfill hold
    if (myHoldID) {
      await conn.query("UPDATE holds SET status = 'fulfilled' WHERE holdID = ?", [myHoldID]);
    }

    const [loanRows] = await conn.query(
      `SELECT
          loanID,
          itemID,
          DATE_FORMAT(borrow_date, '%Y-%m-%d') AS borrow_date,
          DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
        FROM loans
        WHERE loanID = ?`,
      [insert.insertId],
    );

    await conn.commit();

    return {
      loan: { ...loanRows[0], title: item.title },
      item: {
        itemID: item.itemID,
        total_copies: item.total_copies,
        available_copies: item.available_copies - 1,
      },
      active_loans: activeRows[0].count + 1,
      max_loans: policy.maxLoans,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// return an item (no approval needed)
async function returnItem(userID, loanID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // lock loan row
    const [loans] = await conn.query(
      "SELECT loanID, userID, itemID, returned_date FROM loans WHERE loanID = ? FOR UPDATE",
      [loanID],
    );

    // own loans only
    if (loans.length === 0 || Number(loans[0].userID) !== userID) {
      throw new LoanError(404, "Loan not found");
    }

    const loan = loans[0];

    if (loan.returned_date !== null) {
      throw new LoanError(409, "This item was already returned");
    }

    const [items] = await conn.query(
      "SELECT itemID, title, total_copies, available_copies FROM items WHERE itemID = ? FOR UPDATE",
      [loan.itemID],
    );

    if (items.length === 0) {
      throw new LoanError(404, "Item not found");
    }

    const item = items[0];

    await conn.query(
      "UPDATE loans SET returned_date = CURDATE(), status = 'returned' WHERE loanID = ?",
      [loanID],
    );

    await conn.query(
      "UPDATE items SET available_copies = LEAST(available_copies + 1, total_copies) WHERE itemID = ?",
      [item.itemID],
    );

    // clear old return requests
    await conn.query(
      "UPDATE notifications SET is_read = 1 WHERE loanID = ? AND type = 'return_request'",
      [loanID],
    );

    const [loanRows] = await conn.query(
      "SELECT DATE_FORMAT(returned_date, '%Y-%m-%d') AS returned_date FROM loans WHERE loanID = ?",
      [loanID],
    );

    await conn.commit();

    return {
      loan: {
        loanID,
        itemID: item.itemID,
        title: item.title,
        status: "returned",
        returned_date: loanRows[0].returned_date,
      },
      item: {
        itemID: item.itemID,
        total_copies: item.total_copies,
        available_copies: Math.min(item.available_copies + 1, item.total_copies),
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// My loans data
async function fetchUserLoans(userID) {
  const [users] = await db.query("SELECT userID, role FROM users WHERE userID = ?", [
    userID,
  ]);

  if (users.length === 0) {
    return null;
  }

  const policy = getLoanPolicy(users[0].role);

  const [loans] = await db.query(
    `SELECT
        loans.loanID,
        loans.itemID,
        loans.status,
        items.title,
        items.item_type,
        COALESCE(book.author, media.author, device.brand) AS creator,
        DATE_FORMAT(loans.borrow_date, '%Y-%m-%d') AS borrow_date,
        DATE_FORMAT(loans.due_date, '%Y-%m-%d') AS due_date,
        DATEDIFF(loans.due_date, CURDATE()) AS days_left
      FROM loans
      JOIN items ON items.itemID = loans.itemID
      LEFT JOIN book ON book.itemID = items.itemID
      LEFT JOIN media ON media.itemID = items.itemID
      LEFT JOIN device ON device.itemID = items.itemID
      WHERE loans.userID = ? AND loans.returned_date IS NULL
      ORDER BY loans.due_date ASC, loans.loanID ASC`,
    [userID],
  );

  // waiting holds
  const [holds] = await db.query(
    `SELECT COUNT(*) AS count FROM holds
      WHERE userID = ? AND status NOT IN ('fulfilled', 'cancelled', 'expired')`,
    [userID],
  );

  return {
    loans,
    active_loans: loans.length,
    max_loans: policy ? policy.maxLoans : null,
    loan_days: policy ? policy.loanDays : null,
    holds: holds[0].count,
  };
}

// all loans (librarian)
async function fetchAllLoans(librarianID) {
  const [users] = await db.query("SELECT role FROM users WHERE userID = ?", [
    librarianID,
  ]);

  if (users.length === 0 || users[0].role !== "librarian") {
    throw new LoanError(403, "Only librarians can view all loans");
  }

  const [loans] = await db.query(
    `SELECT
        loans.loanID,
        loans.userID,
        loans.itemID,
        loans.status,
        CONCAT(users.first_name, ' ', users.last_name) AS borrower,
        users.email,
        users.role,
        items.title,
        items.item_type,
        COALESCE(book.author, media.author, device.brand) AS creator,
        book.isbn,
        DATE_FORMAT(loans.borrow_date, '%Y-%m-%d') AS borrow_date,
        DATE_FORMAT(loans.due_date, '%Y-%m-%d') AS due_date,
        DATE_FORMAT(loans.returned_date, '%Y-%m-%d') AS returned_date,
        DATEDIFF(loans.due_date, CURDATE()) AS days_left
      FROM loans
      JOIN users ON users.userID = loans.userID
      JOIN items ON items.itemID = loans.itemID
      LEFT JOIN book ON book.itemID = items.itemID
      LEFT JOIN media ON media.itemID = items.itemID
      LEFT JOIN device ON device.itemID = items.itemID
      ORDER BY loans.borrow_date DESC, loans.loanID DESC`,
  );

  return { loans };
}

module.exports = {
  LOAN_POLICY,
  getLoanPolicy,
  LoanError,
  borrowItem,
  returnItem,
  fetchUserLoans,
  fetchAllLoans,
};
