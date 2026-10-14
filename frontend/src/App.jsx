import { useState } from 'react'
import Profile from './pages/profile'
import Notification from './pages/notification'
import Login from './pages/login'
import StudentHome from './pages/studentHome'
import FacultyHome from './pages/facultyHome'
import LibrarianHome from './pages/librarianhome'
import UserMenu from './component/userMenu'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const[page, setPage] = useState('home')
  const handleLogout = () => {
    setCurrentUser(null)
    setPage('home')
  }
  // if not login -> login page
  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />
  }

  // if logged in -> top bar + page according to role
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <UserMenu name={currentUser.first_name} 
        onNavigate={setPage} 
        onLogout= {handleLogout} 
        />
          
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span>Role: {currentUser.role}</span>
        </div>
      </div>
      {page === 'profile' && <Profile user={currentUser} />}
      {page === 'notification' && <Notification user={currentUser} />}

      {page === 'home' && currentUser.role === 'student' && <StudentHome user={currentUser} />}
      {page === 'home' && currentUser.role === 'faculty' && <FacultyHome user={currentUser} />}
      {page === 'home' && currentUser.role === 'librarian' && <LibrarianHome user={currentUser} />}
    </div>
  )
}

export default App