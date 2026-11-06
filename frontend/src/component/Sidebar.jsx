import "../styles/Sidebar.css";

function Icon({ name }) {
  const paths = {
    browse: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
    loans: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
        <path d="M8 3v18" />
      </>
    ),
    holds: <path d="M6 3h12v18l-6-4-6 4z" />,
    notif: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
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

// Persistent navigation sidebar for student / faculty members.
function Sidebar({
  activePage,
  name,
  role,
  onNavigate,
  onLogout,
  unreadCount = 0,
}) {
  const items = [
    { key: "catalog", label: "Browse", icon: "browse" },
    { key: "loans", label: "My Loans", icon: "loans" },
    { key: "holds", label: "Holds", icon: "holds" },
    { key: "notification", label: "Notifications", icon: "notif", badge: unreadCount },
    { key: "profile", label: "Profile", icon: "profile" },
  ];

  return (
    <aside className="lib-sidebar">
      <div className="lib-brand">
        <span className="lib-mark" aria-hidden="true">📚</span>
        <span>The Library</span>
      </div>

      <p className="lib-menu-label">MENU</p>

      <nav className="lib-nav" aria-label="Main navigation">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`lib-nav-item ${activePage === it.key ? "active" : ""}`}
            onClick={() => onNavigate(it.key)}
          >
            <span className="lib-nav-icon">
              <Icon name={it.icon} />
            </span>
            <span className="lib-nav-text">{it.label}</span>
            {it.badge > 0 && <span className="lib-nav-badge">{it.badge}</span>}
          </button>
        ))}

        <div className="lib-sep" />

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

export default Sidebar;
