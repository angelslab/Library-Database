const db = require("../db");

// Activity log: every borrow and return recorded by the audit_log triggers,
// plus every print payment a librarian recorded (print_payments table),
// newest first. A print payment shows as action "print", with Device as its
// type, because the printer is a device. A walk-in payer shows by the name given.

const AUDIT_SQL = `
    SELECT CONCAT('A', a.auditID) AS row_key,
            a.auditID,
            a.action,
            a.loanID,
            COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') AS user_name,
            COALESCE(i.title, 'Unknown') AS item_title,
            i.item_type,
            DATE_FORMAT(a.logged_at, '%Y-%m-%d %H:%i') AS logged_at,
            a.logged_at AS sort_at
      FROM audit_log a
      LEFT JOIN users u ON u.userID = a.userID
      LEFT JOIN items i ON i.itemID = a.itemID`;

const PRINT_SQL = `
    SELECT CONCAT('P', p.paymentID) AS row_key,
            NULL AS auditID,
            'print' AS action,
            NULL AS loanID,
            COALESCE(CONCAT(u.first_name, ' ', u.last_name), p.payer_name) AS user_name,
            CONCAT('Printer: ', p.bw_sheets, ' B/W, ', p.color_sheets, ' color sheets · $',
                   FORMAT(p.amount_charged, 2)) AS item_title,
            'Device' AS item_type,
            DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') AS logged_at,
            p.created_at AS sort_at
      FROM print_payments p
      LEFT JOIN users u ON u.userID = p.userID`;

const ORDER_SQL = " ORDER BY sort_at DESC, row_key DESC";

async function getAuditReport() {
  try {
    const [rows] = await db.query(
      `SELECT * FROM (${AUDIT_SQL} UNION ALL ${PRINT_SQL}) AS activity ${ORDER_SQL}`,
    );
    return rows;
  } catch (error) {
    // the print_payments table doesn't exist yet: show borrows and returns on
    // their own instead of breaking the whole log
    if (error.code !== "ER_NO_SUCH_TABLE") {
      throw error;
    }

    console.error("print_payments table is missing; the activity log is showing borrows and returns only.");

    const [rows] = await db.query(`SELECT * FROM (${AUDIT_SQL}) AS activity ${ORDER_SQL}`);
    return rows;
  }
}

module.exports = { getAuditReport };
