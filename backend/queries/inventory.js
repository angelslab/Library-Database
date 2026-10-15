const db = require("../db");

async function searchBooks(q) {
    const term = `%${q}%`;
    const [rows] = await db.query(`
    SELECT i.itemID, i.title, b.author, b.isbn, i.total_copies, i.available_copies
    FROM items i
    JOIN book b ON b.itemID = i.itemID
    WHERE i.title LIKE ?
        OR b.author LIKE ?
        OR b.isbn = ?`,
    [term, term, q]
    );
    return rows;
}

module.exports = { searchBooks };

