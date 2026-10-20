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

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("catalog"); // catalog is the homepage for everyone
  const [selectedItemID, setSelectedItemID] = useState(null);
  const [message, setMessage] = useState("");

  // change page and clear any old message
  function goTo(nextPage) {
    setMessage("");
    setPage(nextPage);
  }

  function handleSelectItems(itemID) {
    setSelectedItemID(itemID);
    goTo("itemDetails");
  }

  // Borrow button: guests must log in first
  function handleBorrow(item) {
    if (!currentUser) {
      setMessage(`Please log in to borrow "${item.title}".`);
      setPage("login");
      return;
    }

    // TODO (loans): call POST /api/loans with
    // { userID: currentUser.userID, itemID: item.itemID }
    setMessage(`Borrow "${item.title}": loans API not connected yet.`);
  }

  function handleLogin(user) {
    setCurrentUser(user);
    goTo("catalog");
  }

  const handleLogout = () => {
    setCurrentUser(null);
    goTo("catalog");
  };

  // login page (only when the user asks for it or tries to borrow)
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
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {currentUser ? (
          <UserMenu
            name={currentUser.first_name}
            onNavigate={goTo}
            onLogout={handleLogout}
          />
        ) : (
          <h1 style={{ margin: 0, fontSize: 20 }}>Library</h1>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          {currentUser ? (
            <span>Role: {currentUser.role}</span>
          ) : (
            <button onClick={() => goTo("login")}>Log in</button>
          )}
        </div>
      </div>

      {message && <p>{message}</p>}

      {/* pages that need a logged-in user */}
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
        <LibrarianHome user={currentUser} />
      )}

      {/* pages everyone can see */}
      {page === "catalog" && (
        <Catalog onSelectItem={handleSelectItems} onBorrow={handleBorrow} />
      )}

      {page === "itemDetails" && (
        <ItemDetails
          itemID={selectedItemID}
          user={currentUser}
          onBack={() => goTo("catalog")}
        />
      )}
    </div>
  );
}

export default App;
