const db = require("../db");

async function fetchBooks() {
  const result = await db.query(`SELECT 
            items.itemID,
            items.title,
            items.item_type,
            items.total_copies,
            items.available_copies,
            book.author,
            book.isbn,
            book.publication_year

            FROM items, book
            WHERE items.itemID = book.itemID
        `);

  const rows = result[0];

  return rows;
}

async function addBook(title, author, isbn, publication_year, totalCopies) {
  //items table
  const result = await db.query(
    `INSERT into items (title, item_type, total_copies, available_copies)
        VALUES (?, 'Book', ?, ?)`,
    [title, totalCopies, totalCopies],
  );

  const itemID = result[0].insertId;

  //book table
  await db.query(
    `INSERT into book(author, itemID, isbn, publication_year) 
    VALUES (?, ?, ?, ?)`,
    [author, itemID, isbn, publication_year],
  );

  return itemID;
}

async function deleteBook(itemID) {
  const result = await db.query(
    `DELETE FROM items 
    WHERE itemID = ?`,
    [itemID],
  );

  return result[0].affectedRows;
}

async function updateBook(
  itemID,
  title,
  author,
  isbn,
  publication_year,
  totalCopies,
) {
  // updating items table
  const result = await db.query(
    `
      UPDATE items 
      SET title = ?, total_copies = ?, available_copies = ?
      WHERE itemID = ?
    
    `,
    [title, totalCopies, totalCopies, itemID],
  );

  if (result[0].affectedRows === 0) {
    return false;
  }

  //updating books table
  await db.query(
    `
      UPDATE book
        SET author = ?, isbn = ?, publication_year = ?
        WHERE itemID = ?
      
    `,
    [author, isbn, publication_year, itemID],
  );

  return true;
}

module.exports = { fetchBooks, addBook, deleteBook, updateBook };