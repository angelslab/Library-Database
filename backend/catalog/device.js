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
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const existingDevice = await connection.query(
      `
        SELECT items.itemID
        FROM items, device
        WHERE items.itemID = device.itemID
          AND LOWER(TRIM(items.title)) = LOWER(TRIM(?))
          AND LOWER(TRIM(device.brand)) = LOWER(TRIM(?))
          AND LOWER(TRIM(device.device_type)) = LOWER(TRIM(?))
          AND items.is_active = 1
      `,
      [title, brand, deviceType],
    );

    if (existingDevice[0].length > 0) {
      throw new Error(
        "This device already exists with the same title, brand, and device type.",
      );
    }

    // item table
    const results = await connection.query(
      `
      INSERT into items(title, item_type, total_copies, available_copies, image_url)
      VALUES (?, 'Device', ?, ?, ?)
    
    `,
      [title, totalCopies, totalCopies, image_url || null],
    );

    const itemID = results[0].insertId;

    //device table
    await connection.query(
      `
    INSERT into device(itemID, device_type, brand)
    VALUES(?, ?, ?)
    `,
      [itemID, deviceType, brand],
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

async function deleteDevice(itemID) {
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
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check whether the device exists
    const [rows] = await connection.query(
      `
        SELECT total_copies, available_copies
        FROM items
        WHERE itemID = ?
          AND item_type = 'Device'
          AND is_active = 1
      `,
      [itemID],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    // Check for duplicate devices, excluding the current item
    const [existingDevice] = await connection.query(
      `
        SELECT items.itemID
        FROM items, device
        WHERE items.itemID = device.itemID
          AND LOWER(TRIM(items.title)) = LOWER(TRIM(?))
          AND LOWER(TRIM(device.brand)) = LOWER(TRIM(?))
          AND LOWER(TRIM(device.device_type)) = LOWER(TRIM(?))
          AND items.itemID != ?
          AND items.is_active = 1
      `,
      [title, brand, deviceType, itemID],
    );

    if (existingDevice.length > 0) {
      throw new Error(
        "This device already exists with the same title, brand, and device type.",
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
          AND item_type = 'Device'
          AND is_active = 1
      `,
      [title, totalCopies, newAvailCopies, image_url || null, itemID],
    );

    // Update device table
    await connection.query(
      `
        UPDATE device
        SET device_type = ?, brand = ?
        WHERE itemID = ?
      `,
      [deviceType, brand, itemID],
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

module.exports = { fetchDevices, addDevice, deleteDevice, editDevice };
