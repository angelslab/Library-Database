const db = require("../db");

// Fines and Charges report: one row per charge, joined to the borrower,
// the item, and (when there is one) the loan it came from.
async function getFinesReport({ type, paid, from, to, borrower }) {
    const borrowerLike = borrower ? `%${borrower}%` : null;

    const [rows] = await db.query(
    `SELECT u.userID,
            CONCAT(u.first_name, ' ', u.last_name) AS borrower,
            u.role,
            f.fineID,
            DATE_FORMAT(f.issue_date, '%Y-%m-%d') AS issue_date,
            i.title AS item_title,
            i.item_type,
            f.charge_type,
            f.amount,
            f.paid,
            DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date
    FROM fines f
    JOIN users u      ON u.userID = f.userID
    JOIN items i      ON i.itemID = f.itemID
    LEFT JOIN loans l ON l.loanID = f.loanID
    WHERE (? IS NULL OR f.charge_type = ?)
    AND (? IS NULL OR f.paid = ?)
    AND (? IS NULL OR f.issue_date >= ?)
    AND (? IS NULL OR f.issue_date <= ?)
    AND (? IS NULL OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)
    ORDER BY borrower, f.issue_date, f.fineID`,
    [type, type, paid, paid, from, from, to, to, borrowerLike, borrowerLike],
    );
    return rows;
}

module.exports = { getFinesReport };