import { useState } from 'react'

function Register({ onLogin, onBack }) {
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', password: '', confirm: '',
        role: 'student', studentID: '', major: '', facultyID: '', department: ''
    })
    const [error, setError] = useState('')

    const update = (field) => (e) => {
        setForm({ ...form, [field]: e.target.value })
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.password !== form.confirm) {
            setError('Passwords do not match')
            return
        }
        try {
            const res = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
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
        <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 300, margin: '40px auto' }}
        >
            <h1 style={{ fontSize: 40, lineHeight: 1.2 }}> create account </h1>
            <input placeholder="First name" value={form.first_name} onChange={update('first_name')} required />
            <input placeholder="Last name" value={form.last_name} onChange={update('last_name')} required />
            <input type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
            <input type="password" placeholder="Password" value={form.password} onChange={update('password')} required />
            <input type="password" placeholder="Confirm password" value={form.confirm} onChange={update('confirm')} required />

            <select value={form.role} onChange={update('role')}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
            </select>

            {form.role === 'student' ? (
                <>
                    <input type="number" placeholder="Student ID" value={form.studentID} onChange={update('studentID')} required />
                    <input placeholder="Major (e.g. CS)" value={form.major} onChange={(e) => { setForm({ ...form, major: e.target.value.toUpperCase() }); setError('') }} required />
                </>
            ) : (
                <>
                    <input type="number" placeholder="Faculty ID" value={form.facultyID} onChange={update('facultyID')} required />
                    <input placeholder="Department (e.g. CS)" value={form.department} onChange={(e) => { setForm({ ...form, department: e.target.value.toUpperCase() }); setError('') }} required />
                </>
            )}

            {error && <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>}
            <button type="submit">Register</button>
            <button type="button" onClick={onBack}>Back to log in</button>
        </form>
    )
}

export default Register