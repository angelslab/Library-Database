import { useEffect, useState } from "react";
import "../styles/ItemDetails.css";
import "../styles/HoldsFines.css";
import API_URL from "../api";
import { formatISBN } from "../utils/isbn";

function ItemDetails({
  itemID,
  user,
  onBack,
  onBorrow,
  onPlaceHold,
  onCancelHold,
  hold,
  refreshKey,
}) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // failed image url
  const [failedImage, setFailedImage] = useState(null);

  useEffect(() => {
    async function fetchItem() {
      try {
        setLoading(true);
        setError("");
        setItem(null);

        const response = await fetch(`${API_URL}/items/${itemID}`);

        if (!response.ok) {
          throw new Error("Failed to load item details");
        }

        const data = await response.json();
        setItem(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (itemID != null) {
      fetchItem();
    }
  }, [itemID, refreshKey]);

  if (loading) {
    return (
      <div className="item-details-message">
        <p>Loading item details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="item-details-message">
        <p>Error: {error}</p>
        <button onClick={onBack}>Back to Catalog</button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="item-details-message">
        <p>Item not found.</p>
        <button onClick={onBack}>Back to Catalog</button>
      </div>
    );
  }

  const author = item.book_author || item.media_author || item.brand;

  // copies not reserved by holds
  const freeCopies = item.available_copies - Number(item.waiting_holds || 0);
  const canBorrow = hold ? hold.ready : freeCopies > 0;
  const reserved = item.available_copies > 0 && freeCopies <= 0 && !hold?.ready;
  const isAvailable = item.available_copies > 0 && !reserved;

  return (
    <main className="item-details-page">
      <button type="button" className="item-details-back" onClick={onBack}>
        ← Back to Catalog
      </button>

      <section className="item-details-card">
        <div
          className={`item-details-cover item-details-cover-${(
            item.item_type || "default"
          ).toLowerCase()}`}
        >
          {item.image_url && failedImage !== item.image_url ? (
            <img
              src={item.image_url}
              alt={`${item.title} cover`}
              className="item-details-cover-image"
              onError={() => setFailedImage(item.image_url)}
            />
          ) : (
            <>
              <span className="item-details-type">{item.item_type}</span>

              <div className="item-details-cover-title">
                <h1>{item.title}</h1>
              </div>
            </>
          )}
        </div>

        <div className="item-details-content">
          <span className="item-details-category">{item.item_type}</span>

          <h1 className="item-details-title">{item.title}</h1>

          {author && <p className="item-details-author">By {author}</p>}

          <div className="item-details-stock">
            <span
              className={`item-details-status ${
                isAvailable ? "is-available" : "is-unavailable"
              }`}
            >
              {isAvailable
                ? "Available"
                : reserved
                  ? "Reserved for holds"
                  : "Currently unavailable"}
            </span>

            <p>
              {item.available_copies} of {item.total_copies} copies available
            </p>
          </div>

          <div className="item-details-information">
            <h2>Item Information</h2>

            {item.item_type === "Book" && (
              <>
                <div className="item-details-row">
                  <span>Author</span>
                  <span>{item.book_author || "Not provided"}</span>
                </div>

                <div className="item-details-row">
                  <span>ISBN</span>
                  <span>
                    {item.isbn ? formatISBN(item.isbn) : "Not provided"}
                  </span>
                </div>

                <div className="item-details-row">
                  <span>Publication Year</span>
                  <span>{item.publication_year || "Not provided"}</span>
                </div>
              </>
            )}

            {item.item_type === "Media" && (
              <div className="item-details-row">
                <span>Author</span>
                <span>{item.media_author || "Not provided"}</span>
              </div>
            )}

            {item.item_type === "Device" && (
              <>
                <div className="item-details-row">
                  <span>Device Type</span>
                  <span>{item.device_type || "Not provided"}</span>
                </div>

                <div className="item-details-row">
                  <span>Brand</span>
                  <span>{item.brand || "Not provided"}</span>
                </div>
              </>
            )}
          </div>

          {hold && (
            <p
              className={`item-hold-note ${hold.ready ? "item-hold-ready" : ""}`}
            >
              {hold.ready
                ? "You have a hold on this item · a copy is ready for you"
                : `You have a hold on this item · #${hold.queue_position} of ${hold.queue_length} in line`}
            </p>
          )}

          {(user?.role === "student" || user?.role === "faculty") && (
            <>
              {!canBorrow && hold && onCancelHold ? (
                <button
                  type="button"
                  className="item-details-borrow item-button-cancel-hold"
                  onClick={() => onCancelHold(hold)}
                >
                  Cancel hold
                </button>
              ) : !canBorrow && onPlaceHold ? (
                <button
                  type="button"
                  className="item-details-borrow"
                  onClick={() => onPlaceHold(item)}
                >
                  Place hold
                </button>
              ) : (
                <button
                  type="button"
                  className="item-details-borrow"
                  disabled={!canBorrow || !onBorrow}
                  onClick={() => onBorrow(item)}
                >
                  {!canBorrow
                    ? "Unavailable"
                    : onBorrow
                      ? "Borrow Item"
                      : "Borrowing unavailable"}
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default ItemDetails;
