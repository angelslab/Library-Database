import { useState } from "react";
import FinesReport from "./FinesReport";
import LoansReport from "./LoansReport";

// Add a report here as it gets built: set `ready: true` and give it a component.
const REPORTS = [
  {
    key: "fines",
    label: "Fines and Charges",
    ready: true,
    Component: FinesReport,
  },
  {
    key: "loans",
    label: "Loans by Role and Item Type",
    ready: true,
    Component: LoansReport,
  },
  { key: "inventory", label: "Inventory and Circulation", ready: false },
];

function Reports() {
  const [active, setActive] = useState(null);

  const current = REPORTS.find((r) => r.key === active);
  if (current && current.Component) {
    const ReportComponent = current.Component;
    return <ReportComponent onBack={() => setActive(null)} />;
  }

  return (
    <div style={{ marginTop: 20, textAlign: "left" }}>
      <h3>Reports</h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 360,
        }}
      >
        {REPORTS.map((r) => (
          <button
            key={r.key}
            disabled={!r.ready}
            onClick={() => setActive(r.key)}
            style={{ textAlign: "left", padding: "10px 14px" }}
          >
            {r.label}
            {!r.ready && " (coming soon)"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Reports;