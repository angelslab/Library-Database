import { useState, useEffect, useRef } from "react";
import "../styles/ItemCard.css";

function ItemCard({ item, onSelectItem, onBorrow, onEdit, user, onDelete }) {
  const isLowStock = item.available_copies <= 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const coverColors = {
    Book: "item-cover-book",
    Media: "item-cover-media",
    Device: "item-cover-device",
  };

  //closing menu when clicking outside

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDelete = () => {
    setMenuOpen(false);

    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      onDelete?.(item);
    }
  };

  const coverColor = coverColors[item.item_type] || "item-cover-default";

  return (
    <article className="item-card">
      {user?.role === "librarian" && (
        <div className="item-card-menu" ref={menuRef}>
          <button
            type="button"
            className="item-card-menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
          >
            &#8942;
          </button>

          {menuOpen && (
            <div className="item-card-dropdown">
              <button
                onClick={() => onEdit(item)}
                className="item-card-dropdown-edit"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="item-card-dropdown-delete"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`item-cover ${coverColor}`}>
        <div className="item-cover-edge" />

        {/* Item Type */}
        <div className="item-type-label">{item.item_type}</div>

        {/* Item Information */}
        <div className="item-cover-info">
          <h3 className="item-cover-title">{item.title}</h3>

          {item.item_type === "Book" && (
            <p className="item-cover-author">{item.book_author}</p>
          )}

          {item.item_type === "Media" && (
            <p className="item-cover-author">{item.media_author}</p>
          )}

          {item.item_type === "Device" && (
            <p className="item-cover-author">{item.device_author}</p>
          )}
        </div>
      </div>

      {/* Availability */}
      <div className="item-availability">
        <div className="item-availability-info">
          <h3 className="item-title">{item.title}</h3>

          <span className="item-type">{item.item_type}</span>
        </div>

        <span
          className={`item-stock ${
            isLowStock ? "item-stock-low" : ""
          } ${item.item_type === "Media" ? "item-stock-media" : ""}`}
        >
          {item.available_copies}/{item.total_copies} available
        </span>
      </div>

      {/* Actions */}
      <div className="item-actions">
        <button
          type="button"
          onClick={() => onSelectItem(item.itemID)}
          className="item-button item-button-details"
        >
          View details
        </button>

        <button
          type="button"
          onClick={() => onBorrow && onBorrow(item)}
          disabled={item.available_copies <= 0}
          className="item-button item-button-borrow"
        >
          {item.available_copies <= 0 ? "Unavailable" : "Borrow"}
        </button>
      </div>
    </article>
  );
}

export default ItemCard;
