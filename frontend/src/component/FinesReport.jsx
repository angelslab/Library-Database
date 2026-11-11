import { useState, useEffect } from "react";
import { money, usDate, downloadCSV, CHART_COLORS, tally, segmentsFor } from "./reportHelpers";
import PieChart from "./PieChart";
import { Sheet, Stats, Section, Tag } from "./ReportSheet";

const CHARGE_TYPES = ["Late", "Printer", "Surcharge"];
const EMPTY_PARAMS = { search: "", type: "", paid: "", from: "", to: "" };

const statusOf = (row) => (row.paid === 1 ? "Collected" : "Outstanding");

// one group per borrower, in the order the rows arrive (the query sorts them)
function groupByBorrower(rows) {
    const groups = [];
    const byUser = new Map();
    for (const row of rows) {
        // a walk-in print payment has no userID, so group those by the name given
        const key = row.userID ?? `walk-in:${row.borrower}`;
        if (!byUser.has(key)) {
            const group = {
            userID: row.userID,
            borrower: row.borrower,
            role: row.role,
            rows: [],
            collected: 0,
            outstanding: 0,
        };
        byUser.set(key, group);
        groups.push(group);
    }
    const group = byUser.get(key);
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
    if (p.search) parts.push(`Search: "${p.search.trim()}"`);
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

    const runReport = async (p) => {
        setError("");

    if (p.from && p.to && p.from > p.to) {
        setError("'Issued from' must be on or before 'Issued to'.");
        return;
    }

    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(p)) {
        if (name !== "search" && value !== "") query.set(name, value);
    }

    setLoading(true);
    try {
        const res = await fetch(
        "http://localhost:3000/api/reports/fines?" + query.toString(), );
        const data = await res.json();
        if (res.ok) {
            setRows(data);
            setRan({ when: new Date(), params: { ...p } });
        } else {
            setError(data.error || "Something went wrong");
        }
    } catch (err) {
        setError("Cannot reach server: " + err.message);
    }
    setLoading(false);
    };

    const viewReport = (e) => {
        e.preventDefault();
        runReport(params);
    };

    // load all charges on mount
    useEffect(() => {
        runReport(EMPTY_PARAMS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
              Search results
              <input
                type="text"
                placeholder="Search by borrower, item, charge type…"
                value={params.search}
                onChange={(e) => setParam("search", e.target.value)}
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
    const term = (ran.params.search || "").trim().toLowerCase();
    const shownRows = term
      ? rows.filter((r) =>
          [r.borrower, r.item_title, r.item_type, r.charge_type, r.role]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : rows;

    const groups = groupByBorrower(shownRows);

    // amounts by status and by charge type for the pie charts
    const amountOf = (r) => Number(r.amount) || 0;
    const statusSegments = segmentsFor(
        tally(shownRows, statusOf, amountOf),
        ["Collected", "Outstanding"],
        CHART_COLORS.pair,
    );
    const typeSegments = segmentsFor(
        tally(shownRows, (r) => r.charge_type || "Other", amountOf),
        CHARGE_TYPES,
        CHART_COLORS.trio,
    );
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
    const data = shownRows.map((r) => [
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


return (
    <div style={{ marginTop: 20, textAlign: "left" }}>
        <style>{`
            @media print {
            body * { visibility: hidden; }
            .report-sheet, .report-sheet * { visibility: visible; }
            .report-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
        `}</style>

        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <button onClick={() => setRows(null)}>← Change parameters</button>
            <button onClick={saveCSV}>Save as CSV</button>
            <button onClick={() => window.print()}>Print / PDF</button>
        </div>

        {/* on-screen charts (not included when printing the sheet) */}
        <div className="report-screen pie-charts" style={{ marginBottom: 18 }}>
            <PieChart title="Amount by status" format={money} segments={statusSegments} />
            <PieChart title="Amount by charge type" format={money} segments={typeSegments} />
        </div>

        <Sheet
            title="Fines and Charges Report"
            period={describePeriod(ran.params)}
            filters={describeFilters(ran.params)}
            when={ran.when}
        >
            {shownRows.length === 0 ? (
                <p className="rs-empty">No charges match these parameters.</p>
            ) : (
                <>
                    <Stats
                        items={[
                            { label: "Charges", value: totals.count },
                            { label: "Collected", value: money(totals.collected) },
                            {
                                label: "Outstanding",
                                value: money(totals.outstanding),
                                tone: totals.outstanding > 0 ? "bad" : undefined,
                            },
                            { label: "Total charged", value: money(totals.collected + totals.outstanding) },
                        ]}
                    />

                    <Section title="Summary by borrower" note={groups.length + (groups.length === 1 ? " borrower" : " borrowers")}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Borrower</th>
                                    <th>Role</th>
                                    <th className="num">Charges</th>
                                    <th className="num">Collected</th>
                                    <th className="num">Outstanding</th>
                                    <th className="num">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((g) => (
                                    <tr key={g.userID}>
                                        <td>{g.borrower}</td>
                                        <td className="muted">{g.role ? g.role.charAt(0).toUpperCase() + g.role.slice(1) : "—"}</td>
                                        <td className="num">{g.rows.length}</td>
                                        <td className="num">{money(g.collected)}</td>
                                        <td className="num">{money(g.outstanding)}</td>
                                        <td className="num">{money(g.collected + g.outstanding)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2}>Total</td>
                                    <td className="num">{totals.count}</td>
                                    <td className="num">{money(totals.collected)}</td>
                                    <td className="num">{money(totals.outstanding)}</td>
                                    <td className="num">{money(totals.collected + totals.outstanding)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </Section>

                    <Section title="Charge details" note={totals.count + (totals.count === 1 ? " charge" : " charges")}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Issued</th>
                                    <th>Borrower</th>
                                    <th>Item</th>
                                    <th>Charge type</th>
                                    <th>Status</th>
                                    <th className="num">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.flatMap((g) => g.rows).map((r) => (
                                    <tr key={r.row_key || r.fineID}>
                                        <td className="nowrap">{usDate(r.issue_date)}</td>
                                        <td>{r.borrower}</td>
                                        <td>
                                            {r.item_title}
                                            {r.item_type && <span className="muted"> · {r.item_type}</span>}
                                        </td>
                                        <td>{r.charge_type}</td>
                                        <td><Tag>{statusOf(r)}</Tag></td>
                                        <td className="num">{money(r.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Section>
                </>
            )}
        </Sheet>
    </div>
);
}

export default FinesReport;
