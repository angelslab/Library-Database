import { useEffect, useState } from "react";
import ItemCard from "../component/ItemCard";
import ItemSearch from "../component/ItemSearch";
import TopBar from "../component/TopBar";
import "../styles/Catalog.css";
import "../styles/Browse.css";
import API_URL from "../api";

function Catalog({
  onSelectItem,
  onBorrow,
  onPlaceHold,
  onCancelHold,
  holdsByItem = {},
  onOpenHolds,
  onAddItem,
  user,
  onEdit,
  onDelete,
  refreshKey,
  unreadCount = 0,
  onOpenNotifications,
}) {
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
        const response = await fetch(`${API_URL}/items`);

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
  }, [refreshKey]);

  if (loading) {
    return <p className="catalog-message">Loading catalog...</p>;
  }

  if (error) {
    return <p className="catalog-error">Error: {error}</p>;
  }

  // shared props so Recommended cards behave exactly like the grid cards
  const cardProps = (item) => ({
    item,
    onSelectItem,
    onBorrow,
    onPlaceHold,
    onCancelHold,
    hold: holdsByItem[item.itemID],
    onEdit,
    user,
    onDelete,
  });

  const authorOf = (it) =>
    it?.book_author || it?.media_author || it?.device_author || "";

  const recommended = items.slice(0, 4);
  // featured = first item with a copy available, else the first item
  const featured = items.find((i) => i.available_copies > 0) || items[0];
  const isLibrarian = user?.role === "librarian";

  const featuredCoverClass =
    featured?.item_type === "Media"
      ? "media"
      : featured?.item_type === "Device"
        ? "device"
        : "";

  return (
    <div className="catalog-container">
      {/* Top bar: search + user chip + notification bell */}
      <TopBar
        name={user?.first_name}
        unreadCount={unreadCount}
        onBell={onOpenNotifications}
      >
        <div className="library-search catalog-search">
          <ItemSearch
            items={items}
            onSelectItem={onSelectItem}
            onBorrow={onBorrow}
            onPlaceHold={onPlaceHold}
            onCancelHold={onCancelHold}
            holdsByItem={holdsByItem}
            onSearchChange={setIsSearching}
          />
        </div>
      </TopBar>

      {!isSearching && (
        <div
          className="browse-grid"
          style={
            isLibrarian ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined
          }
        >
          <div className="browse-main">
            {/* Recommended — users only (not librarian inventory view) */}
            {!isLibrarian && recommended.length > 0 && (
              <section className="browse-recommended">
                <h2 className="browse-section-label">Recommended</h2>
                <div className="browse-rec-grid">
                  {recommended.map((item) => (
                    <ItemCard key={`rec-${item.itemID}`} {...cardProps(item)} />
                  ))}
                </div>
              </section>
            )}

            {/* Categories */}
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

                {onOpenHolds && (
                  <div className="catalog-add-container">
                    <button
                      type="button"
                      className="catalog-filter"
                      onClick={onOpenHolds}
                    >
                      My holds ({Object.keys(holdsByItem).length})
                    </button>
                  </div>
                )}

                {isLibrarian && (
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

            {/* Catalog grid */}
            <section className="catalog-results-section">
              <div className="catalog-results-heading">
                <h2 className="catalog-title">
                  {category === "All" ? "All items" : `${category}s`}
                </h2>

                <span className="catalog-results-count">
                  {filteredItems.length} results
                </span>
              </div>

              {filteredItems.length > 0 ? (
                <div className="catalog-grid">
                  {filteredItems.map((item) => (
                    <ItemCard key={item.itemID} {...cardProps(item)} />
                  ))}
                </div>
              ) : (
                <p className="catalog-empty">
                  No items found in this category.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default Catalog;
