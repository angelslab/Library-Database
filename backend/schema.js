const db = require("./db");

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

  //user_credientials
  await db.query(`
      CREATE TABLE IF NOT EXISTS users_credentials(
        userID INT NOT NULL PRIMARY KEY,
        password_hash VARCHAR(50),

        FOREIGN KEY (userID) REFERENCES users(userID)
        ON DELETE = CASCADE      
      )   
    `);

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
      loanID INT PRIMARY KEY NOT NULL,
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

  console.log("Loans table created");

  //holds
  await db.query(`
    CREATE TABLE IF NOT EXISTS holds (
      userID INT NOT NULL,
      itemID INT NOT NULL,
      holdID INT PRIMARY KEY NOT NULL,
      requestDate DATE DEFAULT (CURRENT_DATE),
      status VARCHAR(20) NOT NULL,

      FOREIGN KEY (userID) REFERENCES users(userID)
      ON DELETE CASCADE,

      FOREIGN KEY (itemID) REFERENCES items(itemID)
      ON DELETE CASCADE
    )
  `);

  console.log("Holds table created");

  //fines
  await db.query(`
    CREATE TABLE IF NOT EXISTS fines (
      loanID INT,
      userID INT NOT NULL,
      itemID INT NOT NULL,
      fineID INT PRIMARY KEY NOT NULL,
      charge_type VARCHAR(20) NOT NULL,
      paid TINYINT(1) NOT NULL DEFAULT 0,
      issue_date DATE DEFAULT (CURRENT_DATE),
      amount DECIMAL(10,2) NOT NULL,

      FOREIGN KEY (loanID) REFERENCES loans(loanID),
      FOREIGN KEY (userID) REFERENCES users(userID),
      FOREIGN KEY (itemID) REFERENCES items(itemID)

    )
  `);

  console.log("Fines table created");
}

module.exports = initDB;
