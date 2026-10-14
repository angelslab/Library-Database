import { useState } from 'react'
function Login({onLogin}) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
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
return(
    <form
    onSubmit={handleSubmit}
    style={{ display: 'flex', flexDirection: 'column', gap: 10, width:300, margin: '40px auto' }}
    >
    <h1> library log in </h1>
    <input type="email" placeholder="Enter your email"
    value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}/>
    <input type="password" placeholder="Enter your password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} />
    {error && <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>}
    <button type="submit">Login</button>
    </form>
)
}
export default Login