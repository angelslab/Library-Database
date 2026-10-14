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
        user_credentials.password_hash

      FROM users
      JOIN user_credentials ON user_credentials.userID = users.userID
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

module.exports = { login, setPassword };
