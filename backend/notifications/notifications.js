const db = require("../db");
// user notifications, newest first
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
        DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM notifications n
      WHERE n.userID = ?
      ORDER BY n.created_at DESC, n.notificationID DESC
      LIMIT 100`,
    [userID],
  );

  return { unread: unreadRows[0].count, notifications };
}

// mark read (all if id is null)
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
  fetchNotifications,
  markNotificationsRead,
};
