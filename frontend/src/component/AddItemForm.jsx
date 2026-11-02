import { useState } from "react";
import "../styles/AddItemForm.css";

function AddItemForm() {
  const [itemType, setItemType] = useState("Book");
  const [title, setTitle] = useState("");
  const [totalCopies, setTotalCopies] = useState(1);

  // Book and Media fields
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [publicationYear, setPublicationYear] = useState("");

  // Device fields
  const [brand, setBrand] = useState("");
  const [deviceType, setDeviceType] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

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
      let response;

      if (itemType === "Book") {
        response = await fetch("http://localhost:3000/books", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(itemData),
        });
      } else if (itemType === "Media") {
        response = await fetch("http://localhost:3000/media", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(itemData),
        });
      } else {
        response = await fetch("http://localhost:3000/device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(itemData),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to add item.");
      }

      setMessage(`${itemType} added successfully!`);

      // Clear the form
      setTitle("");
      setTotalCopies(1);
      setAuthor("");
      setIsbn("");
      setPublicationYear("");
      setBrand("");
      setDeviceType("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <div className="add-item-form-container">
      <h2>Add New Item</h2>

      <form onSubmit={handleSubmit}>
        <div className="add-item-type-section">
          <label htmlFor="itemType">Item Type:</label>
          <select
            id="itemType"
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
          >
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
                    placeholder="e.g. 978-0-19-283012-4"
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
          <button
            type="button"
            className="add-item-clear-button"
            onClick={() => {
              setTitle("");
              setTotalCopies(1);
              setAuthor("");
              setIsbn("");
              setPublicationYear("");
              setBrand("");
              setDeviceType("");
              setMessage("");
              setError("");
            }}
          >
            Clear Form
          </button>

          <button type="submit" className="add-item-submit-button">
            Add Item
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddItemForm;
