import { useEffect, useRef, useState } from "react";
import "../styles/ConfirmBorrowModal.css";

// Generic in-app "are you sure?" popup (use instead of window.confirm).
//
// details:  [{ label, value }] shown as a small table (optional)
// note:     warning text under the details (optional)
// onConfirm: async; throw an Error to show its message inside the popup.
//            The parent closes the popup when it succeeds.
function ConfirmDialog({
  title,
  details = [],
  note,
  confirmLabel = "Confirm",
  busyLabel = "Working...",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}) {
  const dialogRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      await onConfirm();
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the server. Please try again."
          : err.message || "Something went wrong.",
      );
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="borrow-modal"
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
    >
      <h2 id="confirm-dialog-title" className="borrow-modal-title">
        {title}
      </h2>

      {details.length > 0 && (
        <section className="borrow-modal-section">
          <dl className="borrow-modal-details">
            {details.map((d) => (
              <div key={d.label} style={{ display: "contents" }}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {note && <p className="borrow-modal-due">{note}</p>}

      {error && (
        <p className="borrow-modal-error" role="alert">
          {error}
        </p>
      )}

      <div className="borrow-modal-actions">
        <button
          type="button"
          className="borrow-modal-button"
          onClick={onClose}
          disabled={submitting}
          autoFocus
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          className={`borrow-modal-button ${danger ? "borrow-modal-danger" : "borrow-modal-confirm"}`}
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
