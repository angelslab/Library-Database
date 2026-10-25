const db = require("../db");

async function fetchDevices() {
  const results = await db.query(`
        SELECT
            items.itemID,
            items.title,
            items.item_type,
            items.total_copies,
            items.available_copies,

            device.device_type,
            device.brand
        FROM items, device
        WHERE items.itemID = device.itemID
        `);

  const rows = results[0];

  return rows;
}

async function addDevice(title, totalCopies, brand, deviceType) {
  // item table
  const results = await db.query(
    `
      INSERT into items(title, item_type, total_copies)
      VALUES (?, 'Device', ?)
    
    `,
    [title, totalCopies],
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
    DELETE FROM items 
    WHERE itemID = ?
    `,
    [itemID],
  );

  return result[0].affectedRows;
}

async function editDevice(itemID, title, totalCopies, brand, deviceType) {
  // items table
  const itemResult = await db.query(
    `
      UPDATE items
      SET title = ? , total_copies = ?
      WHERE itemID = ?
    `,
    [title, totalCopies, itemID],
  );

  if (itemResult[0].affectedRows === 0) {
    return false;
  }

  //device
  await db.query(
    `
      UPDATE device
      SET device_type =? , brand = ?
      WHERE itemID = ?
    `,
    [deviceType, brand],
  );

  return true;
}

module.exports = { fetchDevices, addDevice, deleteDevice, editDevice };
