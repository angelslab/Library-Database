import { useState } from "react";
import { usDate, downloadCSV, CHART_COLORS, ITEM_TYPES, tally, segmentsFor } from "./reportHelpers";
import PieChart from "./PieChart";
import { Sheet, Stats, Section, Tag } from "./ReportSheet";

const EMPTY_PARAMS = { search: "", itemType: "", outOnly: false, from: "", to: "" };

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
  if (p.search) parts.push(`Search: "${p.search.trim()}"`);
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

  const runReport = async (p) => {
    setError("");

    if (p.from && p.to && p.from > p.to) {
      setError("'Loans from' must be on or before 'Loans to'.");
      return;
    }

    const query = new URLSearchParams();
    if (p.itemType) query.set("itemType", p.itemType);
    if (p.outOnly) query.set("outOnly", "1");
    if (p.from) query.set("from", p.from);
    if (p.to) query.set("to", p.to);

    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3000/api/reports/inventory?" + query.toString(),
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
            <label style={{ ...field, gridColumn: "1 / span 2" }}>
              Search results
              <input
                type="text"
                placeholder="Search by title, author/brand, item type, or ISBN…"
                value={params.search}
                onChange={(e) => setParam("search", e.target.value)}
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
  const term = (ran.params.search || "").trim().toLowerCase();
  const shownRows = term
    ? rows.filter((r) =>
        [r.title, r.creator, r.type_name, r.isbn]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : rows;

  const { groups, grand } = buildGroups(shownRows);

  // items and loans (circulation) by type for the pie charts
  const typeOf = (r) => r.type_name || "Other";
  const itemSegments = segmentsFor(tally(shownRows, typeOf), ITEM_TYPES, CHART_COLORS.trio);
  const loanSegments = segmentsFor(
    tally(shownRows, typeOf, (r) => Number(r.loans_in_period) || 0),
    ITEM_TYPES,
    CHART_COLORS.trio,
  );

  const saveCSV = () => {
    const header = [
      "Item type",
      "Title",
      "Author or brand",
      "Total copies",
      "Out now",
      "Available",
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
      grand.loans,
      "",
    ]);
    downloadCSV(
      `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`,
      header,
      data,
    );
  };

  const mismatches = groups.reduce(
    (n, g) => n + g.items.filter((it) => !it.counterOk).length,
    0,
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

      {/* on-screen chart (not included when printing the sheet) */}
      <div className="report-screen pie-charts" style={{ marginBottom: 18 }}>
        <PieChart title="Items by type" unit="items" segments={itemSegments} />
        <PieChart title="Loans by item type" unit="loans" segments={loanSegments} />
      </div>

      <Sheet
        title="Inventory and Circulation"
        period={"Loans counted " + describeLoanPeriod(ran.params)}
        filters={describeFilters(ran.params)}
        when={ran.when}
      >
        {shownRows.length === 0 ? (
          <p className="rs-empty">No items match these parameters.</p>
        ) : (
          <>
            <Stats
              items={[
                { label: "Items", value: grand.items },
                { label: "Total copies", value: grand.copies },
                { label: "Out now", value: grand.out },
                { label: "Loans in period", value: grand.loans },
              ]}
            />

            <Section title="Summary by item type">
              <table>
                <thead>
                  <tr>
                    <th>Item type</th>
                    <th className="num">Items</th>
                    <th className="num">Total copies</th>
                    <th className="num">Out now</th>
                    <th className="num">Available</th>
                    <th className="num">Loans in period</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.name}>
                      <td>{g.name}</td>
                      <td className="num">{g.total.items}</td>
                      <td className="num">{g.total.copies}</td>
                      <td className="num">{g.total.out}</td>
                      <td className="num">{g.total.available}</td>
                      <td className="num">{g.total.loans}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{grand.items}</td>
                    <td className="num">{grand.copies}</td>
                    <td className="num">{grand.out}</td>
                    <td className="num">{grand.available}</td>
                    <td className="num">{grand.loans}</td>
                  </tr>
                </tfoot>
              </table>
            </Section>

            <Section
              title="Item details"
              note={
                mismatches > 0
                  ? mismatches + (mismatches === 1 ? " stored count to check" : " stored counts to check")
                  : "All stored counts match"
              }
            >
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author / Brand</th>
                    <th>Type</th>
                    <th className="num">Copies</th>
                    <th className="num">Out now</th>
                    <th className="num">Available</th>
                    <th className="num">Loans in period</th>
                    <th>Counter check</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.flatMap((g) => g.items).map((it) => (
                    <tr key={it.itemID}>
                      <td>{it.title}</td>
                      <td className="muted">{it.creator || "—"}</td>
                      <td>{it.type_name}</td>
                      <td className="num">{it.copies}</td>
                      <td className="num">{it.out}</td>
                      <td className="num">{it.available}</td>
                      <td className="num">{it.loans}</td>
                      <td>
                        {it.counterOk ? (
                          <Tag>OK</Tag>
                        ) : (
                          <Tag tone="bad">Stored count says {it.stored_available}</Tag>
                        )}
                      </td>
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

export default InventoryReport;