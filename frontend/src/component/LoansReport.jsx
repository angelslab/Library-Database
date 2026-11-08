import { useState, useEffect } from "react";
import { usDate, downloadCSV } from "./reportHelpers";
import Donut from "./Donut";

const EMPTY_PARAMS = {
  role: "",
  dept: "",
  itemType: "",
  status: "",
  from: "",
  to: "",
};

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const loanWord = (n) => (n === 1 ? "loan" : "loans");
const countText = (g) => `${g.count} ${loanWord(g.count)} (${g.out} still out)`;

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
  if (p.role) parts.push(`Role: ${cap(p.role)}`);
  if (p.dept) parts.push(`Major or department contains "${p.dept}"`);
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
  const [search, setSearch] = useState(""); // free-text filter on the results

  const setParam = (name, value) => setParams({ ...params, [name]: value });

  const runReport = async (p) => {
    setError("");

    const dept = p.dept.trim();
    if (dept !== "" && dept.length < 2) {
      setError("Type 2 or more characters to search for a major or department.");
      return;
    }
    if (p.from && p.to && p.from > p.to) {
      setError("'Borrowed from' must be on or before 'Borrowed to'.");
      return;
    }

    const query = new URLSearchParams();
    for (const [name, value] of Object.entries({ ...p, dept })) {
      if (value !== "") query.set(name, value);
    }

    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/api/reports/loans?" + query.toString(),
      );
      const data = await res.json();
      if (res.ok) {
        setRows(data);
        setRan({ when: new Date(), params: { ...p, dept } });
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

  // show every loan straight away; searches/filters narrow it down (TA feedback)
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
              Major or department
              <input
                type="text"
                placeholder="Type 2 or more characters to search"
                value={params.dept}
                onChange={(e) => setParam("dept", e.target.value)}
                style={{ padding: 8 }}
              />
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
            <label style={field}>
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
  const term = search.trim().toLowerCase();
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

  // loans by role for the donut
  const byRole = {};
  shownRows.forEach((r) => {
    const k = String(r.role || "other").toLowerCase();
    byRole[k] = (byRole[k] || 0) + 1;
  });

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

  const cell = { padding: "6px 10px", border: "1px solid #999" };
  const headCell = { ...cell, background: "#d9d9d9", fontWeight: 700 };
  const right = { textAlign: "right" };
  const totalRow = (label, g, strong, key) => (
    <tr key={key}>
      <td
        colSpan={5}
        style={{ ...cell, ...right, fontWeight: strong ? 700 : 400 }}
      >
        {label}
      </td>
      <td style={{ ...cell, ...right, fontWeight: strong ? 700 : 400 }}>
        {countText(g)}
      </td>
    </tr>
  );

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

      {/* on-screen search + chart (not included when printing the sheet) */}
      <div className="report-screen" style={{ marginBottom: 18 }}>
        <input
          type="text"
          placeholder="Search by title, borrower, type, or ISBN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 440, marginBottom: 16 }}
        />
        <div
          style={{
            background: "#10253e",
            border: "1px solid #263e59",
            borderRadius: 14,
            padding: 20,
            maxWidth: 540,
          }}
        >
          <p style={{ fontFamily: "Georgia, serif", fontSize: 16, margin: "0 0 16px" }}>
            Loans by role {term && "(filtered)"}
          </p>
          <Donut
            total={shownRows.length}
            totalLabel="loans"
            segments={[
              { label: "Students", value: byRole.student || 0, color: "#4075aa" },
              { label: "Faculty", value: byRole.faculty || 0, color: "#e5bf6d" },
            ]}
          />
        </div>
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
          Loans by Role and Item Type
        </div>
        <p style={{ textAlign: "center", margin: "10px 0 2px" }}>
          {describePeriod(ran.params)}
        </p>
        <p style={{ textAlign: "center", margin: "0 0 14px", fontSize: 13 }}>
          {describeFilters(ran.params)}
        </p>

        {shownRows.length === 0 ? (
          <p>No loans match these parameters.</p>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr>
                <th style={headCell}>Title</th>
                <th style={headCell}>Borrower</th>
                <th style={headCell}>Borrowed</th>
                <th style={headCell}>Due</th>
                <th style={headCell}>Returned</th>
                <th style={headCell}>Status</th>
              </tr>
            </thead>

            {roles.map((role) => (
              <tbody key={role.name}>
                <tr>
                  <td
                    colSpan={6}
                    style={{ ...cell, background: "#c9c9c9", fontWeight: 700 }}
                  >
                    Role: {cap(role.name)}
                  </td>
                </tr>

                {role.depts.map((dept) => [
                  <tr key={dept.name + "-head"}>
                    <td
                      colSpan={6}
                      style={{
                        ...cell,
                        background: "#e0e0e0",
                        fontWeight: 700,
                      }}
                    >
                      {role.name === "faculty" ? "Department" : "Major"}:{" "}
                      {dept.name}
                    </td>
                  </tr>,

                  ...dept.types.flatMap((type) => [
                    <tr key={dept.name + type.name + "-head"}>
                      <td
                        colSpan={6}
                        style={{
                          ...cell,
                          background: "#efefef",
                          fontWeight: 700,
                        }}
                      >
                        Item type: {type.name}
                      </td>
                    </tr>,
                    ...type.rows.map((r) => (
                      <tr key={r.loanID}>
                        <td style={cell}>{r.title}</td>
                        <td style={cell}>{r.borrower}</td>
                        <td style={cell}>{usDate(r.borrow_date)}</td>
                        <td style={cell}>{usDate(r.due_date)}</td>
                        <td style={cell}>
                          {r.returned_date ? usDate(r.returned_date) : "—"}
                        </td>
                        <td
                          style={{
                            ...cell,
                            color:
                              r.loan_status === "Overdue" ? "#b00020" : "#111",
                          }}
                        >
                          {r.loan_status}
                        </td>
                      </tr>
                    )),
                    totalRow(
                      "Total per item type",
                      type,
                      false,
                      dept.name + type.name + "-total",
                    ),
                  ]),

                  totalRow(
                    `Total in ${dept.name}`,
                    dept,
                    true,
                    dept.name + "-total",
                  ),
                ])}

                {totalRow(
                  `Total ${cap(role.name)}`,
                  role,
                  true,
                  role.name + "-total",
                )}
              </tbody>
            ))}

            <tbody>{totalRow("Grand total", grand, true, "grand")}</tbody>
          </table>
        )}

        <p style={{ fontSize: 12, marginTop: 14, fontStyle: "italic" }}>
          Run on {ran.when.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default LoansReport;
