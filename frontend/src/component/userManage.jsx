import { useState, useEffect } from "react";
import UserDetail from "./UserDetail";

function UserManagment({ onToggleActive }) {
  const [keyword, setKeyword] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserID, setSelectedUserID] = useState(() => {
    try {
      const saved = localStorage.getItem("userDetailID");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  // remember which user is open so a reload keeps the detail page
  const openUser = (id) => {
    setSelectedUserID(id);
    try {
      if (id) localStorage.setItem("userDetailID", String(id));
      else localStorage.removeItem("userDetailID");
    } catch {
      // ignore: storage blocked
    }
  };

  // Load every user once when the page opens (empty q => backend returns all).
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/users?q=");
        const data = await res.json();
        if (res.ok) {
          setAllUsers(Array.isArray(data) ? data : []);
        } else {
          setError(data.error || "Could not load users.");
        }
      } catch (err) {
        setError("Cannot reach server: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Live client-side filter — no extra server call while typing.
  const term = keyword.trim().toLowerCase();
  const match = (u) => {
    if (!term) return true;
    const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    return (
      name.includes(term) ||
      String(u.email || "")
        .toLowerCase()
        .includes(term) ||
      String(u.id_number || "")
        .toLowerCase()
        .includes(term)
    );
  };

  const visible = allUsers.filter(match);
  const role = (u) => String(u.role || "").toLowerCase();
  const faculty = visible.filter((u) => role(u) === "faculty");
  const students = visible.filter((u) => role(u) === "student");

  // --- styles (match the dark navy / gold theme) ---
  const C = {
    card: "#10253e",
    border: "#263e59",
    field: "#0e1f36",
    fg: "#e6ecf2",
    muted: "#8295a9",
    gold: "#e5bf6d",
    blue: "#6fb0e8",
  };
  const panel = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    overflow: "hidden",
  };
  const panelHead = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: `1px solid ${C.border}`,
  };
  const panelTitle = {
    fontFamily: "Georgia, serif",
    fontSize: 18,
    fontWeight: 600,
  };
  const countBadge = {
    fontSize: 12,
    color: C.muted,
    background: "#193550",
    padding: "3px 10px",
    borderRadius: 999,
  };
  const th = {
    textAlign: "left",
    padding: "10px 16px",
    color: C.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: ".5px",
    borderBottom: `1px solid ${C.border}`,
  };
  const td = { padding: "12px 16px", borderBottom: `1px solid ${C.border}` };

  const handleToggleActive = (selectedUser) => {
    const isActive = Number(selectedUser.is_active) === 1;

    const action = isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${selectedUser.first_name} ${selectedUser.last_name}?`,
      )
    ) {
      return;
    }

    onToggleActive?.(selectedUser);
  };

  const UserTable = ({ rows, kind }) => {
    const deptLabel = kind === "faculty" ? "Department" : "Major";
    const title = kind === "faculty" ? "Faculty" : "Students";
    return (
      <div style={panel}>
        <div style={panelHead}>
          <span
            style={{
              ...panelTitle,
              color: kind === "faculty" ? C.gold : C.blue,
            }}
          >
            {title}
          </span>
          <span style={countBadge}>{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <p style={{ padding: "18px 16px", color: C.muted, margin: 0 }}>
            {term ? "No matches." : "None yet."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 640,
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Name</th>
                <th style={th}>{deptLabel}</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.userID}
                  onClick={() => openUser(u.userID)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ ...td, color: C.muted }}>{u.id_number}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>
                      {u.first_name} {u.last_name}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12 }}>
                      {u.email}
                    </div>
                  </td>
                  <td style={td}>{u.major_or_department}</td>
                  <td style={td}>
                    <span>
                      {Number(u.is_active) === 1 ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(u);
                      }}
                    >
                      {Number(u.is_active) === 1 ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    );
  };

  if (selectedUserID !== null) {
    return (
      <div>
        <button onClick={() => openUser(null)}>← Back to users</button>
        <UserDetail userID={selectedUserID} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 26,
          margin: "0 0 16px",
        }}
      >
        Manage Users
      </h2>

      <input
        type="text"
        placeholder="Search by name, ID, or email..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "11px 14px",
          background: C.field,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          color: C.fg,
          fontSize: 14,
          marginBottom: 20,
        }}
      />

      {loading && <p style={{ color: C.muted }}>Loading users…</p>}
      {error && <p style={{ color: "#f3a0a0" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            <UserTable rows={faculty} kind="faculty" />
            <UserTable rows={students} kind="student" />
          </div>
        </>
      )}
    </div>
  );
}

export default UserManagment;
