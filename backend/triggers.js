const db = require("./db");
const { LATE_FEE_PER_DAY } = require("./fines/fines");

// The two database triggers. schema.js calls createTriggers() on startup.
// Each one is dropped and made again, so a change here reaches every database.

// 1) Late fee: when a loan gets its returned_date and it came back after the
//    due date, MySQL charges the late fee in the fines table by itself.
//    If a late fine already exists for the loan (it was overdue while still
//    checked out), the unpaid amount is set to the final number of days late.
const LATE_FEE_TRIGGER = `
  CREATE TRIGGER trg_loans_late_fee
  AFTER UPDATE ON loans
  FOR EACH ROW
  BEGIN
    IF OLD.returned_date IS NULL
      AND NEW.returned_date IS NOT NULL
      AND NEW.returned_date > NEW.due_date THEN

      UPDATE fines
        SET amount = DATEDIFF(NEW.returned_date, NEW.due_date) * ${LATE_FEE_PER_DAY}
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
            DATEDIFF(NEW.returned_date, NEW.due_date) * ${LATE_FEE_PER_DAY}
          );
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

const TRIGGERS = [
  { name: "trg_loans_late_fee", sql: LATE_FEE_TRIGGER },
  { name: "trg_items_hold_ready", sql: HOLD_READY_TRIGGER },
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
