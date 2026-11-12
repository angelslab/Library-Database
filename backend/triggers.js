const db = require("./db");
const { FEE_PER_DAY_SQL, FEE_MAX_SQL } = require("./fines/fines");

// The database triggers. schema.js calls createTriggers() on startup.
// Each one is dropped and made again, so a change here reaches every database.

// 1) Late fee: when a loan gets its returned_date and it came back after the
//    due date, MySQL charges the late fee in the fines table by itself.
//    The rate and the maximum depend on the item (see LATE_FEE_RULES in fines.js:
//    books and laptops are charged, other items are not).
//    If a late fine already exists for the loan (it was overdue while still
//    checked out), the unpaid amount is set to the final amount.
const LATE_FEE_TRIGGER = `
  CREATE TRIGGER trg_loans_late_fee
  AFTER UPDATE ON loans
  FOR EACH ROW
  BEGIN
    DECLARE v_rate DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_cap DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_amount DECIMAL(10,2);

    IF OLD.returned_date IS NULL
      AND NEW.returned_date IS NOT NULL
      AND NEW.returned_date > NEW.due_date THEN

      SELECT ${FEE_PER_DAY_SQL}, ${FEE_MAX_SQL}
        INTO v_rate, v_cap
        FROM items i
        LEFT JOIN device d ON d.itemID = i.itemID
        WHERE i.itemID = NEW.itemID;

      IF v_rate IS NOT NULL THEN
        SET v_amount = LEAST(DATEDIFF(NEW.returned_date, NEW.due_date) * v_rate, v_cap);

        UPDATE fines
          SET amount = v_amount
          WHERE loanID = NEW.loanID AND charge_type = 'Late' AND paid = 0;

        IF NOT EXISTS (
          SELECT 1 FROM fines WHERE loanID = NEW.loanID AND charge_type = 'Late'
        ) THEN
          INSERT INTO fines (loanID, userID, itemID, charge_type, paid, issue_date, amount)
            VALUES (
              NEW.loanID,
              NEW.userID,
              NEW.itemID,
              'Late',
              0,
              DATE_ADD(NEW.due_date, INTERVAL 1 DAY),
              v_amount
            );
        END IF;
      END IF;
    END IF;
  END`;

// 2) Hold ready: when an item goes from no copies to a copy being available
//    (a return was approved), MySQL notifies the person first in line.
const HOLD_READY_TRIGGER = `
  CREATE TRIGGER trg_items_hold_ready
  AFTER UPDATE ON items
  FOR EACH ROW
  BEGIN
    IF OLD.available_copies <= 0 AND NEW.available_copies > 0 THEN
      INSERT INTO notifications (userID, type, message, itemID)
        SELECT h.userID,
          'hold_ready',
          CONCAT('A copy of "', NEW.title, '" is back. You are first in line, borrow it now!'),
          NEW.itemID
        FROM holds h
        WHERE h.itemID = NEW.itemID AND h.status = 'waiting'
        ORDER BY h.holdID
        LIMIT 1;
    END IF;
  END`;

// 3) Low stock: when the available copies of an active item go down and are
//    between 1 and 3, every librarian gets a notification.
const LOW_STOCK_TRIGGER = `
  CREATE TRIGGER trg_items_low_stock
  AFTER UPDATE ON items
  FOR EACH ROW
  BEGIN
    IF NEW.is_active = 1
       AND NEW.available_copies BETWEEN 1 AND 3
       AND NEW.available_copies < OLD.available_copies THEN
      INSERT INTO notifications (userID, type, message, itemID)
        SELECT librarian.userID,
          'low_stock',
          CONCAT('Low stock: "', NEW.title, '" has only ', NEW.available_copies,
            IF(NEW.available_copies = 1, ' copy', ' copies'), ' left.'),
          NEW.itemID
        FROM librarian
        JOIN users ON users.userID = librarian.userID;
    END IF;
  END`;

// 4) Audit log: record every borrow (a new loan) and every return (a loan
//    getting its returned_date) in the audit_log table, so there is a full
//    history of who took out and returned each item and when.
const AUDIT_BORROW_TRIGGER = `
  CREATE TRIGGER trg_loans_audit_borrow
  AFTER INSERT ON loans
  FOR EACH ROW
  BEGIN
    INSERT INTO audit_log (action, userID, itemID, loanID)
      VALUES ('borrow', NEW.userID, NEW.itemID, NEW.loanID);
  END`;

const AUDIT_RETURN_TRIGGER = `
  CREATE TRIGGER trg_loans_audit_return
  AFTER UPDATE ON loans
  FOR EACH ROW
  BEGIN
    IF OLD.returned_date IS NULL AND NEW.returned_date IS NOT NULL THEN
      INSERT INTO audit_log (action, userID, itemID, loanID)
        VALUES ('return', NEW.userID, NEW.itemID, NEW.loanID);
    END IF;
  END`;

const TRIGGERS = [
  { name: "trg_loans_late_fee", sql: LATE_FEE_TRIGGER },
  { name: "trg_items_hold_ready", sql: HOLD_READY_TRIGGER },
  { name: "trg_items_low_stock", sql: LOW_STOCK_TRIGGER },
  { name: "trg_loans_audit_borrow", sql: AUDIT_BORROW_TRIGGER },
  { name: "trg_loans_audit_return", sql: AUDIT_RETURN_TRIGGER },
];

async function createTriggers() {
  for (const trigger of TRIGGERS) {
    try {
      await db.query(`DROP TRIGGER IF EXISTS ${trigger.name}`);
      await db.query(trigger.sql);
      console.log(`Trigger ${trigger.name} created`);
    } catch (error) {
      // Azure MySQL can refuse triggers until the server setting
      // log_bin_trust_function_creators is ON. Don't stop the server for it.
      console.error(
        `Could not create trigger ${trigger.name}: ${error.message}` +
          (error.errno === 1419
            ? " (turn ON log_bin_trust_function_creators in the Azure MySQL server parameters)"
            : ""),
      );
    }
  }
}

module.exports = { createTriggers };
