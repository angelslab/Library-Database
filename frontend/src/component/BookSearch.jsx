import { useState } from "react";
import ItemCard from "./ItemCard";

function BookSearch({ items, onSelectItem, onSearchChange }) {
  const [keyword, setKeyword] = useState("");

  const search = keyword.trim().toLowerCase();

  const handleSearchChange = (value) => {
    setKeyword(value);
    onSearchChange(value.trim() !== "");
  };

  const results = items.filter((item) => {
    return (
      item.title?.toLowerCase().includes(search) ||
      item.author?.toLowerCase().includes(search)
    );
  });
  return (
    <div style={{ marginTop: 20 }}>
      <h2>Search Books</h2>

      <input
        type="text"
        placeholder="Search by book title or author"
        value={keyword}
        onChange={(e) => handleSearchChange(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      {search !== "" && results.length === 0 && (
        <p>No books found for "{keyword}". Try another keyword.</p>
      )}

      {search !== "" && results.length > 0 && (
        <div>
          {results.map((book) => (
            <ItemCard
              key={book.itemID}
              item={book}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BookSearch;
