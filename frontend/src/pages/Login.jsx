import { useState } from 'react'
import Register from './Register'
function Login({onLogin}) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [showRegister, setShowRegister] = useState(false)
    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
        const res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (res.ok) {
            onLogin(data)
        } else {
            setError(data.error)
        }
    } catch (err){
        setError('Cannot reach server: '+ err.message)
    }
}
if (showRegister) {
    return <Register onLogin={onLogin} onBack={() => setShowRegister(false)} />
}
return(
    <form
    onSubmit={handleSubmit}
    style={{ display: 'flex', flexDirection: 'column', gap: 10, width:300, margin: '40px auto' }}
    >
    <h1 style={{ fontSize: 40, lineHeight: 1.2 }}> library log in </h1>
    <input type="email" placeholder="Enter your email"
    value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}/>
    <input type="password" placeholder="Enter your password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />
    {error && <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>}
    <button type="submit">Login</button>
    <button type="button" onClick={() => setShowRegister(true)}>Create an account</button>
    </form>
)
}
export default Login