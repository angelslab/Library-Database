const db = require("../db");

async function fetchAllItems() {
  const result = await db.query(`
    SELECT 
      itemID,
      title,
      item_type,
      total_copies,
      available_copies,

      (SELECT author FROM book WHERE book.itemID = items.itemID) AS book_author,

      (SELECT isbn FROM book WHERE book.itemID = items.itemID) AS isbn,

      (SELECT publication_year FROM book WHERE book.itemID = items.itemID) AS publication_year,

      (SELECT author FROM media WHERE media.itemID = items.itemID) AS media_author,

      (SELECT device_type FROM device WHERE device.itemID = items.itemID) AS device_type,

      (SELECT brand FROM device WHERE device.itemID = items.itemID) AS brand

      FROM items
    `);

  const rows = result[0];

  return rows;
}

async function getItemByID(itemID) {
  const result = await db.query(
    `SELECT
      itemID,
      title,
      item_type,
      total_copies,
      available_copies,

      -- Book details
      (SELECT author
       FROM book
       WHERE book.itemID = items.itemID) AS book_author,

      (SELECT isbn
       FROM book
       WHERE book.itemID = items.itemID) AS isbn,

      (SELECT publication_year
       FROM book
       WHERE book.itemID = items.itemID) AS publication_year,

      -- Media details
      (SELECT author
       FROM media
       WHERE media.itemID = items.itemID) AS media_author,

      -- Device details
      (SELECT device_type
       FROM device
       WHERE device.itemID = items.itemID) AS device_type,

      (SELECT brand
       FROM device
       WHERE device.itemID = items.itemID) AS brand

    FROM items
    WHERE itemID = ?`,
    [itemID]
  );

  const rows = result[0];

  return rows[0] || null;
}

module.exports = { fetchAllItems, getItemByID };