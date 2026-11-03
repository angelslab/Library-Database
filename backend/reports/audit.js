const db = require("../db");

// Activity log: every borrow and return recorded by the audit_log triggers,
// newest first, joined to the borrower's name and the item's title.
async function getAuditReport() {
  const [rows] = await db.query(
    `SELECT a.auditID,
            a.action,
            a.loanID,
            COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') AS user_name,
            COALESCE(i.title, 'Unknown') AS item_title,
            i.item_type,
            DATE_FORMAT(a.logged_at, '%Y-%m-%d %H:%i') AS logged_at
      FROM audit_log a
      LEFT JOIN users u ON u.userID = a.userID
      LEFT JOIN items i ON i.itemID = a.itemID
      ORDER BY a.auditID DESC`,
  );
  return rows;
}

module.exports = { getAuditReport };
