import { useEffect, useRef, useState } from "react";
import "../styles/ConfirmBorrowModal.css";

// Keep in sync with LOAN_POLICY in backend/loans/loans.js.
// The server is the one that actually enforces these, this is only for the preview.
const LOAN_DAYS = { student: 7, faculty: 14 };
const MAX_LOANS = { student: 3, faculty: 5 };

function getItemCreator(item) {
  return item.book_author || item.media_author || item.brand || "";
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ConfirmBorrowModal({ user, item, onClose, onBorrowed }) {
  const dialogRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const loanDays = LOAN_DAYS[user.role];
  const maxLoans = MAX_LOANS[user.role];

  const dueDate = new Date();
  if (loanDays) {
    dueDate.setDate(dueDate.getDate() + loanDays);
  }

  const creator = getItemCreator(item);
  const idLabel =
    user.role === "student"
      ? `Student ID: ${user.studentID ?? "N/A"}`
      : `Faculty ID: ${user.facultyID ?? "N/A"}`;

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/loans/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: user.userID, itemID: item.itemID }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not borrow this item.");
      }

      onBorrowed(data);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the server. Please try again."
          : err.message,
      );
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="borrow-modal"
      aria-labelledby="borrow-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
    >
      <h2 id="borrow-modal-title" className="borrow-modal-title">
        Confirm Borrow
      </h2>

      <section className="borrow-modal-section">
        <h3 className="borrow-modal-label">Borrower</h3>
        <dl className="borrow-modal-details">
          <dt>Name</dt>
          <dd>
            {user.first_name} {user.last_name}
          </dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Account</dt>
          <dd className="borrow-modal-capitalize">
            {user.role} · {idLabel}
          </dd>
        </dl>
      </section>

      <section className="borrow-modal-section">
        <h3 className="borrow-modal-label">Item</h3>
        <dl className="borrow-modal-details">
          <dt>Title</dt>
          <dd>{item.title}</dd>
          {creator && (
            <>
              <dt>By</dt>
              <dd>{creator}</dd>
            </>
          )}
          <dt>Type</dt>
          <dd>{item.item_type}</dd>
          <dt>Available</dt>
          <dd>
            {item.available_copies} of {item.total_copies} copies
          </dd>
        </dl>
      </section>

      {loanDays && (
        <p className="borrow-modal-due">
          {user.role === "student" ? "Students" : "Faculty"} can keep items for{" "}
          {loanDays} days (up to {maxLoans} at a time). If you confirm now, it is
          due back on <strong>{formatDate(dueDate)}</strong>.
        </p>
      )}

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
        >
          Cancel
        </button>

        <button
          type="button"
          className="borrow-modal-button borrow-modal-confirm"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? "Borrowing..." : "Confirm borrow"}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmBorrowModal;
