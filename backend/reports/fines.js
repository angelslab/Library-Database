const db = require("../db");

// Fines and Charges report: one row per charge, joined to the borrower,
// the item, and (when there is one) the loan it came from.
// Print payments recorded by the librarian (print_payments table) are added as
// "Printer" charges that are already collected, so they show in the same
// table and pie charts. A walk-in payer has no userID and no role.

const FINES_SQL = `
    SELECT u.userID,
            CONCAT(u.first_name, ' ', u.last_name) AS borrower,
            u.role,
            f.fineID,
            CONCAT('F', f.fineID) AS row_key,
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
    AND (? IS NULL OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)`;

const PRINT_SQL = `
    SELECT p.userID,
            p.payer_name AS borrower,
            COALESCE(u.role, 'walk-in') AS role,
            NULL AS fineID,
            CONCAT('P', p.paymentID) AS row_key,
            DATE_FORMAT(p.created_at, '%Y-%m-%d') AS issue_date,
            CONCAT('Printing: ', p.bw_sheets, ' B/W, ', p.color_sheets, ' color sheets') AS item_title,
            NULL AS item_type,
            'Printer' AS charge_type,
            p.amount_charged AS amount,
            1 AS paid,
            NULL AS due_date
    FROM print_payments p
    LEFT JOIN users u ON u.userID = p.userID
    WHERE (? IS NULL OR 'Printer' = ?)
    AND (? IS NULL OR 1 = ?)
    AND (? IS NULL OR DATE(p.created_at) >= ?)
    AND (? IS NULL OR DATE(p.created_at) <= ?)
    AND (? IS NULL OR p.payer_name LIKE ?)`;

const ORDER_SQL = " ORDER BY borrower, issue_date, row_key";

async function getFinesReport({ type, paid, from, to, borrower }) {
    const borrowerLike = borrower ? `%${borrower}%` : null;

    const filters = [type, type, paid, paid, from, from, to, to, borrowerLike, borrowerLike];

    try {
        const [rows] = await db.query(
            `${FINES_SQL} UNION ALL ${PRINT_SQL} ${ORDER_SQL}`,
            [...filters, ...filters],
        );
        return rows;
    } catch (error) {
        // the print_payments table doesn't exist yet (backend not restarted with the
        // new schema, or it could not be created): show the fines on their own
        // instead of breaking the whole report
        if (error.code !== "ER_NO_SUCH_TABLE") {
            throw error;
        }

        console.error("print_payments table is missing; the fines report is showing fines only.");

        const [rows] = await db.query(`${FINES_SQL} ${ORDER_SQL}`, filters);
        return rows;
    }
}

module.exports = { getFinesReport };
