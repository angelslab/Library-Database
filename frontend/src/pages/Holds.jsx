import { useEffect, useState } from "react";
import "../styles/Loans.css";
import "../styles/HoldsFines.css";

const coverClasses = {
  Book: "loans-cover-book",
  Media: "loans-cover-media",
  Device: "loans-cover-device",
};

const TABS = [
  { key: "active", label: "Active" },
  { key: "cancelled", label: "Cancelled" },
  { key: "fulfilled", label: "Picked up" },
];

// "2026-10-25" -> "Oct 25, 2026" (built from parts so the timezone can't shift the day)
function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// asks the server for every hold of one user
async function fetchHolds(userID) {
  const response = await fetch(
    `http://localhost:3000/api/holds/user/${userID}`,
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to load holds");
  }

  return result;
}

function Holds({ user, onBrowse, onBorrow, onCancelHold, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");
  const [cancelling, setCancelling] = useState(null);

  // load when the page opens (and again after a borrow, when refreshKey changes)
  useEffect(() => {
    fetchHolds(user.userID)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [user.userID, refreshKey]);

  // App asks "are you sure", cancels it and shows the message at the top
  async function handleCancel(hold) {
    setCancelling(hold.holdID);

    try {
      if (await onCancelHold(hold)) {
        setData(await fetchHolds(user.userID));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(null);
    }
  }

  // the borrow popup needs the same fields as a catalog item
  function borrowFromHold(hold) {
    onBorrow({
      itemID: hold.itemID,
      title: hold.title,
      item_type: hold.item_type,
      book_author: hold.creator,
      available_copies: hold.available_copies,
      total_copies: hold.total_copies,
    });
  }

  if (error) {
    return <p className="catalog-error">Error: {error}</p>;
  }

  if (!data) {
    return <p className="catalog-message">Loading your holds...</p>;
  }

  const rows = data[tab];

  return (
    <div className="loans-page">
      <button type="button" className="hf-back-button" onClick={onBrowse}>
        ← Back to catalog
      </button>

      <header className="loans-header">
        <h1 className="loans-title">My holds</h1>
        <p className="loans-subtitle">
          Items you are waiting for. When a copy comes back, the person at the
          front of the line can borrow it.
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
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div>
            <span className="loans-stat-label">Active holds</span>
            <span className="loans-stat-value">
              {data.active.length}
              <span className="loans-stat-limit"> / {data.max_holds}</span>
            </span>
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
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
          </span>
          <div>
            <span className="loans-stat-label">Cancelled holds</span>
            <span className="loans-stat-value">{data.cancelled.length}</span>
          </div>
        </div>
      </section>

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
            {item.label} ({data[item.key].length})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <section className="loans-empty">
          <p>
            {tab === "active"
              ? "You are not waiting for anything. When an item has no copies left, use Place hold to get in line."
              : tab === "cancelled"
                ? "You have no cancelled holds."
                : "No holds picked up yet."}
          </p>
          {tab === "active" && (
            <button
              type="button"
              className="loans-browse-button"
              onClick={onBrowse}
            >
              Browse the catalog
            </button>
          )}
        </section>
      ) : (
        <section className="loans-table-wrap">
          <table className="loans-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Requested</th>
                <th scope="col">
                  {tab === "active" ? "Place in line" : "Status"}
                </th>
                {tab === "active" && <th scope="col">Action</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((hold) => (
                <tr key={hold.holdID}>
                  <td>
                    <div className="loans-book">
                      <span
                        className={`loans-cover ${
                          coverClasses[hold.item_type] || "loans-cover-default"
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <span className="loans-book-title">{hold.title}</span>
                        {hold.creator && (
                          <span className="loans-book-author">
                            {hold.creator}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td data-label="Requested">
                    {formatDate(hold.request_date)}
                  </td>

                  {tab === "active" ? (
                    <td data-label="Place in line">
                      <div>
                        <span className="hf-queue">
                          #{hold.queue_position} of {hold.queue_length}
                        </span>
                        <span className="hf-queue-note">
                          {hold.ready
                            ? "A copy is ready for you"
                            : hold.queue_position === 1
                              ? "You're next"
                              : `${hold.queue_position - 1} ahead of you`}
                        </span>
                      </div>
                    </td>
                  ) : (
                    <td data-label="Status">
                      <span
                        className={`loans-status ${
                          tab === "cancelled"
                            ? "hf-status-cancelled"
                            : "hf-status-fulfilled"
                        }`}
                      >
                        <span className="loans-status-dot" aria-hidden="true" />
                        {tab === "cancelled" ? "Cancelled" : "Borrowed"}
                      </span>
                    </td>
                  )}

                  {tab === "active" && (
                    <td>
                      <div className="hf-actions">
                        {hold.ready && (
                          <button
                            type="button"
                            className="loans-return-button"
                            onClick={() => borrowFromHold(hold)}
                          >
                            Borrow now
                          </button>
                        )}
                        <button
                          type="button"
                          className="hf-cancel-button"
                          onClick={() => handleCancel(hold)}
                          disabled={cancelling === hold.holdID}
                        >
                          {cancelling === hold.holdID
                            ? "Cancelling..."
                            : "Cancel hold"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default Holds;
