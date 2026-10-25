import { useState, useEffect } from "react";
import "../styles/AddItemForm.css";

function EditItemForm({ item, onBack, onItemUpdated }) {
  const [itemType, setItemType] = useState(item?.item_type || "Book");
  const [title, setTitle] = useState(item?.title || "");
  const [totalCopies, setTotalCopies] = useState(item?.total_copies ?? 1);

  // Book and Media fields
  const [author, setAuthor] = useState(
    item?.author || item?.media_author || "",
  );
  const [isbn, setIsbn] = useState(item?.isbn || "");
  const [publicationYear, setPublicationYear] = useState(
    item?.publication_year || "",
  );

  // Device fields
  const [brand, setBrand] = useState(item?.brand || "");
  const [deviceType, setDeviceType] = useState(item?.device_type || "");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item) return;

    setItemType(item.item_type || "Book");
    setTitle(item.title || "");
    setTotalCopies(item.total_copies ?? 1);
    setAuthor(item.author || item.media_author || "");
    setIsbn(item.isbn || "");
    setPublicationYear(item.publication_year || "");
    setBrand(item.brand || "");
    setDeviceType(item.device_type || "");
    setMessage("");
    setError("");
  }, [item]);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!item?.itemID) {
      setError("No item was selected to edit.");
      return;
    }

    const itemData = {
      title,
      total_copies: Number(totalCopies),
    };

    if (itemType === "Book") {
      itemData.author = author;
      itemData.isbn = isbn;
      itemData.publication_year = Number(publicationYear);
    } else if (itemType === "Media") {
      itemData.author = author;
    } else if (itemType === "Device") {
      itemData.brand = brand;
      itemData.device_type = deviceType;
    }

    try {
      let endpoint;

      if (itemType === "Book") {
        endpoint = `http://localhost:3000/books/${item.itemID}`;
      } else if (itemType === "Media") {
        endpoint = `http://localhost:3000/media/${item.itemID}`;
      } else {
        endpoint = `http://localhost:3000/device/${item.itemID}`;
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Failed to update item.",
        );
      }

      setMessage(`${itemType} updated successfully!`);

      if (onItemUpdated) {
        await onItemUpdated();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  if (!item) {
    return (
      <div className="add-item-form-container">
        <p>No item selected to edit.</p>

        {onBack && (
          <button
            type="button"
            className="add-item-clear-button"
            onClick={onBack}
          >
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="add-item-form-container">
      <h2>Edit Item</h2>

      <form onSubmit={handleSubmit}>
        <div className="add-item-type-section">
          <label htmlFor="itemType">Item Type:</label>

          <select id="itemType" value={itemType}>
            <option value="Book">Book</option>
            <option value="Media">Media</option>
            <option value="Device">Device</option>
          </select>
        </div>

        <section className="add-item-section">
          <h3>Collection Details</h3>

          <div className="add-item-fields">
            <div className="add-item-field">
              <label htmlFor="title">Title:</label>
              <input
                id="title"
                type="text"
                placeholder="Enter item title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="add-item-field">
              <label htmlFor="totalCopies">Total Copies:</label>
              <input
                id="totalCopies"
                type="number"
                min="1"
                value={totalCopies}
                onChange={(e) => setTotalCopies(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="add-item-section add-item-details-section">
          <h3>{itemType} Details</h3>

          <div className="add-item-fields">
            {itemType === "Book" && (
              <>
                <div className="add-item-field">
                  <label htmlFor="author">Author:</label>
                  <input
                    id="author"
                    type="text"
                    placeholder="Enter author name"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    required
                  />
                </div>

                <div className="add-item-field">
                  <label htmlFor="isbn">ISBN:</label>
                  <input
                    id="isbn"
                    type="text"
                    placeholder="Enter ISBN"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    required
                  />
                </div>

                <div className="add-item-field">
                  <label htmlFor="publicationYear">Publication Year:</label>
                  <input
                    id="publicationYear"
                    type="number"
                    placeholder="e.g. 2024"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {itemType === "Media" && (
              <div className="add-item-field">
                <label htmlFor="mediaAuthor">Author:</label>
                <input
                  id="mediaAuthor"
                  type="text"
                  placeholder="Enter author name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                />
              </div>
            )}

            {itemType === "Device" && (
              <>
                <div className="add-item-field">
                  <label htmlFor="brand">Brand:</label>
                  <input
                    id="brand"
                    type="text"
                    placeholder="e.g. Canon"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                  />
                </div>

                <div className="add-item-field">
                  <label htmlFor="deviceType">Device Type:</label>
                  <input
                    id="deviceType"
                    type="text"
                    placeholder="e.g. Laptop, Camera, Tablet"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {message && (
          <p className="add-item-message add-item-success" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="add-item-message add-item-error" role="alert">
            {error}
          </p>
        )}

        <div className="add-item-actions">
          {onBack && (
            <button
              type="button"
              className="add-item-clear-button"
              onClick={onBack}
            >
              Cancel
            </button>
          )}

          <button type="submit" className="add-item-submit-button">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditItemForm;
