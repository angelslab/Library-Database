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
        media.author
      FROM items, media
      WHERE items.itemID = media.itemID
        AND items.is_active = 1
        
        `);
  const rows = result[0];

  return rows;
}

async function addMedia(title, totalCopies, author, image_url) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check whether this media already exists
    const [existingMedia] = await connection.query(
      `SELECT items.itemID
       FROM items
       JOIN media ON items.itemID = media.itemID
       WHERE LOWER(TRIM(items.title)) = LOWER(TRIM(?))
         AND LOWER(TRIM(media.author)) = LOWER(TRIM(?))
         AND items.is_active = 1`,
      [title, author],
    );

    // Prevent duplicate media
    if (existingMedia.length > 0) {
      throw new Error(
        "This media item already exists with the same title and author.",
      );
    }

    //items table
    const result = await connection.query(
      `
            INSERT into items (title, item_type, total_copies, available_copies, image_url)
            VALUES (?, 'Media', ?, ?, ?)
        
        `,
      [title, totalCopies, totalCopies, image_url || null],
    );

    const itemID = result[0].insertId;

    //media table

    await connection.query(
      `
        INSERT into media(author, itemID)
        VALUES(?, ?)
    
    `,
      [author, itemID],
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

async function deleteMedia(itemID) {
  // block deleting an item that is still checked out
  const [activeLoans] = await db.query(
    `SELECT COUNT(*) AS count FROM loans WHERE itemID = ? AND returned_date IS NULL`,
    [itemID],
  );

  if (activeLoans[0].count > 0) {
    const error = new Error(
      `Cannot delete: ${activeLoans[0].count} copy(ies) still on loan. Return them first.`,
    );
    error.status = 409;
    throw error;
  }

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
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check whether the media exists
    const [rows] = await connection.query(
      `
        SELECT total_copies, available_copies
        FROM items
        WHERE itemID = ?
          AND item_type = 'Media'
          AND is_active = 1
      `,
      [itemID],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    // Check for duplicate media, excluding the current item
    const [existingMedia] = await connection.query(
      `
        SELECT items.itemID
        FROM items, media
        WHERE items.itemID = media.itemID
          AND LOWER(TRIM(items.title)) = LOWER(TRIM(?))
          AND LOWER(TRIM(media.author)) = LOWER(TRIM(?))
          AND items.itemID != ?
          AND items.is_active = 1
      `,
      [title, author, itemID],
    );

    if (existingMedia.length > 0) {
      throw new Error(
        "This media item already exists with the same title and author.",
      );
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
          AND item_type = 'Media'
          AND is_active = 1
      `,
      [title, totalCopies, newAvailCopies, image_url || null, itemID],
    );

    // Update media table
    await connection.query(
      `
        UPDATE media
        SET author = ?
        WHERE itemID = ?
      `,
      [author, itemID],
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

module.exports = { fetchMedia, addMedia, deleteMedia, editMedia };
