import "../styles/AlertDialog.css";

function AlertDialog({ title, message, onClose }) {
  return (
    <div className="dialog-overlay">
      <div className="dialog-card">
        <h2>{title}</h2>

        <p>{message}</p>

        <button type="button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

export default AlertDialog;
