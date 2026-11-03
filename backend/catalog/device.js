const db = require("../db");

async function fetchDevices() {
  const results = await db.query(`
        SELECT
            items.itemID,
            items.title,
            items.item_type,
            items.total_copies,
            items.available_copies,
            items.image_url,
            device.device_type,
            device.brand
        FROM items, device
        WHERE items.itemID = device.itemID
          AND items.is_active = 1
        `);

  const rows = results[0];

  return rows;
}

async function addDevice(title, totalCopies, brand, deviceType, image_url) {
  // item table
  const results = await db.query(
    `
      INSERT into items(title, item_type, total_copies, image_url)
      VALUES (?, 'Device', ?, ?)
    
    `,
    [title, totalCopies, image_url || null],
  );

  const itemID = results[0].insertId;

  //device table
  await db.query(
    `
    INSERT into device(itemID, device_type, brand)
    VALUES(?, ?, ?)
    `,
    [itemID, deviceType, brand],
  );

  return itemID;
}

async function deleteDevice(itemID) {
  const result = await db.query(
    `
    UPDATE items
    SET is_active = 0 
    WHERE itemID = ?
      AND item_type = 'Device'
      AND is_active = 1
    `,
    [itemID],
  );

  return result[0].affectedRows;
}

async function editDevice(
  itemID,
  title,
  totalCopies,
  brand,
  deviceType,
  image_url,
) {
  try {
    const [rows] = await db.query(
      `SELECT total_copies, available_copies
       FROM items
       WHERE itemID = ? 
        AND item_type = 'Device'
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

    // items table
    await db.query(
      `
      UPDATE items
      SET title = ? , total_copies = ?, available_copies = ? ,image_url = ?
      WHERE itemID = ?
        
    `,
      [title, totalCopies, newAvailCopies, image_url, itemID],
    );

    //device
    await db.query(
      `
      UPDATE device
      SET device_type =? , brand = ?
      WHERE itemID = ?
    `,
      [deviceType, brand, itemID],
    );

    return true;
  } catch (error) {
    throw error;
  }
}

module.exports = { fetchDevices, addDevice, deleteDevice, editDevice };
