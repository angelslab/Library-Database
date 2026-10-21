import { useState, useEffect } from 'react'

function UserDetail({ userID }) {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
        setLoading(true)
        setError('')
        try {
        const res = await fetch('http://localhost:3000/api/users/' + userID)
        const data = await res.json()
        if (res.ok) {
            setRows(data)
        } else {
            setError(data.error || 'Something went wrong')
            setRows([])
        }
    } catch (err) {
        setError('Cannot reach server: ' + err.message)
    }
    setLoading(false)
    }
    load()
    }, [userID])

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>
    if (rows.length === 0) return <p>User not found.</p>

    const person = rows[0]
    const loans = rows.filter((r) => r.loanID !== null)
    const balance = Number(person.total_due)

    const cell = {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(128,128,128,0.35)',
    }
    const box = {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    border: '1px solid rgba(128,128,128,0.4)',
    textAlign: 'left',
    }
    const boxLabel = { fontSize: 13, opacity: 0.7, marginBottom: 4 }
    const boxValue = { fontSize: 22, fontWeight: 600 }
    const badge = (bg) => ({
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 13,
    color: 'white',
    background: bg,
})

return (
    <div style={{ marginTop: 20, textAlign: 'left' }}>
      {/* person */}
        <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
        {person.first_name} {person.last_name}{' '}
        <span style={badge('#4a5a8a')}>{person.role}</span>
        </h2>
        <p style={{ margin: '6px 0', opacity: 0.8 }}>
        ID {person.id_number} · {person.major_or_department || '—'} ·{' '}
        {person.email}
        </p>
    </div>

      {/* summary boxes */}
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={box}>
            <div style={boxLabel}>Balance due</div>
            <div style={{ ...boxValue, color: balance > 0 ? '#e57373' : 'inherit' }}>
            ${balance.toFixed(2)}
            </div>
        </div>
        <div style={box}>
            <div style={boxLabel}>Items checked out</div>
            <div style={boxValue}>{loans.length}</div>
        </div>
        <div style={box}>
            <div style={boxLabel}>On hold</div>
            <div style={{ ...boxValue, fontSize: 16 }}>
            {person.items_on_hold || 'None'}
        </div>
        </div>
    </div>

        {/* loans */}
        <h3>Items checked out</h3>
        {loans.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No items checked out.</p>
        ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
            <tr>
                <th style={cell}>Title</th>
                <th style={cell}>Type</th>
                <th style={cell}>Date Checkout</th>
                <th style={cell}>Due date</th>
                <th style={cell}>Status</th>
                <th style={cell}>Fine</th>
            </tr>
        </thead>
            <tbody>
            {loans.map((loan) => (
                <tr key={loan.loanID}>
                <td style={cell}>{loan.title}</td>
                <td style={cell}>{loan.item_type}</td>
                <td style={cell}>{new Date(loan.due_date).toLocaleDateString()}</td>
                <td style={cell}>{new Date(loan.due_date).toLocaleDateString()}</td>
                <td style={cell}>
                {loan.days_overdue > 0 ? (
                    <span style={badge('#8a2d2d')}>
                    {loan.days_overdue} days overdue
                    </span>
                ) : (
                    <span style={badge('#1f6f3f')}>On time</span>
                )}
                </td>
                <td style={cell}>
                {loan.fine_due ? `$${Number(loan.fine_due).toFixed(2)}` : '—'}
                </td>
            </tr>
            ))}
            </tbody>
        </table>
    )}
    </div>
)
}

export default UserDetail