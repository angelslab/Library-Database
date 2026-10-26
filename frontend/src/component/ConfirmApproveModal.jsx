import { useEffect, useRef, useState } from "react";
import { formatLoanDate } from "../utils/loansReport";
import "../styles/ConfirmBorrowModal.css";

function ConfirmApproveModal({ librarian, loan, onClose, onApproved }) {
  const dialogRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const overdue = loan.days_left !== null && loan.days_left < 0;

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/loans/approve-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ librarianID: librarian.userID, loanID: loan.loanID }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not approve this return.");
      }

      onApproved(data);
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
      aria-labelledby="approve-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
    >
      <h2 id="approve-modal-title" className="borrow-modal-title">
        Approve return
      </h2>

      <section className="borrow-modal-section">
        <h3 className="borrow-modal-label">Borrower</h3>
        <dl className="borrow-modal-details">
          <dt>Name</dt>
          <dd>{loan.borrower}</dd>
          <dt>Email</dt>
          <dd>{loan.email}</dd>
          <dt>Account</dt>
          <dd className="borrow-modal-capitalize">{loan.role}</dd>
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
          <dt>Loan #</dt>
          <dd>{loan.loanID}</dd>
          <dt>Borrowed</dt>
          <dd>{formatLoanDate(loan.borrow_date)}</dd>
          <dt>Due</dt>
          <dd>{formatLoanDate(loan.due_date)}</dd>
        </dl>
      </section>

      <p className="borrow-modal-due">
        {overdue && (
          <>
            This item is {Math.abs(loan.days_left)} day
            {Math.abs(loan.days_left) === 1 ? "" : "s"} overdue.{" "}
          </>
        )}
        Approving marks the item as returned today, puts one copy back on the
        shelf, and notifies {loan.borrower}.
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
          {submitting ? "Approving..." : "Approve return"}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmApproveModal;
