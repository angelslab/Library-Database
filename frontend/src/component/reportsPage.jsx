import { useState } from "react";
import FinesReport from "./FinesReport";
import LoansReport from "./LoansReport";
import InventoryReport from "./inventoryReport";

// Add a report here as it gets built: give it a component.
const REPORTS = [
  { key: "fines", label: "Fines and Charges", Component: FinesReport },
  {
    key: "loans",
    label: "Loans by Role and Item Type",
    Component: LoansReport,
  },
  {
    key: "inventory",
    label: "Inventory and Circulation",
    Component: InventoryReport,
  },
];

function Reports() {
  const [active, setActive] = useState(null);

  const current = REPORTS.find((r) => r.key === active);
  if (current) {
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
            onClick={() => setActive(r.key)}
            style={{ textAlign: "left", padding: "10px 14px" }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Reports;