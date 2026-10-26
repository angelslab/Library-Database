import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:3000";

// "2026-10-25 20:22:11" -> "Oct 25, 8:22 PM"
function formatTime(value) {
  const [datePart, timePart = "00:00:00"] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Props:
 *   user         - logged-in user
 *   onReviewLoan - (librarians) opens the Loans page on the loan that needs approval
 *   onChanged    - called after notifications are marked as read, so the menu badge updates
 */
function Notification({ user, onReviewLoan, onChanged }) {
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState("");

  const markRead = useCallback(
    async (notificationID) => {
      await fetch(`${API}/api/notifications/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userID: user.userID,
          ...(notificationID ? { notificationID } : {}),
        }),
      });

      onChanged?.();
    },
    [user.userID, onChanged],
  );

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch(`${API}/api/notifications/${user.userID}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load notifications");
        }

        setNotifications(data.notifications);
      } catch (err) {
        setError(
          err instanceof TypeError ? "Cannot reach the server. Please try again." : err.message,
        );
      }
    }

    loadNotifications();
  }, [user.userID]);

  async function handleMarkAllRead() {
    try {
      await markRead(null);
      setNotifications((current) => current.map((item) => ({ ...item, is_read: 1 })));
    } catch {
      setError("Cannot reach the server. Please try again.");
    }
  }

  async function handleReview(notification) {
    try {
      await markRead(notification.notificationID);
    } catch {
      // opening the loan matters more than the unread dot
    }

    onReviewLoan(notification.loanID);
  }

  if (error) {
    return <p style={{ color: "#ff7b7b", marginTop: 20 }}>{error}</p>;
  }

  if (!notifications) {
    return <p style={{ marginTop: 20 }}>Loading notifications...</p>;
  }

  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <div style={{ textAlign: "left", marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Notifications</h2>

        {unread > 0 && (
          <button type="button" onClick={handleMarkAllRead}>
            Mark all as read ({unread})
          </button>
        )}
      </div>

      {notifications.length === 0 && <p>No new notifications.</p>}

      <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
        {notifications.map((item) => (
          <li
            key={item.notificationID}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 10,
              padding: "12px 14px",
              border: "1px solid #263e59",
              borderLeft: item.is_read ? "1px solid #263e59" : "4px solid #e5bf6d",
              borderRadius: 8,
              background: item.is_read ? "transparent" : "rgba(229,191,109,0.08)",
            }}
          >
            <div>
              <div style={{ fontWeight: item.is_read ? 400 : 700 }}>{item.message}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                {formatTime(item.created_at)}
              </div>
            </div>

            {item.type === "return_request" &&
              user.role === "librarian" &&
              (item.loan_pending ? (
                <button type="button" onClick={() => handleReview(item)}>
                  Review return
                </button>
              ) : (
                <span style={{ fontSize: 13, opacity: 0.7 }}>Handled</span>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Notification;
