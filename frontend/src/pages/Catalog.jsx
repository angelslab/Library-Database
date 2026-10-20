import { useEffect, useState } from "react";
import ItemCard from "../component/ItemCard";
import ItemSearch from "../component/ItemSearch";

function Catalog({ onSelectItem, onBorrow }) {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredItems =
    category === "All"
      ? items
      : items.filter((item) => item.item_type === category);

  useEffect(() => {
    //fetch all items from backend
    async function fetchCatalog() {
      try {
        const response = await fetch("http://localhost:3000/items");

        if (!response.ok) {
          throw new Error("Failed to load items");
        }

        const data = await response.json();
        setItems(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCatalog();
  }, []);

  //show loading message while fetching
  if (loading) {
    return <p>Loading catalog...</p>;
  }

  //show error if request fails
  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <p>Browse books, media and devices.</p>

      <ItemSearch
        items={items}
        onSelectItem={onSelectItem}
        onBorrow={onBorrow}
        onSearchChange={setIsSearching}
      />

      {!isSearching && (
        <>
          {/* Category buttons */}
          <div className="category-btn" style={{ display: "flex", gap: 12, justifyContent: "center", margin: "12px 0 24px" }}>
            {["All", "Book", "Media", "Device"].map((type) => (
              <button key={type} onClick={() => setCategory(type)}>
                {type === "All" ? "All items" : `${type}'s`}
              </button>
            ))}
          </div>

          {/* Regular catalog */}
          <div>
            {filteredItems.map((item) => (
              <ItemCard
                key={item.itemID}
                item={item}
                onSelectItem={onSelectItem}
                onBorrow={onBorrow}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Catalog;
