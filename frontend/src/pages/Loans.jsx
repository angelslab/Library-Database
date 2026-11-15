import { useEffect, useState } from "react";
import ConfirmReturnModal from "../component/ConfirmReturnModal";
import "../styles/Loans.css";

const coverClasses = {
  Book: "loans-cover-book",
  Media: "loans-cover-media",
  Device: "loans-cover-device",
};

// "2026-10-25" -> "Oct 25, 2026"
function formatDueDate(value) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatus(loan) {
  if (loan.days_left < 0) {
    return { label: "Overdue", className: "loans-status-overdue" };
  }

  if (loan.days_left <= 2) {
    return { label: "Due soon", className: "loans-status-soon" };
  }

  return { label: "On loan", className: "loans-status-ok" };
}

function Loans({ user, onBrowse }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [returnLoan, setReturnLoan] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function fetchLoans() {
      try {
        const response = await fetch(
          `http://localhost:3000/api/loans/user/${user.userID}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load loans");
        }

        setData(result);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchLoans();
  }, [user.userID]);

  // item returned
  function handleReturned(result) {
    const loanID = returnLoan.loanID;

    setData((current) => ({
      ...current,
      loans: current.loans.filter((item) => item.loanID !== loanID),
      active_loans: Math.max(0, current.active_loans - 1),
    }));
    setNotice(result.message);
    setReturnLoan(null);
  }

  if (error) {
    return <p className="catalog-error">Error: {error}</p>;
  }

  if (!data) {
    return <p className="catalog-message">Loading your loans...</p>;
  }

  return (
    <div className="loans-page">
      <header className="loans-header">
        <h1 className="loans-title">My loans</h1>
        <p className="loans-subtitle">
          Here are the items you currently have borrowed from the library.
        </p>
      </header>

      {/* Summary cards */}
      <section className="loans-stats">
        <div className="loans-stat">
          <span className="loans-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
              <path d="M4 5.5v16" />
              <path d="M9 7h6" />
            </svg>
          </span>
          <div>
            <span className="loans-stat-label">Active loans</span>
            <span className="loans-stat-value">
              {data.active_loans}
              {data.max_loans !== null && (
                <span className="loans-stat-limit"> / {data.max_loans}</span>
              )}
            </span>
          </div>
        </div>

        <div className="loans-stat">
          <span className="loans-stat-icon loans-stat-icon-holds" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div>
            <span className="loans-stat-label">Holds</span>
            <span className="loans-stat-value">{data.holds}</span>
          </div>
        </div>
      </section>

      {notice && <p className="loans-notice">{notice}</p>}

      {/* Loans table */}
      {data.loans.length === 0 ? (
        <section className="loans-empty">
          <p>You don&apos;t have anything borrowed right now.</p>
          <button type="button" className="loans-browse-button" onClick={onBrowse}>
            Browse the catalog
          </button>
        </section>
      ) : (
        <section className="loans-table-wrap">
          <table className="loans-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Due date</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {data.loans.map((loan) => {
                const status = getStatus(loan);

                return (
                  <tr key={loan.loanID}>
                    <td>
                      <div className="loans-book">
                        <span
                          className={`loans-cover ${
                            coverClasses[loan.item_type] || "loans-cover-default"
                          }`}
                          aria-hidden="true"
                        />
                        <div>
                          <span className="loans-book-title">{loan.title}</span>
                          {loan.creator && (
                            <span className="loans-book-author">{loan.creator}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td data-label="Due date">{formatDueDate(loan.due_date)}</td>

                    <td data-label="Status">
                      <span className={`loans-status ${status.className}`}>
                        <span className="loans-status-dot" aria-hidden="true" />
                        {status.label}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="loans-return-button"
                        onClick={() => setReturnLoan(loan)}
                      >
                        Return
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {returnLoan && (
        <ConfirmReturnModal
          user={user}
          loan={returnLoan}
          onClose={() => setReturnLoan(null)}
          onReturned={handleReturned}
        />
      )}
    </div>
  );
}

export default Loans;
