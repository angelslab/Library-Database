const db = require("../db");

async function fetchMedia() {
  const result = await db.query(`
    SELECT 
        items.itemID,
        items.title,
        items.item_type,
        items.total_copies,
        items.available_copies,
        items.image_url,
        media.author,
      FROM items, media
      WHERE items.itemiD = media.itemID
        AND items.is_active = 1
        
        `);
  const rows = result[0];

  return rows;
}

async function addMedia(title, totalCopies, author, image_url) {
  //items table
  const result = await db.query(
    `
            INSERT into items (title, item_type, total_copies, image_url)
            VALUES (?, 'Media', ?, ?)
        
        `,
    [title, totalCopies, image_url || null],
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
    UPDATE items
      SET is_active = 0
      WHERE itemID = ?
        AND item_type = 'Media'
        AND is_active = 1
    `,
    [itemID],
  );

  return result[0].affectedRows;
}

async function editMedia(itemID, title, totalCopies, author, image_url) {
  //items table
  const itemResult = await db.query(
    `UPDATE items
     SET title= ?, total_copies=?, image_url = ?
     WHERE itemID = ?
      AND item_type = 'Media'
      AND is_active = 1
    `,
    [title, totalCopies, image_url || null, itemID],
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
