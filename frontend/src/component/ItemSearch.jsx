import { useState } from "react";
import ItemCard from "./ItemCard";
import "../styles/ItemSearch.css";

function ItemSearch({
  items,
  onSelectItem,
  onBorrow,
  onPlaceHold,
  onCancelHold,
  holdsByItem = {},
  onSearchChange,
}) {
  const [keyword, setKeyword] = useState("");

  const search = keyword.trim().toLowerCase();

  const handleSearchChange = (value) => {
    setKeyword(value);
    onSearchChange(value.trim() !== "");
  };

  const results = items.filter((item) => {
    return (
      item.title?.toLowerCase().includes(search) ||
      item.author?.toLowerCase().includes(search) ||
      item.book_author?.toLowerCase().includes(search) ||
      item.media_author?.toLowerCase().includes(search) ||
      item.device_type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="item-search">
      <input
        className="item-search-input"
        type="text"
        placeholder="Search books, items, media"
        value={keyword}
        onChange={(e) => handleSearchChange(e.target.value)}
        aria-label="Search library catalog"
      />

      {search !== "" && results.length === 0 && (
        <p className="item-search-message">
          No items found for "{keyword}". Try another keyword.
        </p>
      )}

      {search !== "" && results.length > 0 && (
        <div className="item-search-results">
          {results.map((item) => (
            <ItemCard
              key={item.itemID}
              item={item}
              onSelectItem={onSelectItem}
              onBorrow={onBorrow}
              onPlaceHold={onPlaceHold}
              onCancelHold={onCancelHold}
              hold={holdsByItem[item.itemID]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ItemSearch;
