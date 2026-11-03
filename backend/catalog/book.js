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
  //items table
  const result = await db.query(
    `INSERT into items (title, item_type, total_copies, available_copies, image_url)
        VALUES (?, 'Book', ?, ?, ?)`,
    [title, totalCopies, totalCopies, image_url || null],
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
  try {
    const [rows] = await db.query(
      `SELECT total_copies, available_copies
       FROM items
       WHERE itemID = ? 
        AND item_type = 'Book'
        AND is_active = 1
      `,
      [itemID],
    );

    if (rows.length === 0) {
      return false;
    }

    //calculate currently borrowed copies
    const borrowedCopies = rows[0].total_copies - rows[0].available_copies;

    //prevent totalcopies going below borrowedcopies
    if (totalCopies < borrowedCopies) {
      throw new Error(
        `Cannot reduce total copies below ${borrowedCopies} because those copies are currently borrowed.`,
      );
    }

    const newAvailCopies = totalCopies - borrowedCopies;

    // updating items table
    await db.query(
      `
      UPDATE items 
      SET title = ?, total_copies = ?, available_copies = ?, image_url = ? 
      WHERE itemID = ?
        AND item_type = 'Book'
        AND is_active = 1
    
    `,
      [title, totalCopies, newAvailCopies, image_url || null, itemID],
    );

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
  } catch (error) {
    throw error;
  }
}

module.exports = { fetchBooks, addBook, deleteBook, updateBook };
