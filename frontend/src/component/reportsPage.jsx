import { useState } from "react";
import FinesReport from "./FinesReport";
import LoansReport from "./LoansReport";
import InventoryReport from "./inventoryReport";
import ActivityLogReport from "./ActivityLogReport";

function RIcon({ name }) {
  const paths = {
    fines: (
      <>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    loans: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="6" />
        <rect x="12" y="7" width="3" height="10" />
        <rect x="17" y="13" width="3" height="4" />
      </>
    ),
    inventory: (
      <>
        <path d="M21 8l-9-5-9 5 9 5 9-5z" />
        <path d="M3 8v8l9 5 9-5V8" />
      </>
    ),
    activity: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// Add a report here as it gets built: give it a component.
const REPORTS = [
  {
    key: "fines",
    label: "Fines and Charges",
    desc: "Unpaid and collected fines by borrower and date.",
    Component: FinesReport,
  },
  {
    key: "loans",
    label: "Loans by Role and Item Type",
    desc: "How students, faculty, and each item type borrow.",
    Component: LoansReport,
  },
  {
    key: "inventory",
    label: "Inventory and Circulation",
    desc: "Stock levels and how often items circulate.",
    Component: InventoryReport,
  },
  {
    key: "activity",
    label: "Activity Log (borrows & returns)",
    desc: "Every borrow and return as it happens.",
    Component: ActivityLogReport,
  },
];

function Reports() {
  const [active, setActive] = useState(() => {
    try {
      const saved = localStorage.getItem("reportView");
      return REPORTS.some((r) => r.key === saved) ? saved : null;
    } catch {
      return null;
    }
  });

  // remember which report is open so a reload keeps it
  function openReport(key) {
    setActive(key);
    try {
      if (key) localStorage.setItem("reportView", key);
      else localStorage.removeItem("reportView");
    } catch {
      // ignore: storage blocked
    }
  }

  const current = REPORTS.find((r) => r.key === active);
  if (current) {
    const ReportComponent = current.Component;
    return <ReportComponent onBack={() => openReport(null)} />;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "0 0 4px" }}>
        Reports
      </h2>
      <p style={{ color: "#8295a9", fontSize: 14, margin: "0 0 22px" }}>
        Browse library activity and export it for your records.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 16,
        }}
      >
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => openReport(r.key)}
            style={{
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              textAlign: "left",
              padding: 20,
              background: "#10253e",
              border: "1px solid #263e59",
              borderRadius: 14,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 46,
                height: 46,
                borderRadius: 12,
                flexShrink: 0,
                color: "#e5bf6d",
                background: "#193550",
              }}
            >
              <RIcon name={r.key} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>
                {r.label}
              </span>
              <span style={{ color: "#8295a9", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                {r.desc}
              </span>
              <span style={{ color: "#4075aa", fontSize: 13, fontWeight: 600 }}>
                View report →
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Reports;
