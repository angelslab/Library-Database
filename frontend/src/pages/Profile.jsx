function Profile({ user }) {
  return (
    <div style={{ textAlign: 'left', marginTop: 20 }}>
      <h2>My Profile</h2>
      <p><b>Name:</b> {user.first_name} {user.last_name}</p>
      <p><b>Email:</b> {user.email}</p>
      <p><b>Role:</b> {user.role}</p>
    </div>
  )
}

export default Profile