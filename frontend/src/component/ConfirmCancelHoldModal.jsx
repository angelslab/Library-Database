import { useEffect, useRef, useState } from "react";
import "../styles/ConfirmBorrowModal.css";

// In-app "are you sure?" popup for cancelling a hold (replaces window.confirm).
function ConfirmCancelHoldModal({ user, hold, onClose, onCancelled }) {
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
      const response = await fetch("http://localhost:3000/api/holds/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: user.userID, holdID: hold.holdID }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not cancel the hold.");
      }

      onCancelled(data);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the server. Please try again."
          : err.message,
      );
      setSubmitting(false);
    }
  }

  const hasQueue = hold.queue_position != null && hold.queue_length != null;

  return (
    <dialog
      ref={dialogRef}
      className="borrow-modal"
      aria-labelledby="cancel-hold-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
    >
      <h2 id="cancel-hold-modal-title" className="borrow-modal-title">
        Cancel hold
      </h2>

      <section className="borrow-modal-section">
        <h3 className="borrow-modal-label">Item</h3>
        <dl className="borrow-modal-details">
          <dt>Title</dt>
          <dd>{hold.title}</dd>
          {hold.creator && (
            <>
              <dt>By</dt>
              <dd>{hold.creator}</dd>
            </>
          )}
          {hold.item_type && (
            <>
              <dt>Type</dt>
              <dd>{hold.item_type}</dd>
            </>
          )}
          {hasQueue && (
            <>
              <dt>In line</dt>
              <dd>
                #{hold.queue_position} of {hold.queue_length}
              </dd>
            </>
          )}
        </dl>
      </section>

      <p className="borrow-modal-due">
        You will lose your place in line. If you place a hold again later, you
        start at the back of the line.
      </p>

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
          Keep hold
        </button>

        <button
          type="button"
          className="borrow-modal-button borrow-modal-confirm"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? "Cancelling..." : "Cancel hold"}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmCancelHoldModal;
