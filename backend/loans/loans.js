const db = require("../db");
const { notifyLibrarians, notifyUser } = require("../notifications/notifications");

// Borrowing rules, one place to change them.
const LOAN_POLICY = {
  student: { maxLoans: 3, loanDays: 7 },
  faculty: { maxLoans: 5, loanDays: 14 },
};

function getLoanPolicy(role) {
  return LOAN_POLICY[role] || null;
}

class LoanError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function borrowItem(userID, itemID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // lock the user's row so two quick clicks can't slip past the limit
    const [users] = await conn.query(
      "SELECT userID, role FROM users WHERE userID = ? FOR UPDATE",
      [userID],
    );

    if (users.length === 0) {
      throw new LoanError(404, "User not found");
    }

    const role = users[0].role;
    const policy = getLoanPolicy(role);

    if (!policy) {
      throw new LoanError(403, "Only student and faculty accounts can borrow items");
    }

    const [activeRows] = await conn.query(
      "SELECT COUNT(*) AS count FROM loans WHERE userID = ? AND returned_date IS NULL",
      [userID],
    );

    if (activeRows[0].count >= policy.maxLoans) {
      throw new LoanError(
        409,
        `Borrow limit reached. ${role === "student" ? "Students" : "Faculty"} can borrow up to ${policy.maxLoans} items at a time.`,
      );
    }

    // lock the item row so two people can't take the last copy
    const [items] = await conn.query(
      "SELECT itemID, title, total_copies, available_copies FROM items WHERE itemID = ? AND is_active = 1 FOR UPDATE",
      [itemID],
    );

    if (items.length === 0) {
      throw new LoanError(404, "Item not found");
    }

    const item = items[0];

    if (item.available_copies <= 0) {
      throw new LoanError(409, `"${item.title}" has no copies available right now`);
    }

    const [insert] = await conn.query(
      `INSERT INTO loans (userID, itemID, borrow_date, due_date, status)
        VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'active')`,
      [userID, itemID, policy.loanDays],
    );

    await conn.query(
      "UPDATE items SET available_copies = available_copies - 1 WHERE itemID = ?",
      [itemID],
    );

    const [loanRows] = await conn.query(
      `SELECT
          loanID,
          itemID,
          DATE_FORMAT(borrow_date, '%Y-%m-%d') AS borrow_date,
          DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
        FROM loans
        WHERE loanID = ?`,
      [insert.insertId],
    );

    await conn.commit();

    return {
      loan: { ...loanRows[0], title: item.title },
      item: {
        itemID: item.itemID,
        total_copies: item.total_copies,
        available_copies: item.available_copies - 1,
      },
      active_loans: activeRows[0].count + 1,
      max_loans: policy.maxLoans,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// A student or faculty member asks to return an item.
// Nothing is returned yet: the loan is only flagged and every librarian gets a
// notification. The item stays checked out until a librarian approves it.
async function requestReturn(userID, loanID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // lock the loan row so the request can't be sent twice at the same time
    const [loans] = await conn.query(
      "SELECT loanID, userID, itemID, returned_date, status FROM loans WHERE loanID = ? FOR UPDATE",
      [loanID],
    );

    // a user can only ask to return their own loans
    if (loans.length === 0 || Number(loans[0].userID) !== userID) {
      throw new LoanError(404, "Loan not found");
    }

    const loan = loans[0];

    if (loan.returned_date !== null) {
      throw new LoanError(409, "This item was already returned");
    }

    if (loan.status === "return_requested") {
      throw new LoanError(409, "A return request for this item is already waiting for the librarian");
    }

    const [info] = await conn.query(
      `SELECT items.title, users.first_name, users.last_name, users.role
        FROM items, users
        WHERE items.itemID = ? AND users.userID = ?`,
      [loan.itemID, userID],
    );

    const { title, first_name, last_name, role } = info[0];

    await conn.query("UPDATE loans SET status = 'return_requested' WHERE loanID = ?", [
      loanID,
    ]);

    await notifyLibrarians(conn, {
      type: "return_request",
      message: `${first_name} ${last_name} (${role}) asked to return "${title}".`,
      loanID,
      itemID: loan.itemID,
    });

    await conn.commit();

    return {
      loan: { loanID, itemID: loan.itemID, title, status: "return_requested" },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// A librarian approves a return request: the loan is closed, the copy goes back
// on the shelf and the borrower gets a notification.
async function approveReturn(librarianID, loanID) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [librarians] = await conn.query("SELECT role FROM users WHERE userID = ?", [
      librarianID,
    ]);

    if (librarians.length === 0 || librarians[0].role !== "librarian") {
      throw new LoanError(403, "Only librarians can approve returns");
    }

    // lock the loan row so it can't be approved twice at the same time
    const [loans] = await conn.query(
      "SELECT loanID, userID, itemID, returned_date, status FROM loans WHERE loanID = ? FOR UPDATE",
      [loanID],
    );

    if (loans.length === 0) {
      throw new LoanError(404, "Loan not found");
    }

    const loan = loans[0];

    if (loan.returned_date !== null) {
      throw new LoanError(409, "This item was already returned");
    }

    if (loan.status !== "return_requested") {
      throw new LoanError(409, "There is no return request for this loan");
    }

    const [items] = await conn.query(
      "SELECT itemID, title, total_copies, available_copies FROM items WHERE itemID = ? FOR UPDATE",
      [loan.itemID],
    );

    if (items.length === 0) {
      throw new LoanError(404, "Item not found");
    }

    const item = items[0];

    await conn.query(
      "UPDATE loans SET returned_date = CURDATE(), status = 'returned' WHERE loanID = ?",
      [loanID],
    );

    await conn.query(
      "UPDATE items SET available_copies = available_copies + 1 WHERE itemID = ?",
      [item.itemID],
    );

    // the request is handled, so it no longer shows as new for any librarian
    await conn.query(
      "UPDATE notifications SET is_read = 1 WHERE loanID = ? AND type = 'return_request'",
      [loanID],
    );

    await notifyUser(conn, {
      userID: Number(loan.userID),
      type: "return_approved",
      message: `Your return of "${item.title}" was approved. Thank you!`,
      loanID,
      itemID: item.itemID,
    });

    const [loanRows] = await conn.query(
      "SELECT DATE_FORMAT(returned_date, '%Y-%m-%d') AS returned_date FROM loans WHERE loanID = ?",
      [loanID],
    );

    await conn.commit();

    return {
      loan: {
        loanID,
        itemID: item.itemID,
        title: item.title,
        status: "returned",
        returned_date: loanRows[0].returned_date,
      },
      item: {
        itemID: item.itemID,
        total_copies: item.total_copies,
        available_copies: item.available_copies + 1,
      },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Everything the student/faculty "My loans" page needs for one user
async function fetchUserLoans(userID) {
  const [users] = await db.query("SELECT userID, role FROM users WHERE userID = ?", [
    userID,
  ]);

  if (users.length === 0) {
    return null;
  }

  const policy = getLoanPolicy(users[0].role);

  const [loans] = await db.query(
    `SELECT
        loans.loanID,
        loans.itemID,
        loans.status,
        items.title,
        items.item_type,
        COALESCE(book.author, media.author, device.brand) AS creator,
        DATE_FORMAT(loans.borrow_date, '%Y-%m-%d') AS borrow_date,
        DATE_FORMAT(loans.due_date, '%Y-%m-%d') AS due_date,
        DATEDIFF(loans.due_date, CURDATE()) AS days_left
      FROM loans
      JOIN items ON items.itemID = loans.itemID
      LEFT JOIN book ON book.itemID = items.itemID
      LEFT JOIN media ON media.itemID = items.itemID
      LEFT JOIN device ON device.itemID = items.itemID
      WHERE loans.userID = ? AND loans.returned_date IS NULL
      ORDER BY loans.due_date ASC, loans.loanID ASC`,
    [userID],
  );

  // holds that are still waiting (nothing in the app creates holds yet, so this is usually 0)
  const [holds] = await db.query(
    `SELECT COUNT(*) AS count FROM holds
      WHERE userID = ? AND status NOT IN ('fulfilled', 'cancelled', 'expired')`,
    [userID],
  );

  return {
    loans,
    active_loans: loans.length,
    max_loans: policy ? policy.maxLoans : null,
    loan_days: policy ? policy.loanDays : null,
    holds: holds[0].count,
  };
}

// Every loan (current and past) for the librarian's Loans page.
// The page filters it by tab, date range and search, and builds the PDF from what is on screen.
async function fetchAllLoans(librarianID) {
  const [users] = await db.query("SELECT role FROM users WHERE userID = ?", [
    librarianID,
  ]);

  if (users.length === 0 || users[0].role !== "librarian") {
    throw new LoanError(403, "Only librarians can view all loans");
  }

  const [loans] = await db.query(
    `SELECT
        loans.loanID,
        loans.userID,
        loans.itemID,
        loans.status,
        CONCAT(users.first_name, ' ', users.last_name) AS borrower,
        users.email,
        users.role,
        items.title,
        items.item_type,
        COALESCE(book.author, media.author, device.brand) AS creator,
        book.isbn,
        DATE_FORMAT(loans.borrow_date, '%Y-%m-%d') AS borrow_date,
        DATE_FORMAT(loans.due_date, '%Y-%m-%d') AS due_date,
        DATE_FORMAT(loans.returned_date, '%Y-%m-%d') AS returned_date,
        DATEDIFF(loans.due_date, CURDATE()) AS days_left
      FROM loans
      JOIN users ON users.userID = loans.userID
      JOIN items ON items.itemID = loans.itemID
      LEFT JOIN book ON book.itemID = items.itemID
      LEFT JOIN media ON media.itemID = items.itemID
      LEFT JOIN device ON device.itemID = items.itemID
      ORDER BY loans.borrow_date DESC, loans.loanID DESC`,
  );

  return { loans };
}

module.exports = {
  LOAN_POLICY,
  getLoanPolicy,
  LoanError,
  borrowItem,
  requestReturn,
  approveReturn,
  fetchUserLoans,
  fetchAllLoans,
};
