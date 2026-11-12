import { useState } from "react";
import API_URL from "../api";

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  facultyID: "",
  department: "",
};

// Librarian-only form: faculty cannot sign themselves up, a librarian creates the account.
function AddFacultyForm({ librarianID, onCreated, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/users/faculty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, librarianID }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create the account");
        return;
      }

      onCreated(data);
    } catch (err) {
      setError("Cannot reach server: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = { display: "flex", flexDirection: "column", fontSize: 13, gap: 4 };
  const input = {
    padding: "9px 12px",
    background: "#0e1f36",
    border: "1px solid #263e59",
    borderRadius: 8,
    color: "#e6ecf2",
    fontSize: 14,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#10253e",
        border: "1px solid #263e59",
        borderRadius: 14,
        padding: 18,
        marginBottom: 20,
        maxWidth: 640,
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Add faculty account</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={field}>
          First name
          <input style={input} value={form.first_name} onChange={update("first_name")} required />
        </label>
        <label style={field}>
          Last name
          <input style={input} value={form.last_name} onChange={update("last_name")} required />
        </label>
        <label style={{ ...field, gridColumn: "1 / span 2" }}>
          Email
          <input style={input} type="email" value={form.email} onChange={update("email")} required />
        </label>
        <label style={field}>
          Faculty ID
          <input style={input} type="number" min="1" value={form.facultyID} onChange={update("facultyID")} required />
        </label>
        <label style={field}>
          Department
          <input
            style={input}
            placeholder="e.g. CS"
            value={form.department}
            onChange={(e) => {
              setForm({ ...form, department: e.target.value.toUpperCase() });
              setError("");
            }}
            required
          />
        </label>
        <label style={{ ...field, gridColumn: "1 / span 2" }}>
          Password
          <input style={input} type="text" value={form.password} onChange={update("password")} required />
        </label>
      </div>

      {error && <p style={{ color: "#f3a0a0", margin: "12px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create faculty account"}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddFacultyForm;
