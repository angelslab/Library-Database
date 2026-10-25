import { useState } from "react";
import Inventory from "../component/InventorySearch";
import UserManagment from "../component/userManage";

function LibrarianHome({ user, onNavigate }) {
  const [view, setView] = useState("menu");

  return (
    <div>
      <h2>Librarian Dashboard</h2>

<<<<<<< HEAD
      {view === 'menu' && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => setView('inventory')}>Manage Inventory</button>
          <button onClick={() => setView('users')}>Manage users</button>
          <button onClick={() => setView('reports')}>Reports</button>
=======
      {view === "menu" && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => setView("inventory")}>Manage Inventory</button>
          <button onClick={() => setView("users")}>Manage users</button>
          <button onClick={() => onNavigate("catalog")}>Go to Catalog</button>
>>>>>>> e9204f82e99e51aa140e0a753aee377cab9c98b0
        </div>
      )}

      {view !== "menu" && (
        <button onClick={() => setView("menu")}>← Back</button>
      )}

<<<<<<< HEAD
      {view === 'inventory' && <Inventory />}
      {view === 'users' && <UserManagment />}
      {view === 'reports' && 'coming soon'}
=======
      {view === "inventory" && <Inventory />}
      {view === "users" && <UserManagment />}
>>>>>>> e9204f82e99e51aa140e0a753aee377cab9c98b0
    </div>
  );
}

export default LibrarianHome;
