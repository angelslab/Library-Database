const db = require("../db");
const { LoanError } = require("../loans/loans");

// Late fee per day an item is kept past its due date.
const LATE_FEE_PER_DAY = 0.25;

// Days late: until the return date if it came back, otherwise until today.
const DAYS_LATE = "DATEDIFF(COALESCE(l.returned_date, CURDATE()), l.due_date)";

// Makes sure every late loan has a "Late" fine with the right amount.
// - a loan that is (or was) returned after its due date gets one fine
// - while the item is still out the unpaid amount keeps growing each day
// - once a fine is paid it is never changed again
// Called before fines are read, so the numbers are always up to date
// without anything having to run on a timer.
async function syncLateFines() {
  try {
    await writeLateFines();
  } catch (error) {
    // An extra CHECK rule on the fines table (not part of schema.js) can block this.
    // Log what the rule is so it can be fixed, but still let the page show the fines
    // that already exist instead of failing.
    // 3819 = MySQL, 4025 = MariaDB
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
    `INSERT INTO fines (loanID, userID, itemID, charge_type, paid, issue_date, amount)
      SELECT l.loanID, l.userID, l.itemID, 'Late', 0,
        DATE_ADD(l.due_date, INTERVAL 1 DAY),
        ${DAYS_LATE} * ?
      FROM loans l
      WHERE ${DAYS_LATE} > 0
      AND NOT EXISTS (
        SELECT 1 FROM fines f
        WHERE f.loanID = l.loanID AND f.charge_type = 'Late'
      )`,
    [LATE_FEE_PER_DAY],
  );

  await db.query(
    `UPDATE fines f
      JOIN loans l ON l.loanID = f.loanID
      SET f.amount = ${DAYS_LATE} * ?
      WHERE f.charge_type = 'Late'
      AND f.paid = 0
      AND ${DAYS_LATE} > 0`,
    [LATE_FEE_PER_DAY],
  );
}

// Every fine for one user: amount, issue date and whether it is paid.
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
    late_fee_per_day: LATE_FEE_PER_DAY,
  };
}

// A user pays one of their own fines.
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

    // a user can only pay their own fines
    if (rows.length === 0 || Number(rows[0].userID) !== userID) {
      throw new LoanError(404, "Fine not found");
    }

    const fine = rows[0];

    if (fine.paid) {
      throw new LoanError(409, "This fine is already paid");
    }

    // the late fee is still going up every day, so it can only be paid once the item is back
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
  LATE_FEE_PER_DAY,
  syncLateFines,
  fetchUserFines,
  payFine,
};
