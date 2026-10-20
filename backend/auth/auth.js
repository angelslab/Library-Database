const bcrypt = require("bcryptjs");
const db = require("../db");

// check email + password, return the user (without password) or null
async function login(email, password) {
  const result = await db.query(
    `SELECT
        users.userID,
        users.first_name,
        users.last_name,
        users.email,
        users.role,
        user_credentials.password_hash,

        student.studentID,
        student.major,
        faculty.facultyID,
        faculty.department

      FROM users
      JOIN user_credentials ON user_credentials.userID = users.userID
      LEFT JOIN student ON student.userID = users.userID
      LEFT JOIN faculty ON faculty.userID = users.userID
      WHERE users.email = ?`,
    [email],
  );

  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];

  const ok = await bcrypt.compare(password || "", user.password_hash);

  if (!ok) {
    return null;
  }

  delete user.password_hash;

  return user;
}

// create or change a user's password (stores only the bcrypt hash)
async function setPassword(userID, password) {
  const hash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO user_credentials (userID, password_hash)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [userID, hash],
  );
}

// create a new student or faculty account (users + user_credentials + student/faculty)
// returns { user } on success or { error } if something is wrong
async function register(data) {
  const { first_name, last_name, email, password, role } = data;

  if (!first_name || !last_name || !email || !password || !role) {
    return { error: "Please fill in all fields" };
  }

  if (role !== "student" && role !== "faculty") {
    return { error: "Role must be student or faculty" };
  }

  if (role === "student" && (!data.studentID || !data.major)) {
    return { error: "Student ID and major are required" };
  }

  if (role === "faculty" && (!data.facultyID || !data.department)) {
    return { error: "Faculty ID and department are required" };
  }

  const existing = await db.query(
    `SELECT userID FROM users WHERE email = ?`,
    [email],
  );

  if (existing[0].length > 0) {
    return { error: "This email is already registered" };
  }

  const hash = await bcrypt.hash(password, 10);

  // all inserts succeed together or none of them are saved
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const result = await conn.query(
      `INSERT INTO users (first_name, last_name, email, role)
        VALUES (?, ?, ?, ?)`,
      [first_name, last_name, email, role],
    );

    const userID = result[0].insertId;

    await conn.query(
      `INSERT INTO user_credentials (userID, password_hash)
        VALUES (?, ?)`,
      [userID, hash],
    );

    if (role === "student") {
      await conn.query(
        `INSERT INTO student (userID, studentID, major)
          VALUES (?, ?, ?)`,
        [userID, data.studentID, data.major.trim().toUpperCase()],
      );
    } else {
      await conn.query(
        `INSERT INTO faculty (userID, facultyID, department)
          VALUES (?, ?, ?)`,
        [userID, data.facultyID, data.department],
      );
    }

    await conn.commit();

    return {
      user: {
        userID, first_name, last_name, email, role,
        studentID: role === "student" ? data.studentID : null,
        major: role === "student" ? data.major.trim().toUpperCase() : null,
        facultyID: role === "faculty" ? data.facultyID : null,
        department: role === "faculty" ? data.department : null,
      },
    };
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return { error: "That student or faculty ID is already taken" };
    }

    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { login, setPassword, register };
