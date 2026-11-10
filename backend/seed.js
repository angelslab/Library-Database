// backend/seed.js
// Fills the library database with sample data so every screen and report has
// something to show. Run from the backend folder:
//
//     node seed.js
//
// WARNING: this EMPTIES every table first. Only run it on a development
// database. Every sample user has the password: password123

const db = require("./db");
const initDB = require("./schema");
const bcrypt = require("bcryptjs");

const PASSWORD = "password123";

// ---------------------------------------------------------------- people
// [userID, first, last, email, role]
const USERS = [
  [1, "Maria", "Lopez", "maria.lopez@lib.edu", "librarian"],
  [2, "Alan", "Reed", "alan.reed@lib.edu", "faculty"],
  [3, "Priya", "Shah", "priya.shah@lib.edu", "faculty"],
  [4, "Jordan", "Ellis", "jordan.ellis@lib.edu", "student"],
  [5, "Sam", "Patel", "sam.patel@lib.edu", "student"],
  [6, "Chloe", "Nguyen", "chloe.nguyen@lib.edu", "student"],
  [7, "Marcus", "Brown", "marcus.brown@lib.edu", "student"],
  [8, "Aisha", "Khan", "aisha.khan@lib.edu", "student"],
  [9, "Daniel", "Okafor", "daniel.okafor@lib.edu", "librarian"],
  [10, "Elena", "Garcia", "elena.garcia@lib.edu", "faculty"],
  [11, "Robert", "Chen", "robert.chen@lib.edu", "faculty"],
  [12, "Tyler", "Brooks", "tyler.brooks@lib.edu", "student"],
  [13, "Sofia", "Ramirez", "sofia.ramirez@lib.edu", "student"],
  [14, "Ethan", "Walker", "ethan.walker@lib.edu", "student"],
  [15, "Maya", "Johnson", "maya.johnson@lib.edu", "student"],
  [16, "Noah", "Kim", "noah.kim@lib.edu", "student"],
];

const LIBRARIANS = [1, 9]; // userIDs

// [userID, facultyID, department]
const FACULTY = [
  [2, 1000001, "Computer Science"],
  [3, 1000002, "Biology"],
  [10, 1000003, "History"],
  [11, 1000004, "Mathematics"],
];

// [userID, studentID, major]
const STUDENTS = [
  [4, 2000001, "Computer Science"],
  [5, 2000002, "Biology"],
  [6, 2000003, "Mathematics"],
  [7, 2000004, "History"],
  [8, 2000005, "Computer Science"],
  [12, 2000006, "Engineering"],
  [13, 2000007, "Nursing"],
  [14, 2000008, "Business"],
  [15, 2000009, "Biology"],
  [16, 2000010, "Computer Science"],
];

// ----------------------------------------------------------------- items
// [itemID, title, totalCopies, author, isbn, publicationYear]
const BOOKS = [
  [1, "Introduction to Algorithms", 3, "Cormen et al.", "9780262046305", 2022],
  [2, "Database System Concepts", 2, "Silberschatz", "9780078022159", 2019],
  [3, "Discrete Mathematics", 2, "Kenneth Rosen", "9781259676512", 2018],
  [4, "Campbell Biology", 2, "Urry et al.", "9780135188743", 2020],
  [5, "A People's History", 1, "Howard Zinn", "9780062397348", 2015],
  [6, "Clean Code", 2, "Robert Martin", "9780132350884", 2008],
  [7, "The Pragmatic Programmer", 1, "Hunt and Thomas", "9780135957059", 2019],
  [8, "Calculus: Early Transcendentals", 2, "James Stewart", "9781337613927", 2020],
];

// [itemID, title, totalCopies, author]
const MEDIA = [
  [9, "Cosmos (Documentary)", 2, "Carl Sagan"],
  [10, "Planet Earth (Documentary)", 1, "BBC"],
  [11, "Calculus Lecture Series", 1, "Sal Khan"],
  [12, "Biology Crash Course (DVD)", 1, "PBS Digital Studios"],
];

// [itemID, title, totalCopies, deviceType, brand]   (brand is max 20 characters)
const DEVICES = [
  [13, "Laptop", 3, "Laptop", "Dell"],
  [14, "Digital Camera", 2, "Camera", "Canon"],
  [15, "Graphing Calculator", 4, "Calculator", "Texas Instruments"],
  [16, "Tablet", 2, "Tablet", "Apple"],
  [17, "Portable Projector", 1, "Projector", "Epson"],
  [18, "Print Station", 1, "Printer", "HP"], // printer charges point at this item
];

// ----------------------------------------------------------------- loans
// All dates are "days ago" (a negative number is in the future), so overdue
// loans stay overdue no matter when you run the seed.
// Students borrow for 7 days (max 3 at once), faculty for 14 days (max 5).
// Status values are the ones the app itself writes: active, return_requested, returned.
// [loanID, userID, itemID, borrowedDaysAgo, dueDaysAgo, returnedDaysAgo | null, status]
const LOANS = [
  // still out
  [1, 4, 1, 30, 23, null, "active"], // overdue
  [2, 4, 9, 20, 13, null, "active"], // overdue
  [3, 5, 2, 3, -4, null, "active"],
  [4, 7, 1, 18, 11, null, "active"], // overdue
  [5, 2, 4, 5, -9, null, "active"],
  [6, 3, 6, 9, -5, null, "active"],
  [7, 8, 13, 2, -5, null, "active"],
  [8, 12, 15, 12, 5, null, "active"], // overdue
  [9, 13, 14, 4, -3, null, "return_requested"], // waiting for a librarian
  [10, 14, 15, 10, 3, null, "active"], // overdue
  [11, 15, 13, 6, -1, null, "active"],
  [12, 16, 10, 8, 1, null, "active"], // overdue
  [13, 10, 5, 25, 11, null, "active"], // overdue (faculty)
  [14, 11, 8, 7, -7, null, "active"],
  [15, 6, 3, 2, -5, null, "active"],
  [16, 16, 17, 3, -4, null, "active"],
  [17, 8, 16, 1, -6, null, "active"],
  [18, 2, 7, 11, -3, null, "active"],
  // returned
  [19, 6, 3, 60, 53, 55, "returned"],
  [20, 5, 5, 75, 68, 60, "returned"], // 8 days late
  [21, 4, 1, 50, 43, 44, "returned"],
  [22, 7, 2, 45, 38, 33, "returned"], // 5 days late
  [23, 8, 6, 40, 33, 31, "returned"], // 2 days late
  [24, 12, 13, 35, 28, 29, "returned"],
  [25, 3, 8, 55, 41, 40, "returned"], // 1 day late (faculty)
  [26, 14, 15, 30, 23, 22, "returned"], // 1 day late
  [27, 15, 4, 28, 21, 24, "returned"],
  [28, 13, 16, 65, 58, 50, "returned"], // 8 days late
  [29, 16, 13, 22, 15, 14, "returned"], // 1 day late
  [30, 10, 1, 38, 24, 22, "returned"], // 2 days late (faculty)
  [31, 5, 9, 14, 7, 9, "returned"],
  [32, 11, 15, 20, 6, 5, "returned"], // 1 day late (faculty)
];

// ----------------------------------------------------------------- fines
// Late fines are $0.50 per day. Printer and surcharge charges have no loan.
// [fineID, loanID | null, userID, itemID, chargeType, paid, issuedDaysAgo, amount]
const FINES = [
  // late returns
  [1, 20, 5, 5, "Late", 1, 60, 4.0],
  [2, 22, 7, 2, "Late", 0, 33, 2.5],
  [3, 23, 8, 6, "Late", 1, 31, 1.0],
  [4, 25, 3, 8, "Late", 1, 40, 0.5],
  [5, 26, 14, 15, "Late", 0, 22, 0.5],
  [6, 28, 13, 16, "Late", 1, 50, 4.0],
  [7, 29, 16, 13, "Late", 0, 14, 0.5],
  [8, 30, 10, 1, "Late", 1, 22, 1.0],
  [9, 32, 11, 15, "Late", 0, 5, 0.5],
  // loans that are overdue right now
  [10, 1, 4, 1, "Late", 0, 1, 11.5],
  [11, 2, 4, 9, "Late", 0, 1, 6.5],
  [12, 4, 7, 1, "Late", 0, 1, 5.5],
  [13, 8, 12, 15, "Late", 0, 1, 2.5],
  [14, 10, 14, 15, "Late", 0, 1, 1.5],
  [15, 12, 16, 10, "Late", 0, 1, 0.5],
  [16, 13, 10, 5, "Late", 0, 1, 5.5],
  // printer charges
  [17, null, 4, 18, "Printer", 1, 20, 3.2],
  [18, null, 8, 18, "Printer", 0, 6, 1.8],
  [19, null, 12, 18, "Printer", 1, 12, 5.0],
  [20, null, 16, 18, "Printer", 1, 3, 0.8],
  // surcharges
  [21, null, 7, 2, "Surcharge", 0, 30, 15.0],
  [22, null, 5, 7, "Surcharge", 1, 40, 10.0],
  [23, null, 13, 16, "Surcharge", 0, 9, 8.0],
];

// ----------------------------------------------------------------- holds
// One hold per book, and only on books that have a copy on the shelf.
// [holdID, userID, itemID, requestedDaysAgo, status]
const HOLDS = [
  [1, 12, 8, 2, "pending"],
  [2, 8, 3, 1, "pending"],
  [3, 6, 6, 3, "pending"],
  [4, 15, 2, 15, "fulfilled"],
  [5, 7, 1, 20, "cancelled"],
];

const DATA = { USERS, LIBRARIANS, FACULTY, STUDENTS, BOOKS, MEDIA, DEVICES, LOANS, FINES, HOLDS };

const ago = "DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)";

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed: NODE_ENV is production.");
    process.exit(1);
  }

  await initDB(); // makes sure every table exists

  // one dedicated connection, so the foreign key setting applies to every statement
  const conn = await db.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of [
      "notifications", "fines", "holds", "loans", "book", "device", "media",
      "items", "student", "faculty", "librarian", "user_credentials", "users",
    ]) {
      await conn.query(`TRUNCATE TABLE ${table}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    // users, with one shared password
    const hash = await bcrypt.hash(PASSWORD, 10);
    for (const [id, first, last, email, role] of USERS) {
      await conn.query(
        "INSERT INTO users (userID, first_name, last_name, email, role) VALUES (?, ?, ?, ?, ?)",
        [id, first, last, email, role],
      );
      await conn.query(
        "INSERT INTO user_credentials (userID, password_hash) VALUES (?, ?)",
        [id, hash],
      );
    }
    for (const id of LIBRARIANS) {
      await conn.query("INSERT INTO librarian (userID) VALUES (?)", [id]);
    }
    for (const [id, facultyID, department] of FACULTY) {
      await conn.query(
        "INSERT INTO faculty (userID, facultyID, department) VALUES (?, ?, ?)",
        [id, facultyID, department],
      );
    }
    for (const [id, studentID, major] of STUDENTS) {
      await conn.query(
        "INSERT INTO student (userID, studentID, major) VALUES (?, ?, ?)",
        [id, studentID, major],
      );
    }

    // items (available_copies is recalculated from the loans below)
    const addItem = (id, title, type, total) =>
      conn.query(
        "INSERT INTO items (itemID, title, item_type, total_copies, available_copies) VALUES (?, ?, ?, ?, ?)",
        [id, title, type, total, total],
      );
    for (const [id, title, total, author, isbn, year] of BOOKS) {
      await addItem(id, title, "Book", total);
      await conn.query(
        "INSERT INTO book (itemID, author, isbn, publication_year) VALUES (?, ?, ?, ?)",
        [id, author, isbn, year],
      );
    }
    for (const [id, title, total, author] of MEDIA) {
      await addItem(id, title, "Media", total);
      await conn.query("INSERT INTO media (itemID, author) VALUES (?, ?)", [id, author]);
    }
    for (const [id, title, total, deviceType, brand] of DEVICES) {
      await addItem(id, title, "Device", total);
      await conn.query(
        "INSERT INTO device (itemID, device_type, brand) VALUES (?, ?, ?)",
        [id, deviceType, brand],
      );
    }

    // loans
    for (const [id, userID, itemID, borrowed, due, returned, status] of LOANS) {
      await conn.query(
        `INSERT INTO loans (loanID, userID, itemID, borrow_date, due_date, returned_date, status)
         VALUES (?, ?, ?, ${ago}, ${ago}, IF(? IS NULL, NULL, ${ago}), ?)`,
        [id, userID, itemID, borrowed, due, returned, returned, status],
      );
    }

    // copies on the shelf = total copies minus loans that are not returned yet
    await conn.query(
      `UPDATE items i
          SET available_copies = i.total_copies - (SELECT COUNT(*)
                                                     FROM loans l
                                                    WHERE l.itemID = i.itemID
                                                      AND l.returned_date IS NULL)`,
    );

    // fines
    for (const [id, loanID, userID, itemID, type, paid, issued, amount] of FINES) {
      await conn.query(
        `INSERT INTO fines (fineID, loanID, userID, itemID, charge_type, paid, issue_date, amount)
         VALUES (?, ?, ?, ?, ?, ?, ${ago}, ?)`,
        [id, loanID, userID, itemID, type, paid, issued, amount],
      );
    }

    // holds
    for (const [id, userID, itemID, requested, status] of HOLDS) {
      await conn.query(
        `INSERT INTO holds (holdID, userID, itemID, requestDate, status)
         VALUES (?, ?, ?, ${ago}, ?)`,
        [id, userID, itemID, requested, status],
      );
    }

    // notifications, worded the way the app writes them
    const addNotification = (userID, type, message, loanID, itemID, isRead, hoursAgo) =>
      conn.query(
        `INSERT INTO notifications (userID, type, message, loanID, itemID, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
        [userID, type, message, loanID, itemID, isRead, hoursAgo],
      );
    for (const librarianID of LIBRARIANS) {
      await addNotification(
        librarianID,
        "return_request",
        'Sofia Ramirez (student) asked to return "Digital Camera".',
        9,
        14,
        0,
        2,
      );
    }
    await addNotification(
      14,
      "return_approved",
      'Your return of "Graphing Calculator" was approved. Thank you!',
      26,
      15,
      1,
      22 * 24,
    );
    await addNotification(
      15,
      "return_approved",
      'Your return of "Campbell Biology" was approved. Thank you!',
      27,
      4,
      0,
      24 * 24,
    );

    console.log(
      `Seed complete: ${USERS.length} users (password: ${PASSWORD}), ` +
        `${BOOKS.length + MEDIA.length + DEVICES.length} items, ${LOANS.length} loans, ` +
        `${FINES.length} fines, ${HOLDS.length} holds`,
    );
  } finally {
    conn.release();
    await db.end();
  }
}

module.exports = { DATA, seed };

if (require.main === module) {
  seed().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
}