import { useState } from 'react'
import BookSearch from '../component/BookSearch'
import UserManagemt from '../component/userManage'

function LibrarianHome({ user }) {
  const [view, setView] = useState('menu')

  return (
    <div>
      <h2>Librarian Dashboard</h2>

      {view === 'menu' && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => setView('books')}>Manage Inventory</button>
          <button onClick={() => setView('users')}>Manage users</button>
        </div>
      )}

      {view !== 'menu' && (
        <button onClick={() => setView('menu')}>← Back</button>
      )}

      {view === 'books' && <BookSearch />}
      {view === 'users' && <UserManagemt />}
    </div>
  )
}

export default LibrarianHome