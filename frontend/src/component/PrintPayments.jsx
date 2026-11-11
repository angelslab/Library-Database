import { useCallback, useEffect, useMemo, useState } from "react";
import API_URL from "../api";
import "../styles/PrintPayments.css";

// Printing rates are shown from the server's answer; these are only the fallback
// used for the live total until the first response arrives. The server always
// recalculates the real price when a payment is recorded.
const FALLBACK_RATES = { bw: 0.1, color: 0.2 };

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

// whole cents, so 0.10 + 0.20 never shows as 0.30000000000000004
function totalFor(bw, color, rates) {
  const cents = bw * Math.round(rates.bw * 100) + color * Math.round(rates.color * 100);
  return cents / 100;
}

function wholeNumber(text) {
  if (text === "") return 0;
  const number = Number(text);
  return Number.isInteger(number) && number >= 0 ? number : NaN;
}

function PrintPayments({ user }) {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [today, setToday] = useState(null);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [payer, setPayer] = useState(null); // a library user, or null for walk-in
  const [walkInName, setWalkInName] = useState("");
  const [bwText, setBwText] = useState("");
  const [colorText, setColorText] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPayments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/print-payments?userID=${user.userID}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load print payments.");
        return;
      }

      setRates(data.rates);
      setToday(data.today);
      setPayments(data.payments);
    } catch (err) {
      setError(`Cannot reach server: ${err.message}`);
    }
  }, [user.userID]);

  useEffect(() => {
    const first = setTimeout(loadPayments, 0);
    return () => clearTimeout(first);
  }, [loadPayments]);

  // all users once, filtered on the page while typing
  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const response = await fetch(`${API_URL}/api/users?q=`);
        const data = await response.json();

        if (!cancelled && response.ok && Array.isArray(data)) {
          setUsers(data);
        }
      } catch {
        // the librarian can still record a walk-in payment
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    return users
      .filter((u) => {
        const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
        return (
          name.includes(term) ||
          String(u.email || "").toLowerCase().includes(term) ||
          String(u.id_number || "").toLowerCase().includes(term)
        );
      })
      .slice(0, 6);
  }, [users, search]);

  const bw = wholeNumber(bwText);
  const color = wholeNumber(colorText);
  const sheetsValid = !Number.isNaN(bw) && !Number.isNaN(color);
  const computed = sheetsValid ? totalFor(bw, color, rates) : 0;

  const customNumber = customText === "" ? NaN : Number(customText);
  const customValid = !useCustom || (Number.isFinite(customNumber) && customNumber >= 0);
  const changed = useCustom && customValid && Math.round(customNumber * 100) !== Math.round(computed * 100);

  const canSave =
    sheetsValid &&
    bw + color > 0 &&
    customValid &&
    (!changed || note.trim() !== "") &&
    !saving;

  function pickPayer(u) {
    setPayer(u);
    setSearch("");
  }

  function clearForm() {
    setPayer(null);
    setWalkInName("");
    setSearch("");
    setBwText("");
    setColorText("");
    setUseCustom(false);
    setCustomText("");
    setMethod("cash");
    setNote("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/print-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          librarianID: user.userID,
          userID: payer ? payer.userID : null,
          payerName: payer ? "" : walkInName,
          bwSheets: bw,
          colorSheets: color,
          customAmount: useCustom ? customNumber : undefined,
          paymentMethod: method,
          note,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not record the payment.");
        return;
      }

      setSuccess(
        `Payment successful: ${money(data.payment.amount_charged)} from ${data.payment.payer_name}.`,
      );
      clearForm();
      loadPayments();
    } catch (err) {
      setError(`Cannot reach server: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pp">
      <h2 className="dash-h">Print Payments</h2>
      <p className="dash-sub">
        Black ink {money(rates.bw)} per sheet · Colored ink {money(rates.color)} per sheet
      </p>

      {today && (
        <div className="pp-today">
          <div className="pp-stat">
            <span className="pp-stat-num">{money(today.total)}</span>
            <span className="pp-stat-label">Collected today</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-num">{today.count}</span>
            <span className="pp-stat-label">Payments today</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-num">{today.bw_sheets}</span>
            <span className="pp-stat-label">Black sheets</span>
          </div>
          <div className="pp-stat">
            <span className="pp-stat-num">{today.color_sheets}</span>
            <span className="pp-stat-label">Color sheets</span>
          </div>
        </div>
      )}

      <div className="pp-grid">
        <form className="pp-card" onSubmit={handleSubmit}>
          <h3 className="dash-h3">New payment</h3>

          <label className="pp-label" htmlFor="pp-payer">
            Who is paying
          </label>
          {payer ? (
            <div className="pp-chosen">
              <span>
                {payer.first_name} {payer.last_name}
                <small> · {payer.role}</small>
              </span>
              <button type="button" className="pp-link" onClick={() => setPayer(null)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                id="pp-payer"
                className="pp-input"
                placeholder="Search a student or faculty member…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              {matches.length > 0 && (
                <ul className="pp-matches">
                  {matches.map((u) => (
                    <li key={u.userID}>
                      <button type="button" onClick={() => pickPayer(u)}>
                        {u.first_name} {u.last_name}
                        <small>
                          {u.email} · {u.role}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                className="pp-input pp-walkin"
                placeholder="…or type a name for a walk-in (optional)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                maxLength={100}
              />
            </>
          )}

          <div className="pp-row">
            <div>
              <label className="pp-label" htmlFor="pp-bw">
                Black sheets
              </label>
              <input
                id="pp-bw"
                className="pp-input"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={bwText}
                onChange={(e) => setBwText(e.target.value)}
              />
              <span className="pp-hint">{money(rates.bw)} each</span>
            </div>
            <div>
              <label className="pp-label" htmlFor="pp-color">
                Color sheets
              </label>
              <input
                id="pp-color"
                className="pp-input"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={colorText}
                onChange={(e) => setColorText(e.target.value)}
              />
              <span className="pp-hint">{money(rates.color)} each</span>
            </div>
          </div>

          {!sheetsValid && <p className="pp-error">Sheets must be whole numbers, 0 or more.</p>}

          <div className="pp-total">
            <span>Total at the standard rate</span>
            <strong>{money(computed)}</strong>
          </div>

          <label className="pp-check">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => {
                setUseCustom(e.target.checked);
                if (e.target.checked && customText === "") setCustomText(computed.toFixed(2));
              }}
            />
            Charge a custom amount instead
          </label>

          {useCustom && (
            <>
              <label className="pp-label" htmlFor="pp-custom">
                Custom amount ($)
              </label>
              <input
                id="pp-custom"
                className="pp-input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              {!customValid && <p className="pp-error">Enter an amount of 0 or more.</p>}
              {changed && <p className="pp-hint">A note is required when the amount is changed.</p>}
            </>
          )}

          <label className="pp-label" htmlFor="pp-method">
            Payment method
          </label>
          <select
            id="pp-method"
            className="pp-input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="card">Card (at the desk terminal)</option>
            <option value="other">Other</option>
          </select>
          <span className="pp-hint">Only the amount is recorded. No card details are stored here.</span>

          <label className="pp-label" htmlFor="pp-note">
            Note {changed ? "(required)" : "(optional)"}
          </label>
          <input
            id="pp-note"
            className="pp-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={255}
            placeholder="e.g. course handouts, reduced fee approved"
          />

          {error && <p className="pp-error">{error}</p>}
          {success && <p className="pp-success">{success}</p>}

          <button type="submit" className="pp-submit" disabled={!canSave}>
            {saving ? "Processing…" : "Paid"}
          </button>
        </form>

        <section className="pp-card">
          <h3 className="dash-h3">Recent payments</h3>
          {payments.length === 0 ? (
            <p className="pp-empty">No print payments recorded yet.</p>
          ) : (
            <div className="pp-table-wrap">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Payer</th>
                    <th>B/W</th>
                    <th>Color</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.paymentID}>
                      <td>{p.created_at}</td>
                      <td>
                        {p.payer_name}
                        {p.note && <small className="pp-note">{p.note}</small>}
                      </td>
                      <td>{p.bw_sheets}</td>
                      <td>{p.color_sheets}</td>
                      <td>
                        {money(p.amount_charged)}
                        {p.amount_charged !== p.computed_amount && (
                          <small className="pp-note">standard {money(p.computed_amount)}</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default PrintPayments;
