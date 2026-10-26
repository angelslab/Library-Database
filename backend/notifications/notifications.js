const db = require("../db");
// one notification for every librarian
async function notifyLibrarians(conn, { type, message, loanID, itemID }) {
  const [result] = await conn.query(
    `INSERT INTO notifications (userID, type, message, loanID, itemID)
      SELECT librarian.userID, ?, ?, ?, ?
      FROM librarian
      JOIN users ON users.userID = librarian.userID`,
    [type, message, loanID, itemID],
  );

  return result.affectedRows;
}

// one notification for one user
async function notifyUser(conn, { userID, type, message, loanID, itemID }) {
  await conn.query(
    `INSERT INTO notifications (userID, type, message, loanID, itemID)
      VALUES (?, ?, ?, ?, ?)`,
    [userID, type, message, loanID, itemID],
  );
}

// newest first. loan_pending is 1 while the return request is still waiting for a librarian
async function fetchNotifications(userID, countOnly = false) {
  const [unreadRows] = await db.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE userID = ? AND is_read = 0",
    [userID],
  );

  if (countOnly) {
    return { unread: unreadRows[0].count };
  }

  const [notifications] = await db.query(
    `SELECT
        n.notificationID,
        n.type,
        n.message,
        n.loanID,
        n.itemID,
        n.is_read,
        DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
        (l.loanID IS NOT NULL
          AND l.returned_date IS NULL
          AND l.status = 'return_requested') AS loan_pending
      FROM notifications n
      LEFT JOIN loans l ON l.loanID = n.loanID
      WHERE n.userID = ?
      ORDER BY n.created_at DESC, n.notificationID DESC
      LIMIT 100`,
    [userID],
  );

  return { unread: unreadRows[0].count, notifications };
}

// mark one notification as read, or all of them when notificationID is null
async function markNotificationsRead(userID, notificationID = null) {
  const [result] =
    notificationID === null
      ? await db.query(
          "UPDATE notifications SET is_read = 1 WHERE userID = ? AND is_read = 0",
          [userID],
        )
      : await db.query(
          "UPDATE notifications SET is_read = 1 WHERE userID = ? AND notificationID = ?",
          [userID, notificationID],
        );

  return result.affectedRows;
}

module.exports = {
  notifyLibrarians,
  notifyUser,
  fetchNotifications,
  markNotificationsRead,
};
