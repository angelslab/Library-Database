import { useEffect, useState } from "react";

function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/profile/" + user.userID)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setProfile(data);
        else setError(data.error);
      })
      .catch((err) => setError("Cannot reach server: " + err.message));
  }, [user.userID]);

  const C = {
    card: "#10253e", border: "#263e59", field: "#0e1f36",
    fg: "#e6ecf2", muted: "#8295a9", gold: "#e5bf6d", primary: "#4075aa",
    green: "#5fbf8a", red: "#f3a0a0",
  };

  if (error)
    return (
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontFamily: "Georgia, serif" }}>My Profile</h2>
        <p style={{ color: C.red }}>{error}</p>
      </div>
    );

  if (!profile)
    return (
      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontFamily: "Georgia, serif" }}>My Profile</h2>
        <p style={{ color: C.muted }}>Loading…</p>
      </div>
    );

  const initials =
    `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();

  const isLibrarian = profile.role === "librarian";
  const hasLimit = profile.max_limit !== null && profile.max_limit !== undefined;
  const remaining = hasLimit
    ? Math.max(0, profile.max_limit - profile.current_loans)
    : null;
  const fines = Number(profile.unpaid_fines || 0);

  const card = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    boxSizing: "border-box",
  };

  const Stat = ({ label, value, color }) => (
    <div style={{ ...card, padding: "18px 20px" }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: color || C.fg }}>
        {value}
      </div>
    </div>
  );

  const Row = ({ label, value }) =>
    value ? (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          padding: "13px 0",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span style={{ color: C.muted, fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 500, textAlign: "right" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div style={{ marginTop: 20, maxWidth: 760 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "0 0 18px" }}>
        My Profile
      </h2>

      {/* Header */}
      <div style={{ ...card, padding: 24, display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: "Georgia, serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#f6f9fc",
            background: "linear-gradient(145deg, #4075aa, #2a4a6b)",
          }}
        >
          {initials || "?"}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 6px" }}>
            {profile.first_name} {profile.last_name}
          </h3>
          <span
            style={{
              display: "inline-block",
              padding: "3px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "capitalize",
              color: C.gold,
              background: "rgb(229 191 109 / 14%)",
            }}
          >
            {profile.role}
          </span>
          <p style={{ color: C.muted, fontSize: 14, margin: "10px 0 0" }}>{profile.email}</p>
        </div>
      </div>

      {/* Stat tiles */}
      {!isLibrarian && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginBottom: 16,
          }}
        >
          {hasLimit && (
            <Stat label="Items borrowed" value={`${profile.current_loans} / ${profile.max_limit}`} />
          )}
          {hasLimit && (
            <Stat label="Can still borrow" value={remaining} color={C.green} />
          )}
          <Stat
            label="Unpaid fines"
            value={`$${fines.toFixed(2)}`}
            color={fines > 0 ? C.red : C.green}
          />
        </div>
      )}

      {/* Details */}
      <div style={{ ...card, padding: "6px 22px 10px" }}>
        <h4 style={{ fontFamily: "Georgia, serif", fontSize: 16, margin: "16px 0 4px" }}>
          Account details
        </h4>
        <Row label="Student ID" value={profile.studentID} />
        <Row label="Faculty ID" value={profile.facultyID} />
        <Row label="Major" value={profile.major} />
        <Row label="Department" value={profile.department} />
        <Row label="Email" value={profile.email} />
        <Row label="Role" value={profile.role} />
      </div>
    </div>
  );
}

export default Profile;
