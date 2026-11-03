import { useState } from "react";
import Inventory from "../component/InventorySearch";
import UserManagment from "../component/userManage";
import Reports from "../component/reportsPage";
import LibrarianLoans from "../component/LibrarianLoans";
import "../styles/Librarian.css";

function LibrarianHome({
  user,
  onNavigate,
  initialView = "menu",
  focusLoanID = null,
}) {
  const [view, setView] = useState(initialView);

  return (
    <div className="librarian-dashboard">
      <h2>Librarian Dashboard</h2>

      {view === "menu" && (
        <div className="dash-menu">
          <button className="dash-button" onClick={() => setView("inventory")}>
            Manage Inventory
          </button>
          <button className="dash-button" onClick={() => setView("users")}>
            Manage users
          </button>
          <button className="dash-button" onClick={() => setView("reports")}>
            Reports
          </button>
          <button className="dash-button" onClick={() => setView("loans")}>
            Manage loans
          </button>
          <button
            className="dash-button dash-button-primary"
            onClick={() => onNavigate("catalog")}
          >
            Go to Catalog
          </button>
        </div>
      )}

      {view !== "menu" && (
        <button className="app-back-button" onClick={() => setView("menu")}>
          ← Back
        </button>
      )}

      {view === "inventory" && <Inventory />}
      {view === "users" && <UserManagment />}
      {view === "reports" && <Reports />}
      {view === "loans" && (
        <LibrarianLoans user={user} focusLoanID={focusLoanID} />
      )}
    </div>
  );
}

export default LibrarianHome;
