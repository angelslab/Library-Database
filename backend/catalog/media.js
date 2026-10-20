const db = require("../db");

async function fetchMedia() {
  const result = await db.query(`
    SELECT 
        items.itemID,
        items.title,
        items.item_type,
        items.total_copies,
        items.available_copies,
        media.author,
      FROM items, media
      WHERE items.itemiD = media.itemID
        
        `);
  const rows = result[0];

  return rows;
}

async function addMedia(title, totalCopies, author) {
  //items table
  const result = await db.query(
    `
            INSERT into items (title, item_type, total_copies)
            VALUES (?, 'Media', ?)
        
        `,
    [title, totalCopies],
  );

  const itemID = result[0].insertId;

  //media table

  await db.query(
    `
        INSERT into media(author, itemID)
        VALUES(?, ?)
    
    `,
    [author, itemID],
  );

  return itemID;
}

async function deleteMedia(itemID) {
  const result = await db.query(
    `
    DELETE from items
    WHERE itemID = ?`,
    [itemID],
  );

  return result[0].affectedRows;
}

async function editMedia(itemID, title, totalCopies, author) {
  //items table
  const itemResult = await db.query(
    `UPDATE items
     SET title= ?, total_copies=?
     WHERE itemID = ?
    `,
    [title, totalCopies, itemID],
  );

  if (itemResult[0].affectedRows === 0) {
    return false;
  }

  //media
  await db.query(
    `
        UPDATE media
        SET author = ?
        WHERE itemID = ?
    
    `,
    [author, itemID],
  );

  return true;
}

module.exports = { fetchMedia, addMedia, deleteMedia, editMedia };
