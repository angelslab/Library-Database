function ItemCard({ item, onSelectItem }) {
  return (
    <>
      <h2>{item.title}</h2>

      <p>Type: {item.item_type}</p>

      <p>Total copies: {item.total_copies}</p>

      <p>Available copies: {item.available_copies}</p>

      <button onClick={() => onSelectItem(item.itemID)}>View Details</button>
      {/* borrow btn */}
      <button>Borrow</button>
    </>
  );
}

export default ItemCard;
