const db = require("./db");
const { createTriggers } = require("./triggers");

// removes CHECK rules on a table. schema.js does not create any, but some databases
// got extra ones added by hand (e.g. holds_chk_1, fines_chk_1) that block holds and fines
async function dropCheckRules(table) {
  const [rules] = await db.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'CHECK'`,
    [table],
  );

  for (const rule of rules) {
    await db.query(
      `ALTER TABLE ${table} DROP CONSTRAINT \`${rule.CONSTRAINT_NAME}\``,
    );
  }
}

// adds AUTO_INCREMENT to an id column made without it (tables created before the fix)
async function addAutoIncrement(table, column) {
  const [rows] = await db.query(
    `SELECT EXTRA FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );

  if (rows.length > 0 && !/auto_increment/i.test(rows[0].EXTRA)) {
    await db.query(
      `ALTER TABLE ${table} MODIFY ${column} INT NOT NULL AUTO_INCREMENT`,
    );
  }
}

async function initDB() {
  //users
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      userID INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL
    )
  `);

  console.log("Users table created");

  //user_credentials (one password per user)
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      userID INT PRIMARY KEY NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      FOREIGN KEY (userID) REFERENCES users(userID)
    ON DELETE CASCADE
    )
  `);

  console.log("User_credentials table created");

  //items
  await db.query(`
    CREATE TABLE IF NOT EXISTS items (
      itemID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      title VARCHAR(100) NOT NULL,
      item_type VARCHAR(100),
      total_copies INT NOT NULL DEFAULT 1,
      available_copies INT NOT NULL DEFAULT 1
    )
  `);

  console.log("Items table created");

  //student
  await db.query(`
    CREATE TABLE IF NOT EXISTS student (
      userID INT NOT NULL UNIQUE,
      studentID INT PRIMARY KEY NOT NULL,
      major VARCHAR(50),
      max_limit INT DEFAULT 3,
      FOREIGN KEY (userID) REFERENCES users(userID)
    ON DELETE CASCADE
    )
  `);

  console.log("Student table created");

  //faculty
  await db.query(`
    CREATE TABLE IF NOT EXISTS faculty (
      userID INT NOT NULL UNIQUE,
      facultyID INT PRIMARY KEY NOT NULL,
      department VARCHAR(50) NOT NULL,
      max_limit INT NOT NULL DEFAULT 7,
      FOREIGN KEY (userID) REFERENCES users(userID)
    ON DELETE CASCADE

    )
  `);

  console.log("Faculty table created");

  //librarian
  await db.query(`
    CREATE TABLE IF NOT EXISTS librarian (
      userID INT PRIMARY KEY NOT NULL,
      FOREIGN KEY (userID) REFERENCES users(userID)
    ON DELETE CASCADE
    )
  `);

  console.log("Librarian table created");

  //book
  await db.query(`
    CREATE TABLE IF NOT EXISTS book (
      author VARCHAR(100) NOT NULL,
      itemID INT PRIMARY KEY NOT NULL,
      isbn CHAR(13) NOT NULL UNIQUE,
      publication_year INT,
      FOREIGN KEY (itemID) REFERENCES items(itemID)
          ON DELETE CASCADE
    )
  `);

  console.log("Book table created");

  //device
  await db.query(`
    CREATE TABLE IF NOT EXISTS device (
      itemID INT PRIMARY KEY NOT NULL,
      device_type VARCHAR(50) NOT NULL,
      brand VARCHAR(20) NOT NULL,
      FOREIGN KEY (itemID) REFERENCES items(itemID)
         ON DELETE CASCADE
    )
  `);

  console.log("Device table created");

  //media
  await db.query(`
    CREATE TABLE IF NOT EXISTS media (
      author VARCHAR(100),
      itemID INT PRIMARY KEY,
      FOREIGN KEY (itemID) REFERENCES items(itemID)
         ON DELETE CASCADE
    )
  `);

  console.log("Media table created");

  //loans
  await db.query(`
    CREATE TABLE IF NOT EXISTS loans (
      loanID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      userID INT NOT NULL,
      itemID INT NOT NULL,
      borrow_date DATE NOT NULL,
      due_date DATE NOT NULL,
      returned_date DATE,
      status VARCHAR(20) NOT NULL,

      FOREIGN KEY (userID) REFERENCES users(userID)
      ON DELETE CASCADE,

      FOREIGN KEY (itemID) REFERENCES items(itemID)
      ON DELETE CASCADE

    )
  `);

  const [loanIdColumn] = await db.query(
    `SELECT EXTRA FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'loans'
      AND COLUMN_NAME = 'loanID'`,
  );

  if (loanIdColumn.length > 0 && !/auto_increment/i.test(loanIdColumn[0].EXTRA)) {
    await db.query("ALTER TABLE loans MODIFY loanID INT NOT NULL AUTO_INCREMENT");
  }

  console.log("Loans table created");

  //holds
  await db.query(`
    CREATE TABLE IF NOT EXISTS holds (
      userID INT NOT NULL,
      itemID INT NOT NULL,
      holdID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      requestDate DATE DEFAULT (CURRENT_DATE),
      status VARCHAR(20) NOT NULL DEFAULT 'waiting',

      FOREIGN KEY (userID) REFERENCES users(userID)
      ON DELETE CASCADE,

      FOREIGN KEY (itemID) REFERENCES items(itemID)
      ON DELETE CASCADE
    )
  `);

  // older databases made holdID without AUTO_INCREMENT, fix it once
  await addAutoIncrement("holds", "holdID");
  await dropCheckRules("holds");

  console.log("Holds table created");

  //fines
  await db.query(`
    CREATE TABLE IF NOT EXISTS fines (
      loanID INT,
      userID INT NOT NULL,
      itemID INT NOT NULL,
      fineID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      charge_type VARCHAR(20) NOT NULL,
      paid TINYINT(1) NOT NULL DEFAULT 0,
      issue_date DATE DEFAULT (CURRENT_DATE),
      amount DECIMAL(10,2) NOT NULL,

      FOREIGN KEY (loanID) REFERENCES loans(loanID),
      FOREIGN KEY (userID) REFERENCES users(userID),
      FOREIGN KEY (itemID) REFERENCES items(itemID)

    )
  `);

  // older databases made fineID without AUTO_INCREMENT, fix it once
  await addAutoIncrement("fines", "fineID");
  await dropCheckRules("fines");

  console.log("Fines table created");

  //notifications (return requests for librarians, approvals for students/faculty)
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notificationID INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
      userID INT NOT NULL,
      type VARCHAR(30) NOT NULL,
      message VARCHAR(500) NOT NULL,
      loanID INT,
      itemID INT,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (userID) REFERENCES users(userID)
      ON DELETE CASCADE,

      FOREIGN KEY (loanID) REFERENCES loans(loanID)
      ON DELETE CASCADE
    )
  `);

  console.log("Notifications table created");

  // every librarian account needs a row in the librarian table,
  // otherwise they never get return-request notifications
  await db.query(
    `INSERT INTO librarian (userID)
      SELECT userID FROM users
      WHERE role = 'librarian'
      AND userID NOT IN (SELECT userID FROM librarian)`,
  );

  // late fee and hold-ready triggers (see triggers.js)
  await createTriggers();

}

module.exports = initDB;
