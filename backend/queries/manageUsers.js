const db = require("../db");
const { cancelUserHolds } = require("../holds/holds");

async function getUserDetails(userID) {
  const [rows] = await db.query(
    `SELECT
        u.userID, u.first_name, u.last_name, u.email, u.role,
        COALESCE(s.studentID, fa.facultyID) AS id_number,
        COALESCE(s.major, fa.department) AS major_or_department,

        COALESCE((
          SELECT SUM(fu.amount) FROM fines fu
          WHERE fu.userID = u.userID AND fu.paid = 0
        ), 0) AS total_due,

        (
          SELECT GROUP_CONCAT(hi.title SEPARATOR ', ')
          FROM holds h
          JOIN items hi ON hi.itemID = h.itemID
          WHERE h.userID = u.userID AND h.status = 'waiting'
        ) AS items_on_hold,

        l.loanID, i.item_type, i.title,
        DATE_FORMAT(l.borrow_date, '%Y-%m-%d') AS borrow_date,
        DATE_FORMAT(l.due_date, '%Y-%m-%d') AS due_date,
        CASE WHEN l.due_date < CURRENT_DATE
          THEN DATEDIFF(CURRENT_DATE, l.due_date) ELSE 0
        END AS days_overdue,
        (
          SELECT SUM(f.amount) FROM fines f
          WHERE f.loanID = l.loanID AND f.paid = 0
        ) AS fine_due
      FROM users u
      LEFT JOIN student s  ON s.userID = u.userID
      LEFT JOIN faculty fa ON fa.userID = u.userID
      LEFT JOIN loans l    ON l.userID = u.userID AND l.returned_date IS NULL
      LEFT JOIN items i    ON i.itemID = l.itemID
      WHERE u.userID = ?`,
    [userID],
  );
  return rows;
}

async function updateUserStatus(userID, isActive) {
  // check open loans
  if (Number(isActive) === 0) {
    const [loans] = await db.query(
      `SELECT COUNT(*) AS activeLoans
       FROM loans
       WHERE userID = ?
       AND returned_date IS NULL`,
      [userID],
    );

    if (Number(loans[0].activeLoans) > 0) {
      return { updated: false, hasActiveLoans: true };
    }
  }

  // update status
  // no open loans
  const [result] = await db.query(
    `UPDATE users
     SET is_active = ?
     WHERE userID = ?
     AND (? = 1 OR NOT EXISTS (
       SELECT 1 FROM loans WHERE loans.userID = users.userID AND loans.returned_date IS NULL
     ))`,
    [isActive, userID, Number(isActive)],
  );

  if (result.affectedRows === 0) {
    return { updated: false, hasActiveLoans: false };
  }

  // cancel holds
  if (Number(isActive) === 0) {
    await cancelUserHolds(db, userID);
  }

  return { updated: true, hasActiveLoans: false };
}

module.exports = { getUserDetails, updateUserStatus };
