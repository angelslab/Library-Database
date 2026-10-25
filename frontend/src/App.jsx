import { useState } from "react";
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

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("catalog");
  const [selectedItemID, setSelectedItemID] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState("");

  function goTo(nextPage) {
    setMessage("");
    setPage(nextPage);
  }

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

    setMessage(`Borrow "${item.title}": loans API not connected yet.`);
  }

  function handleLogin(user) {
    setCurrentUser(user);
    goTo(user.role === "librarian" ? "home" : "catalog");
  }

  function handleLogout() {
    setCurrentUser(null);
    goTo("catalog");
  }

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

      {currentUser && page === "profile" && <Profile user={currentUser} />}

      {currentUser && page === "notification" && (
        <Notification user={currentUser} />
      )}

      {currentUser && page === "home" && currentUser.role === "student" && (
        <StudentHome user={currentUser} onSelectItem={handleSelectItems} />
      )}

      {currentUser && page === "home" && currentUser.role === "faculty" && (
        <FacultyHome user={currentUser} />
      )}

      {currentUser && page === "home" && currentUser.role === "librarian" && (
        <LibrarianHome user={currentUser} onNavigate={goTo} />
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
              <UserMenu
                name={currentUser.first_name}
                role={currentUser.role}
                onNavigate={goTo}
                onLogout={handleLogout}
              />
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
            />
          </main>
        </div>
      )}

      {page === "itemDetails" && (
        <ItemDetails
          itemID={selectedItemID}
          user={currentUser}
          onBack={() => goTo("catalog")}
        />
      )}

      {page === "editItem" && selectedItem && (
        <EditItemForm
          item={selectedItem}
          onBack={() => goTo("catalog")}
          onItemUpdated={() => goTo("catalog")}
        />
      )}
    </div>
  );
}

export default App;
