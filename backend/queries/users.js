const db = require("../db");

async function manageUsers(q) {
    const term = `%${q}%`;
    const [rows] = await db.query(`   
        SELECT u.userID, u.first_name, u.last_name, u.email, u.role,
        COALESCE(s.studentID, f.facultyID) AS id_number,
        COALESCE(s.major, f.department)    AS major_or_department
        FROM users u
        LEFT JOIN student s ON s.userID = u.userID
        LEFT JOIN faculty f ON f.userID = u.userID
        WHERE u.first_name LIKE ?
        OR u.last_name  LIKE ?
        OR s.studentID  = ?
        OR f.facultyID  = ?`,
    [term, term, q, q]
);
    return rows;
}

module.exports = { manageUsers };
