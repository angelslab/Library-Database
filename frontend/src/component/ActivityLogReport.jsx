import { useEffect, useState } from "react";
import { downloadCSV } from "./reportHelpers";

// Activity Log: shows the audit_log table (written automatically by the
// database triggers) so you can see every borrow and return in the app.
function ActivityLogReport({ onBack }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/api/reports/audit");
        const data = await res.json();
        if (!active) return;
        if (res.ok) setRows(data);
        else setError(data.error || "Something went wrong");
      } catch (err) {
        if (active) setError("Cannot reach server: " + err.message);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const term = search.trim().toLowerCase();
  const shown = rows
    ? rows.filter(
        (r) =>
          !term ||
          [r.user_name, r.item_title, r.action, r.item_type]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term),
      )
    : rows;

  const saveCSV = () => {
    const header = ["When", "Action", "User", "Item", "Type", "Loan ID"];
    const data = (shown || []).map((r) => [
      r.logged_at,
      r.action,
      r.user_name,
      r.item_title,
      r.item_type || "",
      r.loanID ?? "",
    ]);
    downloadCSV(
      `activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
      header,
      data,
    );
  };

  return (
    <div style={{ marginTop: 20, textAlign: "left", maxWidth: 860 }}>
      {/* in print / PDF, show only the sheet on a white background */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .activity-sheet, .activity-sheet * { visibility: visible; }
          .activity-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #fff; color: #111; padding: 16px;
          }
          .activity-sheet th, .activity-sheet td {
            border: 1px solid #999; color: #111 !important;
          }
          .activity-print-hide { display: none !important; }
        }
      `}</style>

      <div
        className="activity-print-hide"
        style={{ display: "flex", gap: 10, marginBottom: 16 }}
      >
        {onBack && (
          <button className="app-back-button" onClick={onBack}>
            ← All reports
          </button>
        )}
        {rows && rows.length > 0 && (
          <>
            <button onClick={saveCSV}>Save as CSV</button>
            <button onClick={() => window.print()}>Save as PDF</button>
          </>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="activity-print-hide">
          <input
            type="text"
            placeholder="Search by user, item, action, or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: 440, marginBottom: 16 }}
          />
        </div>
      )}

      <div className="activity-sheet">
        <h3>Activity Log</h3>
        <p
          style={{
            marginTop: 0,
            color: "var(--muted-foreground)",
            fontSize: 14,
          }}
        >
          Every borrow and return, recorded automatically.
        </p>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "#f14d4c" }}>{error}</p>}

        {rows && rows.length === 0 && (
          <p style={{ color: "var(--muted-foreground)" }}>
            No activity yet. Borrow or return an item to see it appear here.
          </p>
        )}

        {rows && rows.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Item</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.auditID}>
                    <td>{r.logged_at}</td>
                    <td
                      style={{
                        textTransform: "capitalize",
                        fontWeight: 600,
                        color: r.action === "return" ? "#5fbf8a" : "#e5bf6d",
                      }}
                    >
                      {r.action}
                    </td>
                    <td>{r.user_name}</td>
                    <td>{r.item_title}</td>
                    <td>{r.item_type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ fontSize: 12, marginTop: 14, fontStyle: "italic" }}>
              Generated {new Date().toLocaleString()} · {shown.length} entries
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivityLogReport;
