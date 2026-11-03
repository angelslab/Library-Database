import { useState } from "react";
import Inventory from "../component/InventorySearch";
import UserManagment from "../component/userManage";
import Reports from "../component/reportsPage";
import LibrarianLoans from "../component/LibrarianLoans";
import "../styles/Librarian.css";

// sub-views that are safe to restore after a reload
const KEEP_VIEWS = ["inventory", "users", "reports", "loans"];

function LibrarianHome({
  user,
  onNavigate,
  initialView = "menu",
  focusLoanID = null,
}) {
  const [view, setView] = useState(() => {
    // a deep-link (e.g. "Review return" opens loans) always wins
    if (initialView !== "menu") return initialView;
    // otherwise, on a plain reload, stay on the sub-view we were last on
    try {
      const saved = localStorage.getItem("librarianView");
      return KEEP_VIEWS.includes(saved) ? saved : "menu";
    } catch {
      return "menu";
    }
  });

  // remember the current sub-view so a reload keeps it
  function go(next) {
    setView(next);
    try {
      localStorage.setItem("librarianView", next);
      // entering a section from the menu starts at its top, not a deep view
      localStorage.removeItem("reportView");
    } catch {
      // ignore: storage blocked
    }
  }

  return (
    <div className="librarian-dashboard">
      <h2>Librarian Dashboard</h2>

      {view === "menu" && (
        <div className="dash-menu">
          <button className="dash-button" onClick={() => go("inventory")}>
            Manage Inventory
          </button>
          <button className="dash-button" onClick={() => go("users")}>
            Manage users
          </button>
          <button className="dash-button" onClick={() => go("reports")}>
            Reports
          </button>
          <button className="dash-button" onClick={() => go("loans")}>
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
        <button className="app-back-button" onClick={() => go("menu")}>
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
