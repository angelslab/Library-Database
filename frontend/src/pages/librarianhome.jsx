import { useState, useEffect } from "react";
import UserManagment from "../component/userManage";
import Reports from "../component/reportsPage";
import ActivityLog from "../component/ActivityLog";
import LibrarianLoans from "../component/LibrarianLoans";
import PrintPayments from "../component/PrintPayments";
import LibrarianSidebar from "../component/LibrarianSidebar";
import TopBar from "../component/TopBar";
import Donut from "../component/Donut";
import "../styles/Librarian.css";
import AlertDialog from "../component/AlertDialog";
import API_URL from "../api";

const API = "http://localhost:3000";

// sub-views that are safe to restore after a reload
// (inventory now lives on the catalog page, not as a view here)
const KEEP_VIEWS = ["users", "reports", "loans", "activity", "printing"];

// --- small inline icons for the quick-action cards ---
function ActionIcon({ name }) {
  const paths = {
    inv: (
      <>
        <path d="M21 8l-9-5-9 5 9 5 9-5z" />
        <path d="M3 8v8l9 5 9-5V8" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
        <circle cx="17" cy="8" r="2.6" />
        <path d="M15.5 14.4c3 .3 5 2 5 5" />
      </>
    ),
    loans: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
        <path d="M8 3v18" />
      </>
    ),
    reports: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="6" />
        <rect x="12" y="7" width="3" height="10" />
        <rect x="17" y="13" width="3" height="4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function LibrarianHome({
  user,
  onNavigate,
  onLogout,
  unreadCount = 0,
  initialView = "menu",
  focusLoanID = null,
}) {
  const [view, setView] = useState(() => {
    if (initialView !== "menu") return initialView;
    try {
      const saved = localStorage.getItem("librarianView");
      return KEEP_VIEWS.includes(saved) ? saved : "menu";
    } catch {
      return "menu";
    }
  });

  const [stats, setStats] = useState(null);
  const [userStatusMessage, setUserStatusMessage] = useState("");

  // dashboard numbers
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const [itemsRes, loansRes] = await Promise.all([
          fetch(`${API}/items`),
          fetch(`${API}/api/loans/all?userID=${user.userID}`),
        ]);
        const items = await itemsRes.json();
        const loansData = await loansRes.json();
        const loans = Array.isArray(loansData.loans) ? loansData.loans : [];
        const today = new Date().toISOString().slice(0, 10);
        const active = loans.filter((l) => !l.returned_date).length;
        const pending = loans.filter(
          (l) => !l.returned_date && l.status === "return_requested",
        ).length;
        const overdue = loans.filter(
          (l) =>
            !l.returned_date &&
            l.due_date &&
            String(l.due_date).slice(0, 10) < today,
        ).length;
        // active loans by role
        const byRole = {};
        loans
          .filter((l) => !l.returned_date)
          .forEach((l) => {
            const r = String(l.role || "other").toLowerCase();
            byRole[r] = (byRole[r] || 0) + 1;
          });
        // items by type
        const byType = {};
        (Array.isArray(items) ? items : []).forEach((it) => {
          const t = it.item_type || "Other";
          byType[t] = (byType[t] || 0) + 1;
        });

        if (!cancelled) {
          setStats({
            totalItems: Array.isArray(items) ? items.length : 0,
            active,
            pending,
            overdue,
            byRole,
            byType,
          });
        }
      } catch {
        if (!cancelled) setStats(null);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [user.userID]);

  // remember the current sub-view so a reload keeps it
  function go(next) {
    setView(next);
    try {
      localStorage.setItem("librarianView", next);
      localStorage.removeItem("reportView");
      localStorage.removeItem("userDetailID");
    } catch {
      // ignore: storage blocked
    }
  }

  const actions = [
    {
      view: "inventory",
      icon: "inv",
      title: "Manage Inventory",
      desc: "Add, edit, and track copies of books, media, and devices.",
    },
    {
      view: "users",
      icon: "users",
      title: "Manage Users",
      desc: "View and manage student and faculty accounts.",
    },
    {
      view: "loans",
      icon: "loans",
      title: "Manage Loans",
      desc: "Approve borrow and return requests.",
    },
    {
      view: "reports",
      icon: "reports",
      title: "Reports",
      desc: "Fines, loans by role and item type, and inventory circulation.",
    },
  ];

  const handleToggleUserStatus = async (user) => {
    const isActive = Number(user.is_active) === 1;
    const newStatus = isActive ? 0 : 1;

    try {
      const response = await fetch(`${API}/api/users/${user.userID}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user status.");
      }

      window.location.reload();
    } catch (error) {
      console.error("Error updating user status:", error);
      setUserStatusMessage(error.message || "Failed to update user status.");
    }
  };

  return (
    <div className="library-layout">
      <LibrarianSidebar
        activeView={view}
        onSelect={(t) => (t === "inventory" ? onNavigate("catalog") : go(t))}
        onNavigate={onNavigate}
        onLogout={onLogout}
        unreadCount={unreadCount}
      />

      <main className="library-content">
        <TopBar
          name={user.first_name}
          unreadCount={unreadCount}
          onBell={() => onNavigate("notification")}
        />

        {view === "menu" && (
          <div className="dash">
            <h2 className="dash-h">Dashboard</h2>
            <p className="dash-sub">
              Welcome back — here's what's happening in the library today.
            </p>

            <div className="dash-stats">
              <div className="dash-stat">
                <span className="dash-stat-label">Total items</span>
                <span className="dash-stat-value">
                  {stats ? stats.totalItems : "—"}
                </span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat-label">Active loans</span>
                <span className="dash-stat-value green">
                  {stats ? stats.active : "—"}
                </span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat-label">Pending returns</span>
                <span className="dash-stat-value gold">
                  {stats ? stats.pending : "—"}
                </span>
              </div>
              <div className="dash-stat">
                <span className="dash-stat-label">Overdue</span>
                <span className="dash-stat-value red">
                  {stats ? stats.overdue : "—"}
                </span>
              </div>
            </div>

            <h3 className="dash-h3">Overview</h3>
            <div className="dash-charts">
              <div className="dash-chart">
                <p className="dash-chart-title">Active loans by role</p>
                {stats ? (
                  <Donut
                    total={stats.active}
                    totalLabel="loans"
                    segments={[
                      {
                        label: "Students",
                        value: stats.byRole.student || 0,
                        color: "#4075aa",
                      },
                      {
                        label: "Faculty",
                        value: stats.byRole.faculty || 0,
                        color: "#e5bf6d",
                      },
                    ]}
                  />
                ) : (
                  <p className="donut-empty">Loading…</p>
                )}
              </div>
              <div className="dash-chart">
                <p className="dash-chart-title">Items by type</p>
                {stats ? (
                  <Donut
                    total={stats.totalItems}
                    totalLabel="items"
                    segments={[
                      {
                        label: "Books",
                        value: stats.byType.Book || 0,
                        color: "#4075aa",
                      },
                      {
                        label: "Media",
                        value: stats.byType.Media || 0,
                        color: "#e5bf6d",
                      },
                      {
                        label: "Devices",
                        value: stats.byType.Device || 0,
                        color: "#5fbf8a",
                      },
                    ]}
                  />
                ) : (
                  <p className="donut-empty">Loading…</p>
                )}
              </div>
            </div>

            <h3 className="dash-h3">Quick actions</h3>
            <div className="dash-actions">
              {actions.map((a) => (
                <button
                  key={a.view}
                  type="button"
                  className="dash-action"
                  onClick={() =>
                    a.view === "inventory" ? onNavigate("catalog") : go(a.view)
                  }
                >
                  <span className="dash-action-icon">
                    <ActionIcon name={a.icon} />
                  </span>
                  <span className="dash-action-body">
                    <span className="dash-action-title">{a.title}</span>
                    <span className="dash-action-desc">{a.desc}</span>
                    <span className="dash-action-go">Open →</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {view === "users" && (
          <UserManagment
            onToggleActive={handleToggleUserStatus}
            librarianID={user.userID}
          />
        )}
        {view === "reports" && <Reports />}
        {view === "activity" && <ActivityLog />}
        {view === "printing" && <PrintPayments user={user} />}
        {view === "loans" && (
          <LibrarianLoans user={user} focusLoanID={focusLoanID} />
        )}
      </main>
      {userStatusMessage && (
        <AlertDialog
          title="Unable to Deactivate User"
          message={userStatusMessage}
          onClose={() => setUserStatusMessage("")}
        />
      )}
    </div>
  );
}

export default LibrarianHome;
