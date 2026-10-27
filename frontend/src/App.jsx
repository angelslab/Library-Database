import { useCallback, useEffect, useState } from "react";
import Profile from "./pages/Profile";
import Notification from "./pages/notification";
import Login from "./pages/Login";
import StudentHome from "./pages/studentHome";
import FacultyHome from "./pages/facultyHome";
import LibrarianHome from "./pages/librarianhome";
import UserMenu from "./component/userMenu";
import Catalog from "./pages/Catalog";
import ItemDetails from "./pages/ItemDetails";
import AddItemForm from "./component/AddItemForm";
import EditItemForm from "./component/EditItemForm";
import "./App.css";
import Loans from "./pages/Loans";
import ConfirmBorrowModal from "./component/ConfirmBorrowModal";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("catalog");
  const [selectedItemID, setSelectedItemID] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState("");
  const [borrowItem, setBorrowItem] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [focusLoanID, setFocusLoanID] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  function goTo(nextPage) {
    setMessage("");
    setFocusLoanID(null);
    setPage(nextPage);
  }

  // librarian clicked "Review return" on a notification: open the Loans page on that loan
  function handleReviewLoan(loanID) {
    setMessage("");
    setFocusLoanID(loanID);
    setPage("librarianLoans");
  }

  // number shown on the menu badge
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
    // the badge just keeps its old number if the server can't be reached
    }
  }, [currentUser]);

  // check on login, on every page change, and every 30 seconds
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
    goTo("itemDetails");
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

    // opens the confirm popup, the loan is only created when the user confirms
    setBorrowItem(item);
  }

  function handleBorrowed(result) {
    setBorrowItem(null);
    setMessage(result.message);

    // makes the catalog / item details reload so the available copies are up to date
    setCatalogVersion((version) => version + 1);
  }

  function handleLogin(user) {
    setCurrentUser(user);
    setUnreadCount(0);
    goTo(user.role === "librarian" ? "home" : "catalog");
  }

  function handleLogout() {
    setCurrentUser(null);
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
      setMessage(error.message || "Failed to delete item.");
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

      {currentUser && page === "profile" && (
        <div className="profile-page">
          <div className="profile-page-menu">{userMenu}</div>
          <Profile user={currentUser} />
        </div>
      )}

      {currentUser && page === "notification" && (
        <div className="profile-page">
          <div className="profile-page-menu">{userMenu}</div>
          <main>
            <Notification
              user={currentUser}
              onReviewLoan={handleReviewLoan}
              onChanged={refreshUnread}
            />
          </main>
        </div>
      )}

      {currentUser && page === "loans" && currentUser.role !== "librarian" && (
        <div className="library-layout">
          <aside className="library-nav">{userMenu}</aside>

          <main className="library-content">
            <Loans user={currentUser} onBrowse={() => goTo("catalog")} />
          </main>
        </div>
      )}

      {currentUser && page === "home" && currentUser.role === "student" && (
        <StudentHome user={currentUser} onSelectItem={handleSelectItems} />
      )}

      {currentUser && page === "home" && currentUser.role === "faculty" && (
        <FacultyHome user={currentUser} />
      )}

      {currentUser && currentUser.role === "librarian" && (page === "home" || page === "librarianLoans") && (
          <div>
            <div className="profile-page-menu">{userMenu}</div>
            <LibrarianHome
              key={`${page}-${focusLoanID}`}
              user={currentUser}
              onNavigate={goTo}
              initialView={page === "librarianLoans" ? "loans" : "menu"}
              focusLoanID={focusLoanID}
            />
          </div>
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
          <aside className="library-nav">
            {currentUser ? (
              userMenu
            ) : (
              <button
                className="user-menu-button"
                type="button"
                onClick={() => goTo("login")}
              >
                Log In
              </button>
            )}
          </aside>

          <main className="library-content">
            <Catalog
              user={currentUser}
              onSelectItem={handleSelectItems}
              onBorrow={handleBorrow}
              onEdit={handleEditItem}
              onAddItem={() => goTo("addItems")}
              onDelete={handleDeleteItem}
              refreshKey={catalogVersion}
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
      </div>
  );
}

export default App;
