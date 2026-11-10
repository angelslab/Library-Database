import "../styles/TopBar.css";

// Top bar for student / faculty pages: optional left slot (e.g. search)
// plus the user chip and a notification bell on the right.
function TopBar({ name, unreadCount = 0, onBell, children }) {
  return (
    <div className="user-topbar">
      <div className="user-topbar-slot">{children}</div>

      {name && (
        <div className="user-chip">
          <span className="uc-avatar" aria-hidden="true" />
          <span className="uc-name">{name}</span>
          <button
            type="button"
            className="uc-bell"
            onClick={onBell}
            aria-label="Notifications"
          >
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
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadCount > 0 && <span className="uc-dot" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default TopBar;
