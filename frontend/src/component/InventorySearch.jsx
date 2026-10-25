import { useState } from 'react'

function Inventory() {
    const [keyword, setKeyword] = useState('')
    const [results, setResults] = useState([])
    const [searched, setSearched] = useState(false)

    const handleSearch = async (e) => {
    e.preventDefault()
    try {
    const res = await fetch(
        'http://localhost:3000/api/items?q=' + encodeURIComponent(keyword)
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
        placeholder="Search by title, author, brand, or ISBN"
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
            <th style={cell}>ID</th>
            <th style={cell}>Title</th>
            <th style={cell}>Type</th>
            <th style={cell}>Author / Brand</th>
            <th style={cell}>Availability</th>
            </tr>
        </thead>
        <tbody>
            {results.map((item) => (
            <tr key={item.itemID}>
                <td style={cell}>{item.itemID}</td>
                <td style={cell}>{item.title}</td>
                <td style={cell}>{item.item_type || item.device_type}</td>
                <td style={cell}>{item.author || item.brand || '—'}</td>
                <td style={cell}>
                <span
                    style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 13,
                    color: 'white',
                    background:
                        item.available_copies > 0 ? '#1f6f3f' : '#8a2d2d',
                    }}
                >
                    {item.available_copies > 0
                    ? `${item.available_copies} of ${item.total_copies} available`
                    : 'All checked out'}
                </span>
                </td>
            </tr>
            ))}
        </tbody>
        </table>
    )}
    </div>
)
}

export default Inventory