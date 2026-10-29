import { useState } from "react";
import { money, usDate, downloadCSV } from "./reportHelpers";

const CHARGE_TYPES = ["Late", "Printer", "Surcharge"];
const EMPTY_PARAMS = { borrower: "", type: "", paid: "", from: "", to: "" };

const statusOf = (row) => (row.paid === 1 ? "Collected" : "Outstanding");

// one group per borrower, in the order the rows arrive (the query sorts them)
function groupByBorrower(rows) {
    const groups = [];
    const byUser = new Map();
    for (const row of rows) {
        if (!byUser.has(row.userID)) {
            const group = {
            userID: row.userID,
            borrower: row.borrower,
            role: row.role,
            rows: [],
            collected: 0,
            outstanding: 0,
        };
        byUser.set(row.userID, group);
        groups.push(group);
    }
    const group = byUser.get(row.userID);
    group.rows.push(row);
    if (row.paid === 1) group.collected += Number(row.amount);
    else group.outstanding += Number(row.amount);
    }
    return groups;
}

function describePeriod(p) {
    if (p.from && p.to) return `${usDate(p.from)} to ${usDate(p.to)}`;
    if (p.from) return `From ${usDate(p.from)}`;
    if (p.to) return `Through ${usDate(p.to)}`;
    return "All dates";
}

function describeFilters(p) {
    const parts = [];
    if (p.borrower) parts.push(`Borrower contains "${p.borrower}"`);
    if (p.type) parts.push(`Charge type: ${p.type}`);
    if (p.paid === "1") parts.push("Status: Collected");
    if (p.paid === "0") parts.push("Status: Outstanding");
    return parts.length > 0 ? parts.join(" · ") : "No other filters";
}

function FinesReport({ onBack }) {
    const [params, setParams] = useState(EMPTY_PARAMS);
    const [rows, setRows] = useState(null); // null = show the request form
    const [ran, setRan] = useState(null); // { when, params } for the output header
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setParam = (name, value) => setParams({ ...params, [name]: value });

    const viewReport = async (e) => {
        e.preventDefault();
        setError("");

        const borrower = params.borrower.trim();
        if (borrower !== "" && borrower.length < 2) {
            setError("Type 2 or more characters to search for a borrower.");
            return;
        }
    if (params.from && params.to && params.from > params.to) {
        setError("'Issued from' must be on or before 'Issued to'.");
        return;
    }

    const query = new URLSearchParams();
    for (const [name, value] of Object.entries({ ...params, borrower })) {
        if (value !== "") query.set(name, value);
    }

    setLoading(true);
    try {
        const res = await fetch(
        "http://localhost:3000/api/reports/fines?" + query.toString(), );
        const data = await res.json();
        if (res.ok) {
            setRows(data);
            setRan({ when: new Date(), params: { ...params, borrower } });
        } else {
            setError(data.error || "Something went wrong");
        }
    } catch (err) {
        setError("Cannot reach server: " + err.message);
    }
    setLoading(false);
    };

  // ---------- request form ----------
    if (rows === null) {
        const field = { display: "flex", flexDirection: "column", fontSize: 14 };
        return (
        <div style={{ marginTop: 20, textAlign: "left", maxWidth: 720 }}>
            <h3>Fines and Charges Report</h3>
            <form onSubmit={viewReport}>
            <div
                style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                }}
            >
            <label style={{ ...field, gridColumn: "1 / span 2" }}>
                Borrower
                <input
                    type="text"
                    placeholder="Type 2 or more characters to search"
                    value={params.borrower}
                    onChange={(e) => setParam("borrower", e.target.value)}
                    style={{ padding: 8 }}
                />
            </label>
            <label style={field}>
                Charge type
                <select
                    value={params.type}
                    onChange={(e) => setParam("type", e.target.value)}
                    style={{ padding: 8 }}
                >
                <option value="">All</option>
                {CHARGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                    {t}
                </option>
                ))}
                </select>
            </label>
            <label style={field}>
                Status
                <select
                    value={params.paid}
                    onChange={(e) => setParam("paid", e.target.value)}
                    style={{ padding: 8 }}
                >
                <option value="">All</option>
                <option value="1">Collected</option>
                <option value="0">Outstanding</option>
                </select>
            </label>
            <label style={field}>
                Issued from
                <input
                    type="date"
                    value={params.from}
                    onChange={(e) => setParam("from", e.target.value)}
                    style={{ padding: 8 }}
                />
            </label>
            <label style={field}>
                Issued to
                <input
                    type="date"
                    value={params.to}
                    onChange={(e) => setParam("to", e.target.value)}
                    style={{ padding: 8 }}
                />
            </label>
            </div>

        {error && <p style={{ color: "#e57373" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" disabled={loading}>
                {loading ? "Running..." : "View Report"}
            </button>
            <button type="button" onClick={() => setParams(EMPTY_PARAMS)}>
                Reset
            </button>
            {onBack && (
                <button type="button" onClick={onBack}>
                ← All reports
                </button>
            )}
            </div>
            </form>
        </div>
    );
    }

  // ---------- formatted output ----------
    const groups = groupByBorrower(rows);
    const totals = groups.reduce(
    (t, g) => ({
        collected: t.collected + g.collected,
        outstanding: t.outstanding + g.outstanding,
        count: t.count + g.rows.length,
    }),
    { collected: 0, outstanding: 0, count: 0 },
    );

    const saveCSV = () => {
    const header = [
        "Borrower",
        "Role",
        "Issued",
        "Item",
        "Item type",
        "Charge type",
        "Status",
        "Amount",
    ];
    const data = rows.map((r) => [
        r.borrower,
        r.role,
        usDate(r.issue_date),
        r.item_title,
        r.item_type,
        r.charge_type,
        statusOf(r),
        Number(r.amount).toFixed(2),
    ]);
    data.push(
        [],
        ["Total collected", "", "", "", "", "", "", totals.collected.toFixed(2)],
        [
            "Total outstanding",
            "",
            "",
            "",
            "",
            "",
            "",
            totals.outstanding.toFixed(2),
        ],
        [
            "Grand total",
            "",
            "",
            "",
            "",
            "",
            "",
            (totals.collected + totals.outstanding).toFixed(2),
        ],
    );
    downloadCSV(
        `fines-report-${new Date().toISOString().slice(0, 10)}.csv`,
        header,
        data,
    );
};

    const cell = { padding: "6px 10px", border: "1px solid #999" };
    const headCell = { ...cell, background: "#d9d9d9", fontWeight: 700 };
    const right = { textAlign: "right" };

return (
    <div style={{ marginTop: 20, textAlign: "left" }}>
        <style>{`
            @media print {
            body * { visibility: hidden; }
            .report-sheet, .report-sheet * { visibility: visible; }
            .report-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
        `}</style>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setRows(null)}>← Change parameters</button>
            <button onClick={saveCSV}>Save as CSV</button>
            <button onClick={() => window.print()}>Print / PDF</button>
        </div>

        <div
            className="report-sheet"
            style={{ background: "#fff", color: "#111", padding: 16 }}
        >
        <div
            style={{
                background: "#c0c0c0",
                textAlign: "center",
                fontWeight: 700,
                padding: 8,
            }}
        >
            Fines and Charges Report
        </div>
        <p style={{ textAlign: "center", margin: "10px 0 2px" }}>
            {describePeriod(ran.params)}
        </p>
        <p style={{ textAlign: "center", margin: "0 0 14px", fontSize: 13 }}>
            {describeFilters(ran.params)}
        </p>

        {rows.length === 0 ? (
            <p>No charges match these parameters.</p>
        ) : (
        <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
        >
            <thead>
                <tr>
                    <th style={headCell}>Issued</th>
                    <th style={headCell}>Item</th>
                    <th style={headCell}>Item type</th>
                    <th style={headCell}>Charge type</th>
                    <th style={headCell}>Status</th>
                    <th style={{ ...headCell, ...right }}>Amount</th>
                </tr>
            </thead>

            {groups.map((g) => (
                <tbody key={g.userID}>
                    <tr>
                    <td
                        colSpan={6}
                        style={{ ...cell, background: "#e9e9e9", fontWeight: 700 }}
                    > 
                        Borrower: {g.borrower} ({g.role})
                    </td>
                    </tr>
                {g.rows.map((r) => (
                    <tr key={r.fineID}>
                        <td style={cell}>{usDate(r.issue_date)}</td>
                        <td style={cell}>{r.item_title}</td>
                        <td style={cell}>{r.item_type}</td>
                        <td style={cell}>{r.charge_type}</td>
                        <td style={cell}>{statusOf(r)}</td>
                        <td style={{ ...cell, ...right }}>{money(r.amount)}</td>
                    </tr>
                ))}
                <tr>
                    <td
                        colSpan={5}
                        style={{ ...cell, ...right, fontWeight: 700 }}
                    >
                    Sub Total (outstanding {money(g.outstanding)})
                    </td>
                    <td style={{ ...cell, ...right, fontWeight: 700 }}>
                        {money(g.collected + g.outstanding)}
                    </td>
                </tr>
                </tbody>
            ))}

            <tbody>
                <tr>
                    <td colSpan={5} style={{ ...cell, ...right }}>
                        Total collected
                    </td>
                <td style={{ ...cell, ...right }}>{money(totals.collected)}</td>
              </tr>
              <tr>
                <td colSpan={5} style={{ ...cell, ...right }}>
                    Total outstanding
                </td>
                <td style={{ ...cell, ...right }}>
                    {money(totals.outstanding)}
                </td>
                </tr>
                <tr>
                    <td colSpan={5} style={{ ...cell, ...right, fontWeight: 700 }}>
                        Grand total ({totals.count} charges)
                </td>
                <td style={{ ...cell, ...right, fontWeight: 700 }}>
                    {money(totals.collected + totals.outstanding)}
                </td>
                </tr>
            </tbody>
            </table>
        )}

        <p style={{ fontSize: 12, marginTop: 14, fontStyle: "italic" }}>
            Run on {ran.when.toLocaleString()}
        </p>
        </div>
    </div>
);
}

export default FinesReport;
