import { useEffect, useState } from 'react'

function Profile({ user }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/api/profile/' + user.userID)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) setProfile(data)
        else setError(data.error)
      })
      .catch((err) => setError('Cannot reach server: ' + err.message))
  }, [user.userID])

  if (error) return <p style={{ color: 'red' }}>{error}</p>
  if (!profile) return <p>Loading...</p>

  return (
    <div style={{ textAlign: 'left', marginTop: 20 }}>
      <h2>My Profile</h2>
      <p><b>Name:</b> {profile.first_name} {profile.last_name}</p>
      <p><b>Email:</b> {profile.email}</p>
      <p><b>Role:</b> {profile.role}</p>

      {profile.studentID && <p><b>Student ID:</b> {profile.studentID}</p>}
      {profile.major && <p><b>Major:</b> {profile.major}</p>}
      {profile.facultyID && <p><b>Faculty ID:</b> {profile.facultyID}</p>}
      {profile.department && <p><b>Department:</b> {profile.department}</p>}

      {profile.max_limit !== null && (
        <p><b>Borrowed:</b> {profile.current_loans} / {profile.max_limit} items</p>
      )}
      {profile.role !== 'librarian' && (
        <p><b>Unpaid fines:</b> ${Number(profile.unpaid_fines).toFixed(2)}</p>
      )}
    </div>
  )
}

export default Profile
