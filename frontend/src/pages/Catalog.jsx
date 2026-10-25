import { useEffect, useState } from "react";
import ItemCard from "../component/ItemCard";
import ItemSearch from "../component/ItemSearch";
import "../styles/Catalog.css";

function Catalog({ onSelectItem, onBorrow, onAddItem, user, onEdit }) {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filters = ["All", "Book", "Media", "Device"];

  const filteredItems =
    category === "All"
      ? items
      : items.filter((item) => item.item_type === category);

  useEffect(() => {
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

  if (loading) {
    return <p className="catalog-message">Loading catalog...</p>;
  }

  if (error) {
    return <p className="catalog-error">Error: {error}</p>;
  }

  return (
    <div className="catalog-container">
      {/* Search */}
      <section className="catalog-search-section">
        <div className="library-search catalog-search">
          <ItemSearch
            items={items}
            onSelectItem={onSelectItem}
            onBorrow={onBorrow}
            onSearchChange={setIsSearching}
          />
        </div>
      </section>

      {/* Category and catalog */}
      {!isSearching && (
        <>
          <section className="catalog-category-section">
            <h2 className="catalog-section-label">Browse categories</h2>

            <div className="catalog-toolbar">
              <div className="catalog-filters">
                {filters.map((item) => {
                  const active = category === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      aria-pressed={active}
                      className={`catalog-filter ${
                        active ? "catalog-filter-active" : ""
                      }`}
                    >
                      {item === "All" ? "All items" : `${item}s`}
                    </button>
                  );
                })}
              </div>

              {user?.role === "librarian" && (
                <div className="catalog-add-container">
                  <button
                    type="button"
                    className="catalog-filter catalog-add-button"
                    onClick={onAddItem}
                  >
                    Add Item
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Catalog heading */}
          <section className="catalog-results-section">
            <div className="catalog-results-heading">
              <h2 className="catalog-title">
                {category === "All" ? "All items" : `${category}s`}
              </h2>

              <span className="catalog-results-count">
                {filteredItems.length} results
              </span>
            </div>

            {/* Item cards */}
            {filteredItems.length > 0 ? (
              <div className="catalog-grid">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.itemID}
                    item={item}
                    onSelectItem={onSelectItem}
                    onBorrow={onBorrow}
                    onEdit={onEdit}
                    user={user}
                  />
                ))}
              </div>
            ) : (
              <p className="catalog-empty">No items found in this category.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Catalog;
