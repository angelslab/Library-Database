const db = require("../db");

// Loans by Role and Item Type: one row per loan, joined to the borrower,
// their student or faculty record, and the item.
async function getLoansReport({ from, to, role, itemType, status, dept }) {
    const deptLike = dept ? `%${dept}%` : null;

    const [rows] = await db.query(
    `SELECT l.loanID,
            u.role,
            COALESCE(s.major, fa.department, 'N/A') AS group_name,
            i.item_type,
            i.title,
            CONCAT(u.first_name, ' ', u.last_name) AS borrower,
            DATE_FORMAT(l.borrow_date, '%Y-%m-%d') AS borrow_date,
            DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date,
            DATE_FORMAT(l.returned_date, '%Y-%m-%d') AS returned_date,
            CASE WHEN l.returned_date IS NOT NULL THEN 'Returned'
    WHEN l.due_date < CURRENT_DATE THEN 'Overdue'
    ELSE 'Out' END AS loan_status
    FROM loans l
    JOIN users u          ON u.userID = l.userID
    JOIN items i          ON i.itemID = l.itemID
    LEFT JOIN student s   ON s.userID = u.userID
    LEFT JOIN faculty fa  ON fa.userID = u.userID
    WHERE (? IS NULL OR l.borrow_date >= ?)
    AND (? IS NULL OR l.borrow_date <= ?)
    AND (? IS NULL OR u.role = ?)
    AND (? IS NULL OR i.item_type = ?)
    AND (? IS NULL
    OR (? = 'out' AND l.returned_date IS NULL)
    OR (? = 'returned' AND l.returned_date IS NOT NULL))
    AND (? IS NULL OR COALESCE(s.major, fa.department) LIKE ?)
    ORDER BY u.role, group_name, i.item_type, l.borrow_date, l.loanID`,
    [
    from,
    from,
    to,
    to,
    role,
    role,
    itemType,
    itemType,
    status,
    status,
    status,
    deptLike,
    deptLike,
    ],
);
    return rows;
}

module.exports = { getLoansReport };