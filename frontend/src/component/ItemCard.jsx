import { useState, useEffect, useRef } from "react";
import "../styles/ItemCard.css";
import "../styles/HoldsFines.css";
import ConfirmDialog from "./ConfirmDialog";

function ItemCard({
  item,
  onSelectItem,
  onBorrow,
  onPlaceHold,
  onCancelHold,
  hold,
  onEdit,
  user,
  onDelete,
}) {
  const isLowStock = item.available_copies <= 1;
  // copies not reserved by holds
  const freeCopies = item.available_copies - Number(item.waiting_holds || 0);
  const canBorrow = hold ? hold.ready : freeCopies > 0;
  const reserved = item.available_copies > 0 && freeCopies <= 0 && !hold?.ready;

  const [menuOpen, setMenuOpen] = useState(false);
  // failed image url
  const [failedImage, setFailedImage] = useState(null);
  const imageFailed = failedImage === item.image_url;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  const coverColors = {
    Book: "item-cover-book",
    Media: "item-cover-media",
    Device: "item-cover-device",
  };

  // close menu on outside click

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

  // delete popup
  const handleDelete = () => {
    setMenuOpen(false);
    setConfirmDelete(true);
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
        {item.image_url && !imageFailed ? (
          <img
            src={item.image_url}
            alt={`${item.title} cover`}
            className="item-cover-image"
            style={{
              objectFit:
                item.item_type === "Book" || item.item_type === "Media"
                  ? "cover"
                  : "contain",
            }}
            onError={() => setFailedImage(item.image_url)}
          />
        ) : (
          <>
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
                <p className="item-cover-author">{item.brand}</p>
              )}
            </div>
          </>
        )}
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
          {reserved && " · reserved"}
        </span>
      </div>

      {/* hold */}
      {hold && (
        <p className={`item-hold-note ${hold.ready ? "item-hold-ready" : ""}`}>
          {hold.ready
            ? "On hold · a copy is ready for you"
            : `On hold · #${hold.queue_position} of ${hold.queue_length} in line`}
        </p>
      )}

      {/* Actions */}
      <div className="item-actions">
        <button
          type="button"
          onClick={() => onSelectItem(item.itemID)}
          className="item-button item-button-details"
        >
          View details
        </button>

        {user?.role !== "librarian" && (
          <>
            {!canBorrow && hold && onCancelHold ? (
              <button
                type="button"
                onClick={() => onCancelHold(hold)}
                className="item-button item-button-cancel-hold"
              >
                Cancel hold
              </button>
            ) : !canBorrow && onPlaceHold ? (
              <button
                type="button"
                onClick={() => onPlaceHold(item)}
                className="item-button item-button-borrow"
              >
                Place hold
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onBorrow && onBorrow(item)}
                disabled={!canBorrow}
                className="item-button item-button-borrow"
              >
                {!canBorrow ? "Unavailable" : "Borrow"}
              </button>
            )}
          </>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete item"
          details={[
            { label: "Title", value: item.title },
            { label: "Type", value: item.item_type },
            { label: "Copies", value: item.total_copies },
          ]}
          note="This permanently removes the item from the catalog. It cannot be undone."
          confirmLabel="Delete item"
          busyLabel="Deleting..."
          danger
          onConfirm={async () => {
            await onDelete?.(item);
            setConfirmDelete(false);
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </article>
  );
}

export default ItemCard;
