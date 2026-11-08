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

function NotifIcon({ type }) {
  const paths =
    type === "return_request" ? (
      <>
        <path d="M9 14l-4-4 4-4" />
        <path d="M5 10h11a4 4 0 0 1 0 8h-2" />
      </>
    ) : (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    );
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  );
}

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

  const C = {
    card: "#10253e", border: "#263e59", fg: "#e6ecf2", muted: "#8295a9",
    gold: "#e5bf6d", primary: "#4075aa", pfg: "#f6f9fc", green: "#5fbf8a",
  };

  if (error)
    return (
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontFamily: "Georgia, serif" }}>Notifications</h2>
        <p style={{ color: "#f3a0a0" }}>{error}</p>
      </div>
    );

  if (!notifications)
    return (
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontFamily: "Georgia, serif" }}>Notifications</h2>
        <p style={{ color: C.muted }}>Loading…</p>
      </div>
    );

  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <div style={{ marginTop: 20, maxWidth: 820 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "0 0 4px" }}>
            Notifications
          </h2>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: C.muted,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
          }}
        >
          No notifications yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map((item) => {
          const isUnread = !item.is_read;
          const pending =
            item.type === "return_request" &&
            user.role === "librarian" &&
            Boolean(item.loan_pending);
          const handled =
            item.type === "return_request" &&
            user.role === "librarian" &&
            !item.loan_pending;

          return (
            <div
              key={item.notificationID}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: isUnread ? "rgb(229 191 109 / 7%)" : C.card,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${isUnread ? C.gold : "transparent"}`,
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  flexShrink: 0,
                  color: isUnread ? C.gold : C.muted,
                  background: "#193550",
                }}
              >
                <NotifIcon type={item.type} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: isUnread ? 600 : 400, fontSize: 14, lineHeight: 1.45 }}>
                  {item.message}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  {formatTime(item.created_at)}
                </div>
              </div>

              {pending && (
                <button
                  type="button"
                  onClick={() => handleReview(item)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 9,
                    background: C.primary,
                    border: "none",
                    color: C.pfg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Review return
                </button>
              )}

              {handled && (
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.green,
                    background: "rgb(95 191 138 / 14%)",
                    flexShrink: 0,
                  }}
                >
                  Handled
                </span>
              )}

              {isUnread && !pending && !handled && (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: C.gold,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Notification;
