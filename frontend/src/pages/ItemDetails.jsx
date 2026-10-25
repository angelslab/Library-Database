import { useEffect, useState } from "react";
import "../styles/ItemDetails.css";

function ItemDetails({ itemID, user, onBack, onBorrow }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchItem() {
      try {
        setLoading(true);
        setError("");
        setItem(null);

        const response = await fetch(`http://localhost:3000/items/${itemID}`);

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
  }, [itemID]);

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

  const author = item.book_author || item.media_author || item.device_author;

  const isAvailable = item.available_copies > 0;

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
          <span className="item-details-type">{item.item_type}</span>

          <div className="item-details-cover-title">
            <h1>{item.title}</h1>
          </div>
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
              {isAvailable ? "Available" : "Currently unavailable"}
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
                  <span>{item.isbn || "Not provided"}</span>
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

          <button
            type="button"
            className="item-details-borrow"
            disabled={!isAvailable || !onBorrow}
            onClick={() => onBorrow(item)}
          >
            {!isAvailable
              ? "Unavailable"
              : onBorrow
                ? "Borrow Item"
                : "Borrowing unavailable"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default ItemDetails;
