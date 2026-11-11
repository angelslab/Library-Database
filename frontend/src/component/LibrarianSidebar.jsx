import "../styles/Sidebar.css";

function Icon({ name }) {
  const paths = {
    dash: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
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
    activity: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6" />
        <rect x="3" y="9" width="18" height="8" rx="2" />
        <rect x="7" y="14" width="10" height="7" />
      </>
    ),
    browse: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
    notif: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// Persistent navigation sidebar for the librarian.
function LibrarianSidebar({
  activeView,
  onSelect,
  onNavigate,
  onLogout,
  unreadCount = 0,
}) {
  const items = [
    { view: "menu", label: "Dashboard", icon: "dash" },
    { view: "inventory", label: "Catalog", icon: "inv" },
    { view: "users", label: "Manage Users", icon: "users" },
    { view: "loans", label: "Manage Loans", icon: "loans" },
    { view: "printing", label: "Print Payments", icon: "print" },
    { view: "activity", label: "Activity Log", icon: "activity" },
    { view: "reports", label: "Reports", icon: "reports" },
  ];

  return (
    <aside className="lib-sidebar">
      <div className="lib-brand">
        <span className="lib-mark" aria-hidden="true">
          📚
        </span>
        <span>The Library</span>
      </div>

      <p className="lib-role">LIBRARIAN</p>
      <p className="lib-menu-label">MANAGE</p>

      <nav className="lib-nav" aria-label="Librarian navigation">
        {items.map((it) => (
          <button
            key={it.view}
            type="button"
            className={`lib-nav-item ${activeView === it.view ? "active" : ""}`}
            onClick={() => onSelect(it.view)}
          >
            <span className="lib-nav-icon">
              <Icon name={it.icon} />
            </span>
            <span className="lib-nav-text">{it.label}</span>
          </button>
        ))}

        <div className="lib-sep" />

        <button
          type="button"
          className={`lib-nav-item ${activeView === "notification" ? "active" : ""}`}
          onClick={() => onNavigate("notification")}
        >
          <span className="lib-nav-icon">
            <Icon name="notif" />
          </span>
          <span className="lib-nav-text">Notifications</span>
          {unreadCount > 0 && (
            <span className="lib-nav-badge">{unreadCount}</span>
          )}
        </button>

        <button type="button" className="lib-nav-item" onClick={onLogout}>
          <span className="lib-nav-icon">
            <Icon name="logout" />
          </span>
          <span className="lib-nav-text">Log out</span>
        </button>
      </nav>
    </aside>
  );
}

export default LibrarianSidebar;
