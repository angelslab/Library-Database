import { useState, useEffect } from "react";
import { usDate, downloadCSV, CHART_COLORS, ITEM_TYPES, tally, segmentsFor } from "./reportHelpers";
import PieChart from "./PieChart";
import { Sheet, Stats, Section, Tag } from "./ReportSheet";

const EMPTY_PARAMS = {
  search: "",
  role: "",
  itemType: "",
  status: "",
  from: "",
  to: "",
};

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const loanWord = (n) => (n === 1 ? "loan" : "loans");

// Role -> major/department -> item type -> loans.
// The query sorts the rows, so groups come out in order.
function buildTree(rows) {
  const roles = [];
  const roleMap = new Map();

  for (const row of rows) {
    let role = roleMap.get(row.role);
    if (!role) {
      role = {
        name: row.role,
        depts: [],
        deptMap: new Map(),
        count: 0,
        out: 0,
      };
      roleMap.set(row.role, role);
      roles.push(role);
    }

    let dept = role.deptMap.get(row.group_name);
    if (!dept) {
      dept = {
        name: row.group_name,
        types: [],
        typeMap: new Map(),
        count: 0,
        out: 0,
      };
      role.deptMap.set(row.group_name, dept);
      role.depts.push(dept);
    }

    let type = dept.typeMap.get(row.item_type);
    if (!type) {
      type = { name: row.item_type, rows: [], count: 0, out: 0 };
      dept.typeMap.set(row.item_type, type);
      dept.types.push(type);
    }

    const stillOut = row.returned_date === null ? 1 : 0;
    type.rows.push(row);
    for (const g of [type, dept, role]) {
      g.count += 1;
      g.out += stillOut;
    }
  }
  return roles;
}

function describePeriod(p) {
  if (p.from && p.to) return `Borrowed ${usDate(p.from)} to ${usDate(p.to)}`;
  if (p.from) return `Borrowed from ${usDate(p.from)}`;
  if (p.to) return `Borrowed through ${usDate(p.to)}`;
  return "All dates";
}

function describeFilters(p) {
  const parts = [];
  if (p.search) parts.push(`Search: "${p.search.trim()}"`);
  if (p.role) parts.push(`Role: ${cap(p.role)}`);
  if (p.itemType) parts.push(`Item type: ${p.itemType}`);
  if (p.status === "out") parts.push("Status: Still out");
  if (p.status === "returned") parts.push("Status: Returned");
  return parts.length > 0 ? parts.join(" · ") : "No other filters";
}

function LoansReport({ onBack }) {
  const [params, setParams] = useState(EMPTY_PARAMS);
  const [rows, setRows] = useState(null); // null = show the request form
  const [ran, setRan] = useState(null); // { when, params }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setParam = (name, value) => setParams({ ...params, [name]: value });

  const runReport = async (p) => {
    setError("");

    if (p.from && p.to && p.from > p.to) {
      setError("'Borrowed from' must be on or before 'Borrowed to'.");
      return;
    }

    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(p)) {
      if (name !== "search" && value !== "") query.set(name, value);
    }

    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/api/reports/loans?" + query.toString(),
      );
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

  // load all loans on mount
  useEffect(() => {
    runReport(EMPTY_PARAMS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- request form ----------
  if (rows === null) {
    const field = { display: "flex", flexDirection: "column", fontSize: 14 };
    return (
      <div style={{ marginTop: 20, textAlign: "left", maxWidth: 720 }}>
        <h3>Loans by Role and Item Type</h3>
        <form onSubmit={viewReport}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <label style={{ ...field, gridColumn: "1 / span 2" }}>
              Search results
              <input
                type="text"
                placeholder="Search by title, borrower, major/department, item type, or ISBN…"
                value={params.search}
                onChange={(e) => setParam("search", e.target.value)}
                style={{ padding: 8 }}
              />
            </label>
            <label style={field}>
              Role
              <select
                value={params.role}
                onChange={(e) => setParam("role", e.target.value)}
                style={{ padding: 8 }}
              >
                <option value="">All</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </label>
            <label style={field}>
              Item type
              <select
                value={params.itemType}
                onChange={(e) => setParam("itemType", e.target.value)}
                style={{ padding: 8 }}
              >
                <option value="">All</option>
                <option value="Book">Book</option>
                <option value="Media">Media</option>
                <option value="Device">Device</option>
              </select>
            </label>
            <label style={{ ...field, gridColumn: "1 / span 2" }}>
              Status
              <select
                value={params.status}
                onChange={(e) => setParam("status", e.target.value)}
                style={{ padding: 8 }}
              >
                <option value="">All</option>
                <option value="out">Still out</option>
                <option value="returned">Returned</option>
              </select>
            </label>
            <label style={field}>
              Borrowed from
              <input
                type="date"
                value={params.from}
                onChange={(e) => setParam("from", e.target.value)}
                style={{ padding: 8 }}
              />
            </label>
            <label style={field}>
              Borrowed to
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
        [r.title, r.borrower, r.group_name, r.item_type, r.role, r.isbn]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : rows;

  const roles = buildTree(shownRows);
  const grand = roles.reduce(
    (t, r) => ({ count: t.count + r.count, out: t.out + r.out }),
    { count: 0, out: 0 },
  );

  // loans by role and by item type for the pie charts
  const byRole = tally(shownRows, (r) => String(r.role || "other").toLowerCase());
  const roleSegments = segmentsFor(
    { Students: byRole.student, Faculty: byRole.faculty },
    ["Students", "Faculty"],
    CHART_COLORS.pair,
  );
  const typeSegments = segmentsFor(
    tally(shownRows, (r) => r.item_type || "Other"),
    ITEM_TYPES,
    CHART_COLORS.trio,
  );

  const saveCSV = () => {
    const header = [
      "Role",
      "Major or department",
      "Item type",
      "Title",
      "Borrower",
      "Borrowed",
      "Due",
      "Returned",
      "Status",
    ];
    const data = shownRows.map((r) => [
      cap(r.role),
      r.group_name,
      r.item_type,
      r.title,
      r.borrower,
      usDate(r.borrow_date),
      usDate(r.due_date),
      r.returned_date ? usDate(r.returned_date) : "",
      r.loan_status,
    ]);
    data.push(
      [],
      [
        "Grand total",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `${grand.count} loans (${grand.out} still out)`,
      ],
    );
    downloadCSV(
      `loans-report-${new Date().toISOString().slice(0, 10)}.csv`,
      header,
      data,
    );
  };

  // summary: one row per role, item types as columns
  const typeCols = [
    ...ITEM_TYPES,
    ...(shownRows.some((r) => !ITEM_TYPES.includes(r.item_type)) ? ["Other"] : []),
  ];
  const typeKey = (r) => (ITEM_TYPES.includes(r.item_type) ? r.item_type : "Other");
  const summary = roles.map((role) => {
    const list = shownRows.filter((r) => r.role === role.name);
    return {
      name: cap(role.name),
      byType: tally(list, typeKey),
      count: role.count,
      out: role.out,
      overdue: list.filter((r) => r.loan_status === "Overdue").length,
    };
  });
  const overdue = shownRows.filter((r) => r.loan_status === "Overdue").length;
  const grandByType = tally(shownRows, typeKey);

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

      {/* on-screen chart (not included when printing the sheet) */}
      <div className="report-screen pie-charts" style={{ marginBottom: 18 }}>
        <PieChart title="Loans by role" unit="loans" segments={roleSegments} />
        <PieChart title="Loans by item type" unit="loans" segments={typeSegments} />
      </div>

      <Sheet
        title="Loans by Role and Item Type"
        period={describePeriod(ran.params)}
        filters={describeFilters(ran.params)}
        when={ran.when}
      >
        {shownRows.length === 0 ? (
          <p className="rs-empty">No loans match these parameters.</p>
        ) : (
          <>
            <Stats
              items={[
                { label: "Total loans", value: grand.count },
                { label: "Still out", value: grand.out },
                { label: "Overdue", value: overdue, tone: overdue > 0 ? "bad" : undefined },
                { label: "Returned", value: grand.count - grand.out },
              ]}
            />

            <Section title="Summary by role">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    {typeCols.map((t) => (
                      <th key={t} className="num">{t}</th>
                    ))}
                    <th className="num">Total</th>
                    <th className="num">Still out</th>
                    <th className="num">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      {typeCols.map((t) => (
                        <td key={t} className="num">{r.byType[t] || 0}</td>
                      ))}
                      <td className="num">{r.count}</td>
                      <td className="num">{r.out}</td>
                      <td className="num">{r.overdue}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    {typeCols.map((t) => (
                      <td key={t} className="num">{grandByType[t] || 0}</td>
                    ))}
                    <td className="num">{grand.count}</td>
                    <td className="num">{grand.out}</td>
                    <td className="num">{overdue}</td>
                  </tr>
                </tfoot>
              </table>
            </Section>

            <Section
              title="Loan details"
              note={`${shownRows.length} ${loanWord(shownRows.length)}`}
            >
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Borrower</th>
                    <th>Role</th>
                    <th>Major / Department</th>
                    <th>Type</th>
                    <th>Borrowed</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((r) => (
                    <tr key={r.loanID}>
                      <td>{r.title}</td>
                      <td>{r.borrower}</td>
                      <td>{cap(r.role)}</td>
                      <td className="muted">{r.group_name || "—"}</td>
                      <td>{r.item_type}</td>
                      <td className="nowrap">{usDate(r.borrow_date)}</td>
                      <td className="nowrap">{usDate(r.due_date)}</td>
                      <td className="nowrap">
                        {r.returned_date ? usDate(r.returned_date) : "—"}
                      </td>
                      <td><Tag>{r.loan_status}</Tag></td>
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

export default LoansReport;
