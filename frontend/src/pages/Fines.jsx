import { useEffect, useState } from "react";
import "../styles/Loans.css";
import "../styles/HoldsFines.css";

const TABS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
];

// "2026-10-25" -> "Oct 25, 2026" (built from parts so the timezone can't shift the day)
function formatDate(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

// asks the server for every fine of one user
async function fetchFines(userID) {
  const response = await fetch(
    `http://localhost:3000/api/fines/user/${userID}`,
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to load fines");
  }

  return result;
}

function Fines({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [paying, setPaying] = useState(null);

  // load when the page opens
  useEffect(() => {
    fetchFines(user.userID)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [user.userID]);

  async function handlePay(fine) {
    if (!window.confirm(`Pay ${money(fine.amount)} for "${fine.title}"?`)) {
      return;
    }

    setPaying(fine.fineID);
    setNotice("");
    setActionError("");

    try {
      const response = await fetch("http://localhost:3000/api/fines/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: user.userID, fineID: fine.fineID }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not pay this fine");
      }

      setNotice(result.message);
      setData(await fetchFines(user.userID));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPaying(null);
    }
  }

  if (error) {
    return <p className="catalog-error">Error: {error}</p>;
  }

  if (!data) {
    return <p className="catalog-message">Loading your fines...</p>;
  }

  const rows = data.fines.filter((fine) =>
    tab === "all" ? true : tab === "paid" ? fine.paid : !fine.paid,
  );

  return (
    <div className="loans-page">
      <header className="loans-header hf-section-header">
        <h2 className="loans-title">My fines</h2>
        <p className="loans-subtitle">
          Charges on your account. Late fees are {money(data.late_fee_per_day)}{" "}
          for each day an item is kept past its due date.
        </p>
      </header>

      <section className="loans-stats">
        <div className="loans-stat">
          <span
            className="loans-stat-icon loans-stat-icon-holds"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M15 9.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2-3-.9-3-2" />
            </svg>
          </span>
          <div>
            <span className="loans-stat-label">Unpaid</span>
            <span className="loans-stat-value">{money(data.unpaid_total)}</span>
          </div>
        </div>

        <div className="loans-stat">
          <span className="loans-stat-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          <div>
            <span className="loans-stat-label">Paid so far</span>
            <span className="loans-stat-value">{money(data.paid_total)}</span>
          </div>
        </div>
      </section>

      {notice && <p className="loans-notice">{notice}</p>}
      {actionError && <p className="loans-action-error">{actionError}</p>}

      <div className="hf-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`hf-tab ${tab === item.key ? "hf-tab-active" : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <section className="loans-empty">
          <p>
            {tab === "paid"
              ? "You haven't paid any fines yet."
              : "No fines. Thanks for returning things on time!"}
          </p>
        </section>
      ) : (
        <section className="loans-table-wrap">
          <table className="loans-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Charge</th>
                <th scope="col">Issued</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((fine) => (
                <tr key={fine.fineID}>
                  <td>
                    <span className="loans-book-title">{fine.title}</span>
                    {fine.due_date && (
                      <span className="loans-book-author">
                        Due {formatDate(fine.due_date)}
                        {fine.returned_date
                          ? `, returned ${formatDate(fine.returned_date)}`
                          : ", not returned yet"}
                      </span>
                    )}
                  </td>

                  <td data-label="Charge">
                    {fine.charge_type}
                    {fine.days_late > 0 && (
                      <span className="hf-queue-note">
                        {fine.days_late} day{fine.days_late === 1 ? "" : "s"}{" "}
                        late
                      </span>
                    )}
                  </td>

                  <td data-label="Issued">{formatDate(fine.issue_date)}</td>

                  <td data-label="Amount" className="hf-amount">
                    {money(fine.amount)}
                  </td>

                  <td data-label="Status">
                    <span
                      className={`loans-status ${
                        fine.paid ? "hf-status-paid" : "hf-status-unpaid"
                      }`}
                    >
                      <span className="loans-status-dot" aria-hidden="true" />
                      {fine.paid
                        ? "Paid"
                        : fine.still_out
                          ? "Unpaid (still growing)"
                          : "Unpaid"}
                    </span>
                  </td>

                  <td>
                    {fine.paid ? (
                      "-"
                    ) : (
                      <button
                        type="button"
                        className="loans-return-button"
                        onClick={() => handlePay(fine)}
                        disabled={paying === fine.fineID || fine.still_out}
                        title={
                          fine.still_out ? "Return the item first" : undefined
                        }
                      >
                        {paying === fine.fineID ? "Paying..." : "Pay"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.fines.some((fine) => fine.still_out && !fine.paid) && (
        <p className="hf-note">
          Late fees for items you still have keep going up each day. You can pay
          them once the item is returned.
        </p>
      )}
    </div>
  );
}

export default Fines;
