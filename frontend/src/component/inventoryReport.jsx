import { useState } from "react";
import { usDate, downloadCSV } from "./reportHelpers";

const EMPTY_PARAMS = { itemType: "", outOnly: false, from: "", to: "" };

const pct = (out, total) => (total > 0 ? (out / total) * 100 : 0);
const pctText = (out, total) => pct(out, total).toFixed(1) + "%";

// add one item row's numbers into a running total
function addTo(total, row) {
  total.items += 1;
  total.copies += row.copies;
  total.out += row.out;
  total.available += row.available;
  total.loans += row.loans;
}
const newTotal = () => ({
  items: 0,
  copies: 0,
  out: 0,
  available: 0,
  loans: 0,
});

// Item type -> items. The query sorts the rows, so types come out in order.
function buildGroups(rows) {
  const groups = [];
  const byType = new Map();
  const grand = newTotal();

  for (const r of rows) {
    const item = {
      ...r,
      copies: Number(r.total_copies),
      out: Number(r.out_now),
      available: Number(r.total_copies) - Number(r.out_now),
      loans: Number(r.loans_in_period),
    };
    // the stored counter should equal total copies minus unreturned loans
    item.counterOk = Number(r.stored_available) === item.available;

    let group = byType.get(r.type_name);
    if (!group) {
      group = { name: r.type_name, items: [], total: newTotal() };
      byType.set(r.type_name, group);
      groups.push(group);
    }
    group.items.push(item);
    addTo(group.total, item);
    addTo(grand, item);
  }
  return { groups, grand };
}

function describeLoanPeriod(p) {
  if (p.from && p.to) return `${usDate(p.from)} to ${usDate(p.to)}`;
  if (p.from) return `from ${usDate(p.from)}`;
  if (p.to) return `through ${usDate(p.to)}`;
  return "for all dates";
}

function describeFilters(p) {
  const parts = [];
  if (p.itemType) parts.push(`Item type: ${p.itemType}`);
  if (p.outOnly) parts.push("Only items currently out");
  return parts.length > 0 ? parts.join(" · ") : "No other filters";
}

function InventoryReport({ onBack }) {
  const [params, setParams] = useState(EMPTY_PARAMS);
  const [rows, setRows] = useState(null); // null = show the request form
  const [ran, setRan] = useState(null); // { when, params }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setParam = (name, value) => setParams({ ...params, [name]: value });

  const viewReport = async (e) => {
    e.preventDefault();
    setError("");

    if (params.from && params.to && params.from > params.to) {
      setError("'Loans from' must be on or before 'Loans to'.");
      return;
    }

    const query = new URLSearchParams();
    if (params.itemType) query.set("itemType", params.itemType);
    if (params.outOnly) query.set("outOnly", "1");
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);

    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/api/reports/inventory?" + query.toString(),
      );
      const data = await res.json();
      if (res.ok) {
        setRows(data);
        setRan({ when: new Date(), params: { ...params } });
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
        <h3>Inventory and Circulation</h3>
        <form onSubmit={viewReport}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
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
            <label
              style={{
                ...field,
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={params.outOnly}
                onChange={(e) => setParam("outOnly", e.target.checked)}
              />
              Only items currently out
            </label>
            <label style={field}>
              Count loans borrowed from
              <input
                type="date"
                value={params.from}
                onChange={(e) => setParam("from", e.target.value)}
                style={{ padding: 8 }}
              />
            </label>
            <label style={field}>
              Count loans borrowed to
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
  const { groups, grand } = buildGroups(rows);

  const saveCSV = () => {
    const header = [
      "Item type",
      "Title",
      "Author or brand",
      "Total copies",
      "Out now",
      "Available",
      "% checked out",
      "Loans in period",
      "Counter check",
    ];
    const data = [];
    for (const g of groups) {
      for (const it of g.items) {
        data.push([
          g.name,
          it.title,
          it.creator || "",
          it.copies,
          it.out,
          it.available,
          pctText(it.out, it.copies),
          it.loans,
          it.counterOk ? "OK" : `Stored count says ${it.stored_available}`,
        ]);
      }
      data.push([
        `Total ${g.name}`,
        `${g.total.items} items`,
        "",
        g.total.copies,
        g.total.out,
        g.total.available,
        pctText(g.total.out, g.total.copies),
        g.total.loans,
        "",
      ]);
    }
    data.push([
      "Total",
      `${grand.items} items`,
      "",
      grand.copies,
      grand.out,
      grand.available,
      pctText(grand.out, grand.copies),
      grand.loans,
      "",
    ]);
    downloadCSV(
      `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`,
      header,
      data,
    );
  };

  const cell = { padding: "6px 10px", border: "1px solid #999" };
  const headCell = { ...cell, background: "#d9d9d9", fontWeight: 700 };
  const num = { textAlign: "right" };
  const totalRow = (label, t, key, bold) => (
    <tr key={key}>
      <td colSpan={2} style={{ ...cell, ...num, fontWeight: bold ? 700 : 400 }}>
        {label} ({t.items} {t.items === 1 ? "item" : "items"})
      </td>
      <td style={{ ...cell, ...num, fontWeight: 700 }}>{t.copies}</td>
      <td style={{ ...cell, ...num, fontWeight: 700 }}>{t.out}</td>
      <td style={{ ...cell, ...num, fontWeight: 700 }}>{t.available}</td>
      <td style={{ ...cell, ...num, fontWeight: 700 }}>
        {pctText(t.out, t.copies)}
      </td>
      <td style={{ ...cell, ...num, fontWeight: 700 }}>{t.loans}</td>
      <td style={cell}></td>
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
          Inventory and Circulation Report
        </div>
        <p style={{ textAlign: "center", margin: "10px 0 2px" }}>
          Copies as of {ran.when.toLocaleDateString()} · Loans counted{" "}
          {describeLoanPeriod(ran.params)}
        </p>
        <p style={{ textAlign: "center", margin: "0 0 14px", fontSize: 13 }}>
          {describeFilters(ran.params)}
        </p>

        {rows.length === 0 ? (
          <p>No items match these parameters.</p>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr>
                <th style={headCell}>Title</th>
                <th style={headCell}>Author / Brand</th>
                <th style={{ ...headCell, ...num }}>Total copies</th>
                <th style={{ ...headCell, ...num }}>Out now</th>
                <th style={{ ...headCell, ...num }}>Available</th>
                <th style={{ ...headCell, ...num }}>% checked out</th>
                <th style={{ ...headCell, ...num }}>Loans in period</th>
                <th style={headCell}>Counter check</th>
              </tr>
            </thead>

            {groups.map((g) => (
              <tbody key={g.name}>
                <tr>
                  <td
                    colSpan={8}
                    style={{ ...cell, background: "#e0e0e0", fontWeight: 700 }}
                  >
                    Item type: {g.name}
                  </td>
                </tr>
                {g.items.map((it) => (
                  <tr key={it.itemID}>
                    <td style={cell}>{it.title}</td>
                    <td style={cell}>{it.creator || "—"}</td>
                    <td style={{ ...cell, ...num }}>{it.copies}</td>
                    <td style={{ ...cell, ...num }}>{it.out}</td>
                    <td style={{ ...cell, ...num }}>{it.available}</td>
                    <td style={{ ...cell, ...num }}>
                      {pctText(it.out, it.copies)}
                    </td>
                    <td style={{ ...cell, ...num }}>{it.loans}</td>
                    <td
                      style={{
                        ...cell,
                        color: it.counterOk ? "#111" : "#b00020",
                      }}
                    >
                      {it.counterOk
                        ? "OK"
                        : `Stored count says ${it.stored_available}`}
                    </td>
                  </tr>
                ))}
                {totalRow(`Total ${g.name}`, g.total, g.name + "-total", false)}
              </tbody>
            ))}

            <tbody>{totalRow("Total", grand, "grand", true)}</tbody>
          </table>
        )}

        <p style={{ fontSize: 12, marginTop: 14, fontStyle: "italic" }}>
          Run on {ran.when.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default InventoryReport;