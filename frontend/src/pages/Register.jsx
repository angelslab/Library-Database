import { useState } from 'react'
import '../styles/Auth.css'

function Register({ onLogin, onBack }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm: '',
    role: 'student', studentID: '', major: ''
  })
  const [error, setError] = useState('')

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim() || !form.major.trim()) {
      setError('Please fill in all fields')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    try {
      const res = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        onLogin(data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Cannot reach server: ' + err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="auth-logo"><img src="/library.png" alt="" /></div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Student sign-up. Faculty accounts are created by a librarian.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label">First name</label>
              <input className="auth-input" placeholder="First name" maxLength={50} value={form.first_name} onChange={update('first_name')} required />
            </div>
            <div className="auth-field">
              <label className="auth-label">Last name</label>
              <input className="auth-input" placeholder="Last name" maxLength={50} value={form.last_name} onChange={update('last_name')} required />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" placeholder="you@example.com" maxLength={100} value={form.email} onChange={update('email')} required />
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input className="auth-input" type="password" placeholder="At least 6 characters" minLength={6} value={form.password} onChange={update('password')} required />
            </div>
            <div className="auth-field">
              <label className="auth-label">Confirm password</label>
              <input className="auth-input" type="password" placeholder="Confirm" value={form.confirm} onChange={update('confirm')} required />
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label">Student ID</label>
              <input className="auth-input" type="text" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={10} placeholder="Student ID" value={form.studentID} onChange={(e) => { setForm({ ...form, studentID: e.target.value.replace(/\D/g, '').replace(/^0+/, '') }); setError('') }} required />
            </div>
            <div className="auth-field">
              <label className="auth-label">Major</label>
              <input className="auth-input" placeholder="e.g. CS" maxLength={50} value={form.major} onChange={(e) => { setForm({ ...form, major: e.target.value.toUpperCase() }); setError('') }} required />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="auth-button auth-button-primary">Create account</button>
            <button type="button" className="auth-button auth-button-ghost" onClick={onBack}>Back to log in</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register
