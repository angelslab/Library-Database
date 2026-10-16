const db = require("../db");

async function searchItems(q) {
    const term = `%${q}%`;
    const [rows] = await db.query(`
    SELECT i.itemID, i.title, b.author, b.isbn, i.total_copies, i.available_copies
    FROM items i
    LEFT JOIN book   b ON b.itemID = i.itemID
    LEFT JOIN media  m ON m.itemID = i.itemID
    LEFT JOIN device d ON d.itemID = i.itemID
    WHERE i.title LIKE ?
    OR b.author LIKE ?
    OR m.author LIKE ?
    OR d.brand  LIKE ?
    OR d.device_type LIKE ?
    OR b.isbn = ?`,
    [term, term, term, term, term, q]
    );
    return rows;
}

module.exports = { searchItems };

searchItems("Maria").then(console.log).then(() => process.exit());