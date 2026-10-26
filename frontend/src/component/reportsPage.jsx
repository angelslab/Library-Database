import { useState } from "react";
import FinesReport from "./FinesReport";

// Add a report here as it gets built: set `ready: true` and render it below.
const REPORTS = [
    { key: "fines", label: "Fines and Charges", ready: true },
    { key: "loans", label: "Loans by Role and Item Type", ready: false },
    { key: "inventory", label: "Inventory and Circulation", ready: false },
];

function Reports() {
    const [active, setActive] = useState(null);

    if (active === "fines") {
    return <FinesReport onBack={() => setActive(null)} />;
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
