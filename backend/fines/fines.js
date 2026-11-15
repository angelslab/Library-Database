const db = require("../db");
const { LoanError } = require("../loans/loans");

// late fee per day, with a max (books and laptops only)
const LATE_FEE_RULES = {
  book: { per_day: 0.2, max: 12 },
  laptop: { per_day: 1, max: 60 },
};

// SQL for rate and max (i = items, d = device), also used in triggers.js
const FEE_PER_DAY_SQL = `CASE
    WHEN i.item_type = 'Book' THEN ${LATE_FEE_RULES.book.per_day}
    WHEN i.item_type = 'Device' AND d.device_type = 'Laptop' THEN ${LATE_FEE_RULES.laptop.per_day}
  END`;

const FEE_MAX_SQL = `CASE
    WHEN i.item_type = 'Book' THEN ${LATE_FEE_RULES.book.max}
    WHEN i.item_type = 'Device' AND d.device_type = 'Laptop' THEN ${LATE_FEE_RULES.laptop.max}
  END`;

// days late
const DAYS_LATE = "DATEDIFF(COALESCE(l.returned_date, CURDATE()), l.due_date)";

// fine = days late * rate, capped
const LATE_FEE_AMOUNT = `LEAST(${DAYS_LATE} * (${FEE_PER_DAY_SQL}), ${FEE_MAX_SQL})`;

// create/update late fines (paid fines are not changed)
async function syncLateFines() {
  try {
    await writeLateFines();
  } catch (error) {
    // deadlock, skip
    if (error.errno === 1213 || error.errno === 1205) {
      return;
    }

    // CHECK constraint error: log it and continue
    if (error.errno === 3819 || error.errno === 4025) {
      const [rules] = await db.query(
        `SELECT cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
          FROM information_schema.CHECK_CONSTRAINTS cc
          JOIN information_schema.TABLE_CONSTRAINTS tc
            ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
            AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
          WHERE tc.TABLE_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'fines'`,
      );

      console.error(
        "Late fees were not updated: the fines table has a CHECK rule that schema.js does not create.",
        rules,
        "Remove it with: ALTER TABLE fines DROP CONSTRAINT <CONSTRAINT_NAME>;",
      );
      return;
    }

    throw error;
  }
}

async function writeLateFines() {
  await db.query(
    `INSERT IGNORE INTO fines (loanID, userID, itemID, charge_type, paid, issue_date, amount)
      SELECT l.loanID, l.userID, l.itemID, 'Late', 0,
        DATE_ADD(l.due_date, INTERVAL 1 DAY),
        ${LATE_FEE_AMOUNT}
      FROM loans l
      JOIN items i ON i.itemID = l.itemID
      LEFT JOIN device d ON d.itemID = l.itemID
      WHERE ${DAYS_LATE} > 0
      AND (${FEE_PER_DAY_SQL}) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM fines f
        WHERE f.loanID = l.loanID AND f.charge_type = 'Late'
      )`,
  );

  await db.query(
    `UPDATE fines f
      JOIN loans l ON l.loanID = f.loanID
      JOIN items i ON i.itemID = l.itemID
      LEFT JOIN device d ON d.itemID = l.itemID
      SET f.amount = ${LATE_FEE_AMOUNT}
      WHERE f.charge_type = 'Late'
      AND f.paid = 0
      AND ${DAYS_LATE} > 0
      AND (${FEE_PER_DAY_SQL}) IS NOT NULL`,
  );
}

// fines for one user
async function fetchUserFines(userID) {
  const [users] = await db.query("SELECT userID FROM users WHERE userID = ?", [
    userID,
  ]);

  if (users.length === 0) {
    return null;
  }

  await syncLateFines();

  const [fines] = await db.query(
    `SELECT
        f.fineID,
        f.loanID,
        f.itemID,
        f.charge_type,
        f.amount,
        f.paid,
        DATE_FORMAT(f.issue_date, '%Y-%m-%d') AS issue_date,
        items.title,
        items.item_type,
        DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date,
        DATE_FORMAT(l.returned_date, '%Y-%m-%d') AS returned_date,
        (l.loanID IS NOT NULL AND l.returned_date IS NULL) AS still_out,
        CASE WHEN l.loanID IS NOT NULL
          THEN DATEDIFF(COALESCE(l.returned_date, CURDATE()), l.due_date)
        END AS days_late
      FROM fines f
      JOIN items ON items.itemID = f.itemID
      LEFT JOIN loans l ON l.loanID = f.loanID
      WHERE f.userID = ?
      ORDER BY f.paid ASC, f.issue_date DESC, f.fineID DESC`,
    [userID],
  );

  let unpaidTotal = 0;
  let paidTotal = 0;

  for (const fine of fines) {
    fine.amount = Number(fine.amount);
    fine.paid = Boolean(fine.paid);
    fine.still_out = Boolean(fine.still_out);

    if (fine.paid) {
      paidTotal += fine.amount;
    } else {
      unpaidTotal += fine.amount;
    }
  }

  return {
    fines,
    unpaid_total: Number(unpaidTotal.toFixed(2)),
    paid_total: Number(paidTotal.toFixed(2)),
    late_fee_rules: LATE_FEE_RULES,
  };
}

// pay a fine
async function payFine(userID, fineID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT f.fineID, f.userID, f.amount, f.paid, f.charge_type, items.title,
          (l.loanID IS NOT NULL AND l.returned_date IS NULL) AS still_out
        FROM fines f
        JOIN items ON items.itemID = f.itemID
        LEFT JOIN loans l ON l.loanID = f.loanID
        WHERE f.fineID = ?
        FOR UPDATE`,
      [fineID],
    );

    // own fines only
    if (rows.length === 0 || Number(rows[0].userID) !== userID) {
      throw new LoanError(404, "Fine not found");
    }

    const fine = rows[0];

    if (fine.paid) {
      throw new LoanError(409, "This fine is already paid");
    }

    // item must be returned first
    if (fine.charge_type === "Late" && fine.still_out) {
      throw new LoanError(
        409,
        `"${fine.title}" is still checked out. Return it first, then pay the late fee.`,
      );
    }

    await conn.query("UPDATE fines SET paid = 1 WHERE fineID = ?", [fineID]);

    await conn.commit();

    return {
      fine: {
        fineID,
        title: fine.title,
        amount: Number(fine.amount),
        paid: true,
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  FEE_PER_DAY_SQL,
  FEE_MAX_SQL,
  syncLateFines,
  fetchUserFines,
  payFine,
};
