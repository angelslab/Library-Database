const db = require("../db");

// Inventory and Circulation: one row per item with its copy counts.
// "Out now" is counted from the loans themselves (not from the stored
// available_copies counter) so the report can flag a counter that is off.
async function getInventoryReport({ from, to, itemType, outOnly }) {
  const [rows] = await db.query(
    `SELECT i.itemID,
            COALESCE(i.item_type, 'Other') AS type_name,
            i.title,
            COALESCE(b.author, m.author, d.brand) AS creator,
            i.total_copies,
            i.available_copies AS stored_available,
            (SELECT COUNT(*)
    FROM loans lo
    WHERE lo.itemID = i.itemID
    AND lo.returned_date IS NULL) AS out_now,
    (SELECT COUNT(*)
    FROM loans lp
    WHERE lp.itemID = i.itemID
    AND (? IS NULL OR lp.borrow_date >= ?)
    AND (? IS NULL OR lp.borrow_date <= ?)) AS loans_in_period
    FROM items i
    LEFT JOIN book b   ON b.itemID = i.itemID
    LEFT JOIN media m  ON m.itemID = i.itemID
    LEFT JOIN device d ON d.itemID = i.itemID
    WHERE (? IS NULL OR i.item_type = ?)
    AND (? IS NULL OR EXISTS (SELECT 1
    FROM loans lx
    WHERE lx.itemID = i.itemID
    AND lx.returned_date IS NULL))
    ORDER BY type_name, i.title`,
        [from, from, to, to, itemType, itemType, outOnly],
    );
    return rows;
}

module.exports = { getInventoryReport };