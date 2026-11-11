const db = require("../db");
const { LoanError } = require("../loans/loans");

// Printing rates, one place to change them. Money is kept in cents inside the
// code so sums like 0.10 + 0.20 never pick up floating point errors.
const PRINT_RATES = {
  bw_cents: 10, // black ink: $0.10 per sheet
  color_cents: 20, // colored ink: $0.20 per sheet
};

const PAYMENT_METHODS = ["cash", "card", "other"];
const MAX_SHEETS = 10000;
const MAX_CHARGE_CENTS = 100000; // $1,000.00 sanity cap for one payment

function toCents(dollars) {
  return Math.round(dollars * 100);
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function calculateCents(bwSheets, colorSheets) {
  return bwSheets * PRINT_RATES.bw_cents + colorSheets * PRINT_RATES.color_cents;
}

function cleanSheets(value, label) {
  const number = value === undefined || value === null || value === "" ? 0 : Number(value);

  if (!Number.isInteger(number) || number < 0 || number > MAX_SHEETS) {
    throw new LoanError(400, `${label} must be a whole number from 0 to ${MAX_SHEETS}`);
  }

  return number;
}

async function requireLibrarian(conn, librarianID) {
  const [rows] = await conn.query("SELECT role FROM users WHERE userID = ?", [librarianID]);

  if (rows.length === 0 || rows[0].role !== "librarian") {
    throw new LoanError(403, "Only librarians can record print payments");
  }
}

// Records one print payment. The server works out the price itself from the sheet
// counts, so the page can't send a wrong total. A librarian may charge a custom
// amount instead (for example a discount), but then a note is required.
async function createPrintPayment({
  librarianID,
  userID,
  payerName,
  bwSheets,
  colorSheets,
  customAmount,
  paymentMethod,
  note,
}) {
  const bw = cleanSheets(bwSheets, "Black sheets");
  const color = cleanSheets(colorSheets, "Color sheets");

  if (bw + color === 0) {
    throw new LoanError(400, "Enter at least one printed sheet");
  }

  const method = String(paymentMethod || "cash").toLowerCase();

  if (!PAYMENT_METHODS.includes(method)) {
    throw new LoanError(400, "Payment method must be cash, card or other");
  }

  const cleanNote = String(note || "").trim().slice(0, 255);
  const computedCents = calculateCents(bw, color);
  let chargedCents = computedCents;

  if (customAmount !== undefined && customAmount !== null && customAmount !== "") {
    const amount = Number(customAmount);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new LoanError(400, "Custom amount must be 0 or more");
    }

    chargedCents = toCents(amount);

    if (chargedCents !== computedCents && cleanNote === "") {
      throw new LoanError(400, "Add a note explaining why the amount was changed");
    }
  }

  if (chargedCents > MAX_CHARGE_CENTS) {
    throw new LoanError(400, "That amount is too large for a single payment");
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();
    await requireLibrarian(conn, librarianID);

    let name = String(payerName || "").trim().slice(0, 100);
    let payerID = null;

    if (userID !== undefined && userID !== null) {
      const [users] = await conn.query(
        "SELECT userID, first_name, last_name FROM users WHERE userID = ?",
        [userID],
      );

      if (users.length === 0) {
        throw new LoanError(404, "User not found");
      }

      payerID = users[0].userID;
      name = `${users[0].first_name} ${users[0].last_name}`;
    }

    if (name === "") {
      name = "Walk-in";
    }

    const [insert] = await conn.query(
      `INSERT INTO print_payments
        (userID, payer_name, librarianID, bw_sheets, color_sheets, bw_rate, color_rate,
         computed_amount, amount_charged, payment_method, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payerID,
        name,
        librarianID,
        bw,
        color,
        fromCents(PRINT_RATES.bw_cents),
        fromCents(PRINT_RATES.color_cents),
        fromCents(computedCents),
        fromCents(chargedCents),
        method,
        cleanNote || null,
      ],
    );

    await conn.commit();

    return {
      paymentID: insert.insertId,
      payer_name: name,
      bw_sheets: bw,
      color_sheets: color,
      computed_amount: fromCents(computedCents),
      amount_charged: fromCents(chargedCents),
      payment_method: method,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Newest payments first, plus today's totals for the page header.
async function fetchPrintPayments(librarianID) {
  await requireLibrarian(db, librarianID);

  const [payments] = await db.query(
    `SELECT paymentID, userID, payer_name, bw_sheets, color_sheets,
        computed_amount, amount_charged, payment_method, note,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
      FROM print_payments
      ORDER BY paymentID DESC
      LIMIT 100`,
  );

  const [today] = await db.query(
    `SELECT COUNT(*) AS count,
        COALESCE(SUM(amount_charged), 0) AS total,
        COALESCE(SUM(bw_sheets), 0) AS bw_sheets,
        COALESCE(SUM(color_sheets), 0) AS color_sheets
      FROM print_payments
      WHERE DATE(created_at) = CURDATE()`,
  );

  return {
    rates: {
      bw: fromCents(PRINT_RATES.bw_cents),
      color: fromCents(PRINT_RATES.color_cents),
    },
    today: {
      count: Number(today[0].count),
      total: Number(today[0].total),
      bw_sheets: Number(today[0].bw_sheets),
      color_sheets: Number(today[0].color_sheets),
    },
    payments: payments.map((p) => ({
      ...p,
      computed_amount: Number(p.computed_amount),
      amount_charged: Number(p.amount_charged),
    })),
  };
}

module.exports = {
  PRINT_RATES,
  calculateCents,
  createPrintPayment,
  fetchPrintPayments,
};
