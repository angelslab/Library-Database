import { useEffect, useRef, useState } from "react";
import { downloadLoansReport, formatLoanDate, getLoanStatus,} from "../utils/loansReport";
import ConfirmApproveModal from "./ConfirmApproveModal";

const API = "http://localhost:3000";

// which loans each tab shows
const tabs = [
  { key: "current", label: "Current loans", test: (loan) => !loan.returned_date },
  {
    key: "requests",
    label: "Return requests",
    test: (loan) => !loan.returned_date && loan.status === "return_requested",
  },
  { key: "past", label: "Past loans", test: (loan) => Boolean(loan.returned_date) },
  { key: "all", label: "All loans", test: () => true },
];

// which date the range applies to
const dateFields = [
  { key: "borrow_date", label: "Borrowed date" },
  { key: "due_date", label: "Due date" },
  { key: "returned_date", label: "Returned date" },
];

const presets = [
  { key: "all", label: "All time" },
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "custom", label: "Custom range" },
];

// "2026-10-25" from a Date, in the browser's time zone
function toISODate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

function getRange(preset, customFrom, customTo) {
  if (preset === "all") return { from: "", to: "" };
  if (preset === "custom") return { from: customFrom, to: customTo };

  return { from: daysAgo(Number(preset)), to: toISODate(new Date()) };
}

function matchesKeyword(loan, keyword) {
  if (!keyword) return true;

  const haystack = [
    loan.loanID,
    loan.borrower,
    loan.email,
    loan.role,
    loan.title,
    loan.item_type,
    loan.creator,
    loan.isbn,
  ]
    .join(" ")
    .toLowerCase();

  return keyword
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

const cell = {
  padding: "8px 12px",
  borderBottom: "1px solid rgba(128,128,128,0.4)",
  verticalAlign: "top",
};

const statusColors = {
  "On loan": "#1f6f3f",
  Overdue: "#8a2d2d",
  "Return requested": "#9a6b00",
  Returned: "#555",
};

const smallText = { display: "block", fontSize: 12, opacity: 0.75 };

function LibrarianLoans({ user, focusLoanID = null }) {
  const [loans, setLoans] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [approveLoan, setApproveLoan] = useState(null);

  const [tab, setTab] = useState(focusLoanID ? "requests" : "current");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [dateField, setDateField] = useState("borrow_date");
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const focusRef = useRef(null);

  useEffect(() => {
    async function fetchLoans() {
      try {
        const response = await fetch(`${API}/api/loans/all?userID=${user.userID}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load loans");
        }

        setLoans(data.loans);

        // coming from a notification: show that loan (it may already have been handled)
        if (focusLoanID) {
          const focused = data.loans.find((loan) => loan.loanID === focusLoanID);
          const waiting =
            focused && !focused.returned_date && focused.status === "return_requested";

          setTab(waiting ? "requests" : "all");
        }
      } catch (err) {
        setError(
          err instanceof TypeError ? "Cannot reach the server. Please try again." : err.message,
        );
      }
    }

    fetchLoans();
  }, [user.userID, focusLoanID]);

  // scroll the loan from the notification into view
  useEffect(() => {
    if (loans && focusRef.current) {
      focusRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [loans, tab]);

  // called by the popup after the server approved the return
  function handleApproved(data) {
    const loanID = approveLoan.loanID;

    setLoans((current) =>
      current.map((item) =>
        item.loanID === loanID
          ? { ...item, status: "returned", returned_date: data.loan.returned_date }
          : item,
      ),
    );
    setNotice(`${data.message} The borrower has been notified.`);
    setApproveLoan(null);
  }

  function handleSearch(event) {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  }

  if (error) {
    return <p style={{ color: "#ff7b7b", marginTop: 20 }}>Error: {error}</p>;
  }

  if (!loans) {
    return <p style={{ marginTop: 20 }}>Loading loans...</p>;
  }

  // search + date range first, then the tab
  const range = getRange(preset, customFrom, customTo);
  const dateFieldLabel = dateFields.find((field) => field.key === dateField).label;

  const filtered = loans
    .filter((loan) => matchesKeyword(loan, keyword))
    .filter((loan) => {
      if (!range.from && !range.to) return true;

      const value = loan[dateField];

      if (!value) return false;
      if (range.from && value < range.from) return false;
      if (range.to && value > range.to) return false;

      return true;
    });

  const activeTab = tabs.find((item) => item.key === tab);
  const visible = filtered.filter(activeTab.test);

  const waitingCount = loans.filter(tabs[1].test).length;

  const dateLabel =
    !range.from && !range.to
      ? "All dates"
      : `${dateFieldLabel}: ${range.from ? formatLoanDate(range.from) : "any"} to ${
          range.to ? formatLoanDate(range.to) : "any"
        }`;

  const buttonStyle = (active) => ({
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
    background: active ? "#4075aa" : undefined,
    color: active ? "#fff" : undefined,
  });

  return (
    <div style={{ marginTop: 20, textAlign: "left" }}>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search by borrower, email, title, author, brand, ISBN, or loan number"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Search</button>
        {keyword && (
          <button
            type="button"
            onClick={() => {
              setKeywordInput("");
              setKeyword("");
            }}
          >
            Clear
          </button>
        )}
      </form>

      {waitingCount > 0 && tab !== "requests" && (
        <p
          style={{
            marginTop: 16,
            padding: "10px 12px",
            border: "1px solid #9a6b00",
            background: "rgba(229,191,109,0.12)",
            borderRadius: 6,
          }}
        >
          {waitingCount} return {waitingCount === 1 ? "request is" : "requests are"} waiting for
          your approval.{" "}
          <button
            type="button"
            onClick={() => {
              setTab("requests");
              setPreset("all");
              setKeyword("");
              setKeywordInput("");
            }}
          >
            View requests
          </button>
        </p>
      )}

      {/* tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            style={buttonStyle(tab === item.key)}
          >
            {item.label} ({filtered.filter(item.test).length})
          </button>
        ))}
      </div>

      {/* date range */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <label>
          Date range for{" "}
          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value)}
            style={{ padding: 6 }}
          >
            {dateFields.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presets.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPreset(item.key)}
              style={buttonStyle(preset === item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <>
            <label>
              From{" "}
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: 6, colorScheme: "dark" }}
              />
            </label>
            <label>
              To{" "}
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ padding: 6, colorScheme: "dark" }}
              />
            </label>
          </>
        )}
      </div>

      {/* summary + PDF */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        <span style={{ opacity: 0.8 }}>
          Showing {visible.length} of {loans.length} loans ({activeTab.label.toLowerCase()},{" "}
          {dateLabel.toLowerCase()})
        </span>

        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() => {
            setActionError("");

            downloadLoansReport({
              loans: visible,
              viewLabel: activeTab.label,
              dateLabel,
              keyword,
              generatedBy: `${user.first_name} ${user.last_name}`,
            }).catch(() => setActionError("Could not create the PDF. Please try again."));
          }}
          style={{ padding: "8px 14px" }}
        >
          Download PDF report ({visible.length})
        </button>
      </div>

      {notice && (
        <p
          style={{
            marginTop: 16,
            padding: "10px 12px",
            border: "1px solid #2f7a55",
            background: "rgba(95,191,138,0.12)",
            borderRadius: 6,
          }}
        >
          {notice}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          style={{
            marginTop: 16,
            padding: "10px 12px",
            border: "1px solid #f14d4c",
            background: "rgba(241,77,76,0.18)",
            borderRadius: 6,
          }}
        >
          {actionError}
        </p>
      )}

      {visible.length === 0 ? (
        <p style={{ opacity: 0.8, marginTop: 16 }}>No loans match these filters.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              marginTop: 16,
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr>
                <th style={cell}>Loan #</th>
                <th style={cell}>Borrower</th>
                <th style={cell}>Item</th>
                <th style={cell}>Borrowed</th>
                <th style={cell}>Due</th>
                <th style={cell}>Returned</th>
                <th style={cell}>Status</th>
                <th style={cell}>Action</th>
              </tr>
            </thead>

            <tbody>
              {visible.map((loan) => {
                const status = getLoanStatus(loan);
                const isFocused = loan.loanID === focusLoanID;

                return (
                  <tr
                    key={loan.loanID}
                    ref={isFocused ? focusRef : undefined}
                    style={
                      isFocused
                        ? {
                            background: "rgba(229,191,109,0.18)",
                            outline: "2px solid #e5bf6d",
                          }
                        : undefined
                    }
                  >
                    <td style={cell}>{loan.loanID}</td>
                    <td style={cell}>
                      {loan.borrower}
                      <span style={smallText}>
                        {loan.email} · {loan.role}
                      </span>
                    </td>
                    <td style={cell}>
                      {loan.title}
                      <span style={smallText}>
                        {[loan.item_type, loan.creator].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td style={cell}>{formatLoanDate(loan.borrow_date)}</td>
                    <td style={cell}>{formatLoanDate(loan.due_date)}</td>
                    <td style={cell}>{formatLoanDate(loan.returned_date)}</td>
                    <td style={cell}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 13,
                          color: "white",
                          background: statusColors[status],
                          whiteSpace: "nowrap",
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={cell}>
                      {status === "Return requested" ? (
                        <button
                          type="button"
                          onClick={() => setApproveLoan(loan)}
                        >
                          Approve return
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {approveLoan && (
        <ConfirmApproveModal
          librarian={user}
          loan={approveLoan}
          onClose={() => setApproveLoan(null)}
          onApproved={handleApproved}
        />
      )}

    </div>
  );
}

export default LibrarianLoans;
