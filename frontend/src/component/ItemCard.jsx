function ItemCard({ item, onSelectItem, onBorrow }) {
  return (
    <>
      <h2>{item.title}</h2>

      <p>Type: {item.item_type}</p>

      <p>Total copies: {item.total_copies}</p>

      <p>Available copies: {item.available_copies}</p>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", margin: "12px 0 24px" }}>
        <button onClick={() => onSelectItem(item.itemID)}>View Details</button>
        {/* borrow btn */}
        <button onClick={() => onBorrow && onBorrow(item)}>Borrow</button>
      </div>
    </>
  );
}

export default ItemCard;
