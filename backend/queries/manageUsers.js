const db = require("../db");

async function getUserDetails(userID) {
    const [rows] = await db.query(`
SELECT u.userID, u.first_name, u.last_name, u.email, u.role,
    COALESCE(s.studentID, fa.facultyID) AS id_number,
    COALESCE(s.major, fa.department)    AS major_or_department,
    COALESCE((SELECT SUM(fu.amount)
    FROM fines fu
    WHERE fu.userID = u.userID AND fu.paid = 0), 0) AS total_due,

    (SELECT GROUP_CONCAT(hi.title SEPARATOR ', ')
    FROM holds h
    JOIN items hi ON hi.itemID = h.itemID
    WHERE h.userID = u.userID AND h.status = 'waiting') AS items_on_hold,

    l.loanID, i.item_type, i.title, l.borrow_date, l.due_date,
    CASE WHEN l.due_date < CURRENT_DATE
        THEN DATEDIFF(CURRENT_DATE, l.due_date) ELSE 0 END AS days_overdue,
    f.amount AS fine_due

FROM users u
LEFT JOIN student s  ON s.userID = u.userID
LEFT JOIN faculty fa ON fa.userID = u.userID
LEFT JOIN loans l    ON l.userID = u.userID AND l.returned_date IS NULL
LEFT JOIN items i    ON i.itemID = l.itemID
LEFT JOIN fines f    ON f.loanID = l.loanID AND f.paid = 0
WHERE u.userID = ?;`,
    [userID]
    );
    return rows;
}

module.exports = { getUserDetails };

