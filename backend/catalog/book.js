const db = require("../db");

async function fetchBooks() {
  const result = await db.query(`SELECT 
            items.itemID,
            items.title,
            items.item_type,
            items.image_url,
            items.total_copies,
            items.available_copies,
            book.author,
            book.isbn,
            book.publication_year

            FROM items, book
            WHERE items.itemID = book.itemID
            AND items.is_active = 1
        `);

  const rows = result[0];

  return rows;
}

async function addBook(
  title,
  author,
  isbn,
  publication_year,
  totalCopies,
  image_url,
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    //items table
    const result = await connection.query(
      `INSERT into items (title, item_type, total_copies, available_copies, image_url)
        VALUES (?, 'Book', ?, ?, ?)`,
      [title, totalCopies, totalCopies, image_url || null],
    );

    const itemID = result[0].insertId;

    //book table
    await connection.query(
      `INSERT into book(author, itemID, isbn, publication_year) 
    VALUES (?, ?, ?, ?)`,
      [author, itemID, isbn, publication_year],
    );

    await connection.commit();
    return itemID;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteBook(itemID) {
  // block deleting an item that is still checked out
  const [activeLoans] = await db.query(
    `SELECT COUNT(*) AS count FROM loans WHERE itemID = ? AND returned_date IS NULL`,
    [itemID],
  );

  if (activeLoans[0].count > 0) {
    const error = new Error(
      `Cannot delete this book because it is currently on loan.`,
    );
    error.status = 409;
    throw error;
  }

  const result = await db.query(
    `UPDATE items
     SET is_active = 0 
     WHERE itemID = ?
      AND item_type = 'Book'
      AND is_active = 1
    
    `,
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
  image_url,
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check whether the book exists
    const [rows] = await connection.query(
      `
        SELECT total_copies, available_copies
        FROM items
        WHERE itemID = ?
          AND item_type = 'Book'
          AND is_active = 1
      `,
      [itemID],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    // Check for duplicate ISBN, excluding the current book
    const [existingBook] = await connection.query(
      `
        SELECT itemID
        FROM book
        WHERE isbn = ?
          AND itemID != ?
      `,
      [isbn, itemID],
    );

    if (existingBook.length > 0) {
      throw new Error("A book with this ISBN already exists.");
    }

    // Calculate currently borrowed copies
    const borrowedCopies = rows[0].total_copies - rows[0].available_copies;

    // Prevent total copies from going below borrowed copies
    if (totalCopies < borrowedCopies) {
      throw new Error(
        `Cannot reduce total copies below ${borrowedCopies} because those copies are currently borrowed.`,
      );
    }

    const newAvailCopies = totalCopies - borrowedCopies;

    // Update items table
    await connection.query(
      `
        UPDATE items
        SET title = ?,
            total_copies = ?,
            available_copies = ?,
            image_url = ?
        WHERE itemID = ?
          AND item_type = 'Book'
          AND is_active = 1
      `,
      [title, totalCopies, newAvailCopies, image_url || null, itemID],
    );

    // Update book table
    await connection.query(
      `
        UPDATE book
        SET author = ?,
            isbn = ?,
            publication_year = ?
        WHERE itemID = ?
      `,
      [author, isbn, publication_year, itemID],
    );

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { fetchBooks, addBook, deleteBook, updateBook };
