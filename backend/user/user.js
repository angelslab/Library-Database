const db = require("../db");

// profile: basic info + student/faculty details + loan and fine totals
async function getProfile(userID) {
  const result = await db.query(
    `SELECT
        users.userID,
        users.first_name,
        users.last_name,
        users.email,
        users.role,

        student.studentID,
        student.major,
        faculty.facultyID,
        faculty.department,
        COALESCE(student.max_limit, faculty.max_limit) AS max_limit,

        (SELECT COUNT(*) FROM loans
          WHERE loans.userID = users.userID
          AND loans.returned_date IS NULL) AS current_loans,

        (SELECT COALESCE(SUM(amount), 0) FROM fines
          WHERE fines.userID = users.userID
          AND fines.paid = 0) AS unpaid_fines

      FROM users
      LEFT JOIN student ON student.userID = users.userID
      LEFT JOIN faculty ON faculty.userID = users.userID
      WHERE users.userID = ?`,
    [userID],
  );

  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

module.exports = { getProfile };
