import { useEffect, useState } from "react";

function ItemDetails({ itemID, user, onBack }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchItem() {
      try {
        (setLoading(true), setError(""));
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

    if (itemID !== null) {
      fetchItem();
    }
  }, [itemID]);

  if (loading) {
    return <p>Loading item details...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!item) {
    return <p>Item not found.</p>;
  }

  return (
    <div>
      <button onClick={onBack}>Back to Catalog</button>

      <h1>{item.title}</h1>

      {/* <p>ItemID: {item.itemID}</p> */}
      <p>Type: {item.item_type}</p>
      <p>Total Copies: {item.total_copies}</p>
      <p>Available Copies: {item.available_copies}</p>

      {item.item_type === "Book" && (
        <div>
          <h2>Book Details</h2>
          <p>Author: {item.book_author}</p>
          <p>ISBN: {item.isbn}</p>
          <p>Publication_year: {item.publication_year}</p>
        </div>
      )}

      {item.item_type === "Device" && (
        <div>
          <h2>Device Details</h2>
          <p>Device Type: {item.device_type}</p>
          <p>Brand: {item.brand}</p>
        </div>
      )}

      {item.item_type === "Media" && (
        <div>
          <h2>Media Details</h2>
          <p>Media Type: {item.media_author}</p>
        </div>
      )}
    </div>
  );
}

export default ItemDetails;
