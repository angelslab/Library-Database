import { useEffect, useRef, useState } from "react";
import "../styles/UserMenu.css";

function UserMenu({ name, role, onNavigate, onLogout, unreadCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

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
          {
            label: "Loans",
            page: "librarianLoans",
          },
        ]
      : [
          {
            label: "Home",
            page: "catalog",
          },
          {
            label: "Loans",
            page: "loans",
          },
        ];

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeMenuOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function closeMenuOnEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isOpen]);

  function navigateTo(page) {
    setIsOpen(false);
    onNavigate(page);
  }

  function logOut() {
    setIsOpen(false);
    onLogout();
  }

  return (
    <div className="user-menu-container" ref={menuRef}>
      <div className="user-menu-header">
        <button
          type="button"
          className="user-menu-welcome"
          aria-expanded={isOpen}
          aria-controls="user-navigation-menu"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span>Welcome, {name || "User"}!</span>
          {unreadCount > 0 && !isOpen && (<span className="user-menu-badge">{unreadCount}</span>)}
          <span className="user-menu-chevron" aria-hidden="true">
            {isOpen ? "▴" : "▾"}
          </span>
        </button>
      </div>

      <nav
        id="user-navigation-menu"
        className="user-menu-grid"
        aria-label="Main navigation"
        hidden={!isOpen}
      >
        {menuItems.map((item) => (
          <button
            key={item.page}
            type="button"
            className="user-menu-button"
            onClick={() => navigateTo(item.page)}
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
          onClick={() => navigateTo("profile")}
        >
          <span className="user-menu-icon" aria-hidden="true"></span>
          <span>Profile</span>
        </button>

        <button
          type="button"
          className="user-menu-button"
          onClick={() => navigateTo("notification")}
        >
          <span className="user-menu-icon" aria-hidden="true"></span>
          <span>Notifications</span>
          {unreadCount > 0 && <span className="user-menu-badge">{unreadCount}</span>}
        </button>

        <button
          type="button"
          className="user-menu-button user-menu-logout"
          onClick={logOut}
        >
          <span className="user-menu-icon" aria-hidden="true"></span>
          <span>Log Out</span>
        </button>
      </nav>
    </div>
  );
}

export default UserMenu;
