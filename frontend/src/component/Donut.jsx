// Reusable SVG donut chart (no dependency). Pass segments [{label, value, color}].
function Donut({ total, totalLabel, segments = [] }) {
  const R = 52;
  const C = 2 * Math.PI * R; // circumference
  const sum = segments.reduce((s, x) => s + (x.value || 0), 0);

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const len = sum > 0 ? (seg.value / sum) * C : 0;
      const arc = { ...seg, dash: `${len} ${C}`, dashoffset: -offset };
      offset += len;
      return arc;
    });

  return (
    <div className="donut-row">
      <div className="donut">
        <svg width="150" height="150" viewBox="0 0 150 150" className="donut-svg">
          <circle cx="75" cy="75" r={R} fill="none" stroke="#193550" strokeWidth="20" />
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx="75"
              cy="75"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth="20"
              strokeDasharray={a.dash}
              strokeDashoffset={a.dashoffset}
            />
          ))}
        </svg>
        <div className="donut-mid">
          <div className="donut-big">{total}</div>
          <div className="donut-lbl">{totalLabel}</div>
        </div>
      </div>

      <div className="donut-legend">
        {segments.map((s, i) => (
          <div className="donut-leg" key={i}>
            <span className="donut-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="donut-n">
              {s.value} · {sum > 0 ? Math.round((s.value / sum) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Donut;
