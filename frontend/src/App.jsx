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
  const [page, setPage] = useState("catalog");
  const [selectedItemID, setSelectedItemID] = useState(null);

  function handleSelectItems(itemID) {
    setSelectedItemID(itemID);
    setPage("itemDetails");
  }

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("home");
  };
  // if not login -> login page
  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  // if logged in -> top bar + page according to role
  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <UserMenu
          name={currentUser.first_name}
          onNavigate={setPage}
          onLogout={handleLogout}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <span>Role: {currentUser.role}</span>
        </div>
      </div>

      {page === "profile" && <Profile user={currentUser} />}
      {page === "notification" && <Notification user={currentUser} />}

      {page === "home" && currentUser.role === "student" && (
        <StudentHome user={currentUser} onSelectItem={handleSelectItems} />
      )}
      {page === "home" && currentUser.role === "faculty" && (
        <FacultyHome user={currentUser} />
      )}
      {page === "home" && currentUser.role === "librarian" && (
        <LibrarianHome user={currentUser} />
      )}

      {page === "catalog" && <Catalog onSelectItem={handleSelectItems} />}

      {page === "itemDetails" && (
        <ItemDetails
          itemID={selectedItemID}
          user={currentUser}
          onBack={() => setPage("catalog")}
        />
      )}
    </div>
  );
}

export default App;
