const db = require("../db");

async function finesReport(q) {
    const term = `%${q}%`;
    const[rows] = db.query(`
        SELECT u.userID,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        f.charge_type, f.amount, f.paid, f.issue_date,
        SUM(f.amount) OVER () AS total_charges
        FROM fines f
        JOIN users u ON u.userID = f.userID
        WHERE (? IS NULL OR charge_type = ?)
        AND (? IS NULL OR paid = ?)
        AND (? IS NULL OR issue_date >= ?)
        AND (? IS NULL OR issue_date <= ?) 
        ORDER BY f.paid DESC;
        `
        [type, type, paid, paid, from, from, to, to]
    );
}

module.export( finesReport );