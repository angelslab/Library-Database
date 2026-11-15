const bcrypt = require("bcryptjs");
const db = require("../db");

// trimmed string
const str = (v) => (typeof v === "string" ? v.trim() : "");

// check lengths
function lengthError({ first_name, last_name, email, major, department }) {
  if (first_name.length > 50 || last_name.length > 50) {
    return "Names must be 50 characters or less";
  }
  if (email.length > 100) return "Email must be 100 characters or less";
  if ((major || "").length > 50) return "Major must be 50 characters or less";
  if ((department || "").length > 50) return "Department must be 50 characters or less";
  return null;
}

// check login, return user or null
async function login(email, password) {
  if (typeof password !== "string") return null;

  const result = await db.query(
    `SELECT
        users.userID,
        users.first_name,
        users.last_name,
        users.email,
        users.role,
        users.is_active,
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
    [str(email)],
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

  // check account is active
  if (Number(user.is_active) === 0) {
    return {
      error: "Your account has been disabled. Please contact the librarian.",
    };
  }

  delete user.password_hash;

  return user;
}

// save password hash
async function setPassword(userID, password) {
  const hash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO user_credentials (userID, password_hash)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [userID, hash],
  );
}

// register student or faculty
async function register(data) {
  const { password, role } = data;
  const first_name = str(data.first_name);
  const last_name = str(data.last_name);
  const email = str(data.email);

  if (!first_name || !last_name || !email || typeof password !== "string" || !role) {
    return { error: "Please fill in all fields" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const tooLong = lengthError({ first_name, last_name, email, major: str(data.major) });
  if (tooLong) return { error: tooLong };

  if (role === "faculty") {
    return { error: "Faculty accounts are created by a librarian" };
  }

  if (role !== "student") {
    return { error: "Role must be student" };
  }

  if (role === "student" && (!data.studentID || !str(data.major))) {
    return { error: "Student ID and major are required" };
  }

  // student ID must be a positive integer
  const studentID = Number(data.studentID);

  if (
    role === "student" &&
    (!Number.isInteger(studentID) || studentID <= 0 || studentID > 2147483647)
  ) {
    return { error: "Student ID must be a positive whole number" };
  }

  if (role === "faculty" && (!data.facultyID || !data.department)) {
    return { error: "Faculty ID and department are required" };
  }

  const existing = await db.query(`SELECT userID FROM users WHERE email = ?`, [
    email,
  ]);

  if (existing[0].length > 0) {
    return { error: "This email is already registered" };
  }

  const hash = await bcrypt.hash(password, 10);

  // transaction
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
        [userID, studentID, String(data.major).trim().toUpperCase()],
      );
    } else {
      await conn.query(
        `INSERT INTO faculty (userID, facultyID, department)
          VALUES (?, ?, ?)`,
        [userID, data.facultyID, String(data.department).trim().toUpperCase()],
      );
    }

    await conn.commit();

    return {
      user: {
        userID,
        first_name,
        last_name,
        email,
        role,
        studentID: role === "student" ? studentID : null,
        major: role === "student" ? String(data.major).trim().toUpperCase() : null,
        facultyID: role === "faculty" ? data.facultyID : null,
        department:
          role === "faculty" ? String(data.department).trim().toUpperCase() : null,
      },
    };
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return {
        error: String(error.message).includes("uq_users_email")
          ? "This email is already registered"
          : "That student or faculty ID is already taken",
      };
    }

    throw error;
  } finally {
    conn.release();
  }
}

// librarian creates faculty account
async function createFaculty(data) {
  const { librarianID, password } = data;
  const first_name = str(data.first_name);
  const last_name = str(data.last_name);
  const email = str(data.email);
  const department = str(data.department);
  const facultyID = Number(data.facultyID);

  const [librarians] = await db.query(
    "SELECT role FROM users WHERE userID = ?",
    [librarianID],
  );

  if (librarians.length === 0 || librarians[0].role !== "librarian") {
    return { error: "Only librarians can create faculty accounts", status: 403 };
  }

  if (!first_name || !last_name || !email || typeof password !== "string" || !department) {
    return { error: "Please fill in all fields", status: 400 };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters", status: 400 };
  }

  const tooLong = lengthError({ first_name, last_name, email, department });
  if (tooLong) return { error: tooLong, status: 400 };

  if (!Number.isInteger(facultyID) || facultyID <= 0 || facultyID > 2147483647) {
    return { error: "Faculty ID must be a positive whole number", status: 400 };
  }

  const [existing] = await db.query("SELECT userID FROM users WHERE email = ?", [
    email.trim(),
  ]);

  if (existing.length > 0) {
    return { error: "This email is already registered", status: 409 };
  }

  const hash = await bcrypt.hash(password, 10);
  const dept = String(department).trim().toUpperCase();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO users (first_name, last_name, email, role)
        VALUES (?, ?, ?, 'faculty')`,
      [first_name.trim(), last_name.trim(), email.trim()],
    );

    await conn.query(
      "INSERT INTO user_credentials (userID, password_hash) VALUES (?, ?)",
      [result.insertId, hash],
    );

    await conn.query(
      "INSERT INTO faculty (userID, facultyID, department) VALUES (?, ?, ?)",
      [result.insertId, facultyID, dept],
    );

    await conn.commit();

    return {
      user: {
        userID: result.insertId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        role: "faculty",
        facultyID,
        department: dept,
      },
    };
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return {
        error: String(error.message).includes("uq_users_email")
          ? "This email is already registered"
          : "That faculty ID is already taken",
        status: 409,
      };
    }

    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { login, setPassword, register, createFaculty };
