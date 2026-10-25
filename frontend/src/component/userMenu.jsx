import "../styles/UserMenu.css";

function UserMenu({ name, role, onNavigate, onLogout }) {
  const menuItems =
    role === "librarian"
      ? [
          {
            label: "Dashboard",
            page: "home",
          },
          {
            label: "Catalog",
            page: "catalog",
          },
        ]
      : [
          {
            label: "Home",
            page: "catalog",
          },
        ];

  return (
    <div className="user-menu-container">
      <div className="user-menu-header">
        <h2 className="user-menu-welcome">Welcome, {name || "User"}!</h2>

        <p className="user-menu-role">
          {role ? role.charAt(0).toUpperCase() + role.slice(1) : ""}
        </p>
      </div>

      <nav className="user-menu-grid" aria-label="Main navigation">
        {menuItems.map((item) => (
          <button
            key={item.page}
            type="button"
            className="user-menu-button"
            onClick={() => onNavigate(item.page)}
          >
            <span className="user-menu-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}

        <button
          type="button"
          className="user-menu-button"
          onClick={() => onNavigate("profile")}
        >
          <span className="user-menu-icon" aria-hidden="true"></span>
          <span>Profile</span>
        </button>

        <button
          type="button"
          className="user-menu-button"
          onClick={() => onNavigate("notification")}
        >
          <span className="user-menu-icon" aria-hidden="true"></span>
          <span>Notifications</span>
        </button>

        <button
          type="button"
          className="user-menu-button user-menu-logout"
          onClick={onLogout}
        >
          <span className="user-menu-icon" aria-hidden="true"></span>
          <span>Log Out</span>
        </button>
      </nav>
    </div>
  );
}

export default UserMenu;
