function LibrarianHome({ user }) {
  return (
    <div>
      <h2>Librarian Dashboard</h2>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      <button>Manage books</button>
      <button>Manage users</button>
    </div>
    </div>
  )
}

export default LibrarianHome