import { useState } from 'react';

function BookSearch() {
    const [keyword, setKeyword] = useState('')
    const [results, setResults] = useState([])
    const[searched, setSearched] = useState(false)

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const res= await fetch('http://localhost:3000/api/books?q=' + encodeURIComponent(keyword));
            const data = await res.json();
            if (res.ok) {
                setResults(data);
            } else {
                alert(data.error)
                setResults([])
            }
            setSearched(true)
            } catch (err){
                alert ('Cannot reach server:' + err.message)
            }
        
        }
        return (
            <div style= {{ marginTop:20}}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                    <input
                        type="text"
                        placeholder="Search for a book by title or author"
                        value={keyword}
                        onChange={(e) =>{ setKeyword(e.target.value)
                        setSearched(false)
                        }}
                        style={{ flex: 1,padding: 8 }}
                    />
                    <button type="submit">Search</button>
                </form>
                {searched && results.length === 0 && <p style={{ color: 'white' }}>
                No books found for "{keyword}". Try another keyword.
                </p>}
                
                <ul style={{textAlign: 'left'}}>
                    {results.map((book,i) => (
                        <li key={i}>{JSON.stringify(book)}</li>
                    ))}
                    </ul>
                </div>
                )
            }
            export default BookSearch;

                    
                
            
        
    