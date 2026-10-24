import { useState } from "react";
import Inventory from "../component/InventorySearch";
import UserManagment from "../component/userManage";

function LibrarianHome({ user, onNavigate }) {
  const [view, setView] = useState("menu");

  return (
    <div>
      <h2>Librarian Dashboard</h2>

      {view === "menu" && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => setView("inventory")}>Manage Inventory</button>
          <button onClick={() => setView("users")}>Manage users</button>
          <button onClick={() => onNavigate("catalog")}>Go to Catalog</button>
        </div>
      )}

      {view !== "menu" && (
        <button onClick={() => setView("menu")}>← Back</button>
      )}

      {view === "inventory" && <Inventory />}
      {view === "users" && <UserManagment />}
    </div>
  );
}

export default LibrarianHome;
