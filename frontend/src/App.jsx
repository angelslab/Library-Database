import { useCallback, useEffect, useState } from "react";
import Profile from "./pages/Profile";
import Notification from "./pages/notification";
import Login from "./pages/Login";
import StudentHome from "./pages/studentHome";
import FacultyHome from "./pages/facultyHome";
import LibrarianHome from "./pages/librarianhome";
import UserMenu from "./component/userMenu";
import Sidebar from "./component/Sidebar";
import TopBar from "./component/TopBar";
import LibrarianSidebar from "./component/LibrarianSidebar";
import Catalog from "./pages/Catalog";
import ItemDetails from "./pages/ItemDetails";
import AddItemForm from "./component/AddItemForm";
import EditItemForm from "./component/EditItemForm";
import "./App.css";
import Loans from "./pages/Loans";
import Holds from "./pages/Holds";
import Fines from "./pages/Fines";
import ConfirmBorrowModal from "./component/ConfirmBorrowModal";
import ConfirmCancelHoldModal from "./component/ConfirmCancelHoldModal";
import AlertDialog from "./component/AlertDialog";

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState(() => {
    try {
      const saved = localStorage.getItem("page");
      const keep = [
        "catalog",
        "home",
        "loans",
        "holds",
        "profile",
        "notification",
        "librarianLoans",
        "itemDetails",
      ];
      // need item to restore itemDetails
      if (saved === "itemDetails" && !localStorage.getItem("itemID")) {
        return "catalog";
      }
      return keep.includes(saved) ? saved : "catalog";
    } catch {
      return "catalog";
    }
  });
  const [selectedItemID, setSelectedItemID] = useState(() => {
    try {
      const saved = localStorage.getItem("itemID");
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState("");
  const [borrowItem, setBorrowItem] = useState(null);
  const [cancelHold, setCancelHold] = useState(null); // { hold, resolve }
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myHolds, setMyHolds] = useState([]);
  const [deleteError, setDeleteError] = useState("");

  function goTo(nextPage, itemID = null) {
    setMessage("");
    setPage(nextPage);
    try {
      localStorage.setItem("page", nextPage);
      // save item for reload
      if (nextPage === "itemDetails" && itemID != null) {
        localStorage.setItem("itemID", String(itemID));
      }
    } catch {
      // ignore
    }
    try {
      window.history.pushState({ page: nextPage, itemID }, "");
    } catch {
      // ignore
    }
  }

  // browser back/forward
  useEffect(() => {
    // save starting page
    try {
      window.history.replaceState({ page, itemID: selectedItemID }, "");
    } catch {
      // ignore
    }

    function onPopState(event) {
      const state = event.state || { page: "catalog", itemID: null };
      const keep = [
        "catalog",
        "home",
        "loans",
        "holds",
        "profile",
        "notification",
        "librarianLoans",
        "itemDetails",
      ];
      const target = keep.includes(state.page) ? state.page : "catalog";

      if (target === "itemDetails" && state.itemID) {
        setSelectedItemID(state.itemID);
      }

      setMessage("");
      setPage(target);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scroll to message
  useEffect(() => {
    if (message) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [message]);

  // user's active holds
  const refreshHolds = useCallback(async () => {
    if (!currentUser || currentUser.role === "librarian") return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/holds/user/${currentUser.userID}`,
      );
      const data = await response.json();

      if (response.ok) {
        setMyHolds(data.active);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // reload holds
  useEffect(() => {
    const first = setTimeout(refreshHolds, 0);

    return () => clearTimeout(first);
  }, [refreshHolds, catalogVersion]);

  const holdsByItem = {};
  for (const hold of myHolds) {
    holdsByItem[hold.itemID] = hold;
  }

  // unread count
  const refreshUnread = useCallback(async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/notifications/${currentUser.userID}?count=1`,
      );
      const data = await response.json();

      if (response.ok) {
        setUnreadCount(data.unread);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // refresh every 30s
  useEffect(() => {
    if (!currentUser) return undefined;

    const first = setTimeout(refreshUnread, 0);
    const timer = setInterval(refreshUnread, 30000);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [currentUser, page, refreshUnread]);

  function handleSelectItems(itemID) {
    setSelectedItemID(itemID);
    goTo("itemDetails", itemID);
  }

  function handleEditItem(item) {
    setSelectedItem(item);
    goTo("editItem");
  }

  function handleBorrow(item) {
    if (!currentUser) {
      setMessage(`Please log in to borrow "${item.title}".`);
      setPage("login");
      return;
    }

    if (currentUser.role === "librarian") {
      setMessage("Librarian accounts can't borrow items.");
      return;
    }

    // open borrow popup
    setBorrowItem(item);
  }

  // place hold
  async function handlePlaceHold(item) {
    if (!currentUser) {
      setMessage(`Please log in to place a hold on "${item.title}".`);
      setPage("login");
      return;
    }

    if (currentUser.role === "librarian") {
      setMessage("Librarian accounts can't place holds.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/holds/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userID: currentUser.userID,
          itemID: item.itemID,
        }),
      });
      const data = await response.json();

      setMessage(response.ok ? data.message : data.error);

      if (response.ok) {
        await refreshHolds();
      }
    } catch {
      setMessage("Could not reach the server. Try again.");
    }
  }

  // cancel hold (returns true if cancelled)
  function handleCancelHold(hold) {
    return new Promise((resolve) => {
      setCancelHold({ hold, resolve });
    });
  }

  function closeCancelHold() {
    cancelHold?.resolve(false);
    setCancelHold(null);
  }

  async function handleHoldCancelled(data) {
    cancelHold?.resolve(true);
    setCancelHold(null);
    setMessage(data.message);
    await refreshHolds();
  }

  function handleBorrowed(result) {
    setBorrowItem(null);
    setMessage(result.message);

    // reload catalog
    setCatalogVersion((version) => version + 1);
  }

  function handleLogin(user) {
    localStorage.setItem("token", user.token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.removeItem("librarianView");
    setCurrentUser(user);
    setUnreadCount(0);
    goTo(user.role === "librarian" ? "home" : "catalog");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("librarianView");
    setCurrentUser(null);
    setMyHolds([]);
    goTo("catalog");
  }

  const handleDeleteItem = async (item) => {
    const itemType = item.item_type?.toLowerCase();

    const endpoints = {
      book: "books",
      media: "media",
      device: "device",
    };

    const endpoint = endpoints[itemType];

    if (!endpoint) {
      setMessage("Unable to determine the item type");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/${endpoint}/${item.itemID}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete item.");
      }
      setMessage("Item deleted successfully.");

      window.location.reload();
    } catch (error) {
      console.error("Error deleting item:", error);
      setDeleteError(error.message || "Failed to delete item.");
    }
  };

  const userMenu = currentUser && (
    <UserMenu
      name={currentUser.first_name}
      role={currentUser.role}
      onNavigate={goTo}
      onLogout={handleLogout}
      unreadCount={unreadCount}
    />
  );

  // sidebar for student/faculty
  const sidebar = currentUser && currentUser.role !== "librarian" && (
    <Sidebar
      activePage={page}
      onNavigate={goTo}
      onLogout={handleLogout}
      unreadCount={unreadCount}
    />
  );

  // top bar
  const topBar = currentUser && currentUser.role !== "librarian" && (
    <TopBar
      name={currentUser.first_name}
      unreadCount={unreadCount}
      onBell={() => goTo("notification")}
    />
  );

  // librarian sidebar on catalog page
  const librarianCatalogNav = currentUser &&
    currentUser.role === "librarian" && (
      <LibrarianSidebar
        activeView="inventory"
        onSelect={(target) => {
          if (target === "inventory") return;
          try {
            localStorage.setItem("librarianView", target);
          } catch {
            // ignore: storage blocked
          }
          goTo("home");
        }}
        onNavigate={goTo}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />
    );

  if (page === "login") {
    return (
      <Login
        onLogin={handleLogin}
        message={message}
        onBack={() => goTo("catalog")}
      />
    );
  }

  return (
    <div className="app-container">
      {message && <p className="app-message">{message}</p>}

      {currentUser &&
        page === "profile" &&
        currentUser.role !== "librarian" && (
          <div className="library-layout">
            {sidebar}
            <main className="library-content">
              {topBar}
              <Profile user={currentUser} />
            </main>
          </div>
        )}

      {currentUser &&
        page === "profile" &&
        currentUser.role === "librarian" && (
          <div className="profile-page">
            <div className="profile-page-menu">{userMenu}</div>
            <Profile user={currentUser} />
          </div>
        )}

      {currentUser &&
        page === "notification" &&
        currentUser.role !== "librarian" && (
          <div className="library-layout">
            {sidebar}
            <main className="library-content">
              {topBar}
              <Notification
                user={currentUser}
                onChanged={refreshUnread}
              />
            </main>
          </div>
        )}

      {currentUser &&
        page === "notification" &&
        currentUser.role === "librarian" && (
          <div className="library-layout">
            <LibrarianSidebar
              activeView="notification"
              onSelect={(target) => {
                if (target === "inventory") {
                  goTo("catalog");
                  return;
                }
                try {
                  localStorage.setItem("librarianView", target);
                } catch {
                  // ignore: storage blocked
                }
                goTo("home");
              }}
              onNavigate={goTo}
              onLogout={handleLogout}
              unreadCount={unreadCount}
            />
            <main className="library-content">
              <TopBar
                name={currentUser.first_name}
                unreadCount={unreadCount}
                onBell={() => goTo("notification")}
              />
              <Notification
                user={currentUser}
                onChanged={refreshUnread}
              />
            </main>
          </div>
        )}

      {currentUser && page === "loans" && currentUser.role !== "librarian" && (
        <div className="library-layout">
          {sidebar}

          <main className="library-content">
            {topBar}
            <Loans user={currentUser} onBrowse={() => goTo("catalog")} />

            {/* fines */}
            <Fines user={currentUser} />
          </main>
        </div>
      )}

      {currentUser && page === "holds" && currentUser.role !== "librarian" && (
        <div className="library-layout">
          {sidebar}

          <main className="library-content">
            {topBar}
            <Holds
              user={currentUser}
              onBrowse={() => goTo("catalog")}
              onBorrow={handleBorrow}
              onCancelHold={handleCancelHold}
              refreshKey={catalogVersion}
            />
          </main>
        </div>
      )}

      {currentUser && page === "home" && currentUser.role === "student" && (
        <StudentHome user={currentUser} onSelectItem={handleSelectItems} />
      )}

      {currentUser && page === "home" && currentUser.role === "faculty" && (
        <FacultyHome user={currentUser} />
      )}

      {currentUser &&
        currentUser.role === "librarian" &&
        (page === "home" || page === "librarianLoans") && (
          <LibrarianHome
            key={page}
            user={currentUser}
            onNavigate={goTo}
            onLogout={handleLogout}
            unreadCount={unreadCount}
            initialView={page === "librarianLoans" ? "loans" : "menu"}
          />
        )}

      {currentUser &&
        currentUser.role === "librarian" &&
        page === "addItems" && (
          <div className="page-container">
            <button
              className="back-button"
              type="button"
              onClick={() => goTo("catalog")}
            >
              Back to Catalog
            </button>

            <AddItemForm />
          </div>
        )}

      {page === "catalog" && (
        <div className="library-layout">
          {currentUser ? (
            currentUser.role === "librarian" ? (
              librarianCatalogNav
            ) : (
              sidebar
            )
          ) : (
            <aside className="library-nav">
              <button
                className="user-menu-button"
                type="button"
                onClick={() => goTo("login")}
              >
                Log In
              </button>
            </aside>
          )}

          <main className="library-content">
            <Catalog
              user={currentUser}
              onSelectItem={handleSelectItems}
              onBorrow={handleBorrow}
              onPlaceHold={
                currentUser?.role === "librarian" ? undefined : handlePlaceHold
              }
              onCancelHold={handleCancelHold}
              holdsByItem={holdsByItem}
              onOpenHolds={
                currentUser && currentUser.role !== "librarian"
                  ? () => goTo("holds")
                  : undefined
              }
              onEdit={handleEditItem}
              onAddItem={() => goTo("addItems")}
              onDelete={handleDeleteItem}
              refreshKey={catalogVersion}
              unreadCount={unreadCount}
              onOpenNotifications={() => goTo("notification")}
            />
          </main>
        </div>
      )}

      {page === "itemDetails" && (
        <ItemDetails
          itemID={selectedItemID}
          user={currentUser}
          onBack={() => goTo("catalog")}
          onBorrow={handleBorrow}
          onPlaceHold={
            currentUser?.role === "librarian" ? undefined : handlePlaceHold
          }
          onCancelHold={handleCancelHold}
          hold={holdsByItem[selectedItemID]}
          refreshKey={catalogVersion}
        />
      )}

      {page === "editItem" && selectedItem && (
        <EditItemForm
          item={selectedItem}
          onBack={() => goTo("catalog")}
          onItemUpdated={() => goTo("catalog")}
        />
      )}

      {currentUser && borrowItem && (
        <ConfirmBorrowModal
          user={currentUser}
          item={borrowItem}
          onClose={() => setBorrowItem(null)}
          onBorrowed={handleBorrowed}
        />
      )}

      {currentUser && cancelHold && (
        <ConfirmCancelHoldModal
          key={cancelHold.hold.holdID}
          user={currentUser}
          hold={cancelHold.hold}
          onClose={closeCancelHold}
          onCancelled={handleHoldCancelled}
        />
      )}

      {deleteError && (
        <AlertDialog
          title="Unable to Delete Item"
          message={deleteError}
          onClose={() => setDeleteError("")}
        />
      )}
    </div>
  );
}

export default App;
