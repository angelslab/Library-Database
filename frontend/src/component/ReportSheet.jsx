import "../styles/ReportSheet.css";

// shared report components

// report header
export function Sheet({ title, period, filters, when, children }) {
  return (
    <div className="report-sheet rs">
      <header className="rs-header">
        <div>
          <h3 className="rs-title">{title}</h3>
          <p className="rs-meta">
            <span>{period}</span>
            <span className="rs-dot" aria-hidden="true">·</span>
            <span>{filters}</span>
          </p>
        </div>
        <p className="rs-run">Run on {when.toLocaleString()}</p>
      </header>
      {children}
    </div>
  );
}

// key numbers
export function Stats({ items }) {
  return (
    <div className="rs-stats">
      {items.map((s) => (
        <div key={s.label} className={`rs-stat ${s.tone ? `rs-stat-${s.tone}` : ""}`}>
          <span className="rs-stat-value">{s.value}</span>
          <span className="rs-stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// section
export function Section({ title, note, children }) {
  return (
    <section className="rs-section">
      <div className="rs-section-head">
        <h4>{title}</h4>
        {note && <span>{note}</span>}
      </div>
      <div className="rs-table-wrap">{children}</div>
    </section>
  );
}

// status label
const TONES = {
  Overdue: "bad",
  Outstanding: "warn",
  Out: "info",
  Returned: "ok",
  Collected: "ok",
  OK: "ok",
};
export function Tag({ children, tone }) {
  return (
    <span className={`rs-tag rs-tag-${tone || TONES[children] || "info"}`}>
      {children}
    </span>
  );
}
