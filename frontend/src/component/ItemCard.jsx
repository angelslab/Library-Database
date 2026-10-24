import "../styles/ItemCard.css";

function ItemCard({ item, onSelectItem, onBorrow, onEdit, user }) {
  const isLowStock = item.available_copies <= 1;

  const coverColors = {
    Book: "item-cover-book",
    Media: "item-cover-media",
    Device: "item-cover-device",
  };

  const coverColor = coverColors[item.item_type] || "item-cover-default";

  return (
    <article className="item-card">
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

        <span className={`item-stock ${isLowStock ? "item-stock-low" : ""}`}>
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

        {user?.role === "librarian" && (
          <button onClick={() => onEdit(item)}>Edit</button>
        )}

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
