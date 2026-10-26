import { useEffect, useRef, useState } from "react";
import "../styles/ConfirmBorrowModal.css";

// "2026-10-25" -> "Oct 25, 2026"
function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ConfirmReturnModal({ user, loan, onClose, onRequested }) {
  const dialogRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const idLabel =
    user.role === "student"
      ? `Student ID: ${user.studentID ?? "N/A"}`
      : `Faculty ID: ${user.facultyID ?? "N/A"}`;

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/loans/request-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: user.userID, loanID: loan.loanID }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send the return request.");
      }

      onRequested(data);
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
      aria-labelledby="return-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
    >
      <h2 id="return-modal-title" className="borrow-modal-title">
        Request return
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
          <dd>{loan.title}</dd>
          {loan.creator && (
            <>
              <dt>By</dt>
              <dd>{loan.creator}</dd>
            </>
          )}
          <dt>Type</dt>
          <dd>{loan.item_type}</dd>
          <dt>Borrowed</dt>
          <dd>{formatDate(loan.borrow_date)}</dd>
          <dt>Due</dt>
          <dd>{formatDate(loan.due_date)}</dd>
        </dl>
      </section>

      <p className="borrow-modal-due">
        This sends a return request to the librarian. The item stays on your
        account, and still counts toward your borrow limit, until the librarian
        approves it. You will get a notification when it is approved.
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
        >
          Cancel
        </button>

        <button
          type="button"
          className="borrow-modal-button borrow-modal-confirm"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? "Sending..." : "Send return request"}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmReturnModal;
