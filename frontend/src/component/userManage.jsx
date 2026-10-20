import { useState } from 'react'

function UserManagemt( onSelect ) {
    const [keyword, setKeyword] = useState('')
    const [results, setResults] = useState([])
    const [searched, setSearched] = useState(false)

    const handleSearch = async (e) => {
    e.preventDefault()
    try {
    const res = await fetch(
        'http://localhost:3000/api/users?q=' + encodeURIComponent(keyword)
    )
    const data = await res.json()
    if (res.ok) {
        setResults(data)
    } else {
        alert(data.error)
        setResults([])
    }
    setSearched(true)
    } catch (err) {
    alert('Cannot reach server: ' + err.message)
    }
}

const cell = {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(128,128,128,0.4)',
}
    return (
        <div style={{ marginTop: 20 }}>

    <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
        type="text"
        placeholder="Search by UserID, First and Last name"
        value={keyword}
        onChange={(e) => {
            setKeyword(e.target.value)
            setSearched(false)
        }}
        style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Search</button>
    </form>
        {searched && results.length === 0 && (
        <p style={{ opacity: 0.8 }}>
        No items found for "{keyword}". Try another keyword.
        </p>
    )}
    {results.length > 0 && (
        <table
        style={{
            width: '100%',
            marginTop: 16,
            borderCollapse: 'collapse',
            textAlign: 'left',
        }}
        > 
        <thead>
            <tr>
            <th style={cell}>UserID</th>
            <th style={cell}>Name</th>
            <th style={cell}>Email</th>
            <th style={cell}>Role</th>
            <th style={cell}>Major/Department</th>
            </tr>
        </thead>
        <tbody>
            {results.map((user) => (
            
            <tr key={user.userID}
                on onClick={() => onSelect(user.userID)}
                style={{ cursor: 'pointer' }}>
                <td style={cell}>{user.id_number}</td>
                <td style={cell}>{user.first_name} {user.last_name}</td>
                <td style={cell}>{user.email}</td>
                <td style={cell}>{user.role}</td>
                <td style={cell}>{user.major_or_department}</td>
            </tr>
            ))}
        </tbody>
        </table>
    )}
    </div>
    
    )

}

export default UserManagemt
