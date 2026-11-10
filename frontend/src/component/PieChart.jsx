import { useState } from "react";
import "../styles/PieChart.css";

const SIZE = 180;
const R = 84; // radius (leaves room for the hovered slice to pop out)
const C = SIZE / 2;
const POP = 5; // how far a hovered slice moves out, in px

// whole-number percentages that always add up to 100 (largest remainder)
function percentages(segments, sum) {
  if (sum === 0) return segments.map(() => 0);
  const raw = segments.map((s) => (s.value / sum) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, rest: r - Math.floor(r) }))
    .sort((a, b) => b.rest - a.rest)
    .forEach(({ i }) => {
      if (left > 0 && segments[i].value > 0) {
        out[i] += 1;
        left -= 1;
      }
    });
  return out;
}

// point on the circle at a fraction (0..1) of the way round, starting at 12 o'clock
function point(frac, r = R) {
  const a = frac * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function slicePath(start, end) {
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

// Reusable SVG pie chart (no dependency).
// segments: [{ label, value, color }] in a fixed order, so a colour always
// means the same thing no matter how the numbers change.
// format: how to show a value, e.g. (v) => "$" + v.toFixed(2); defaults to "N unit"
function PieChart({ title, unit = "items", format, segments = [] }) {
  // "1 item" / "3 items"
  const show =
    format || ((v) => `${v} ${v === 1 ? unit.replace(/s$/, "") : unit}`);
  const [active, setActive] = useState(null); // label of the hovered slice
  const [tip, setTip] = useState(null); // { x, y } inside the chart box

  const sum = segments.reduce((s, x) => s + (x.value || 0), 0);
  const shares = percentages(segments, sum);
  const pct = (seg) => shares[segments.findIndex((x) => x.label === seg.label)];

  // each slice runs from where the previous one ended
  const slices = segments
    .filter((s) => s.value > 0)
    .reduce((list, seg) => {
      const start = list.length > 0 ? list[list.length - 1].end : 0;
      return [...list, { ...seg, start, end: start + seg.value / sum }];
    }, []);

  const activeSeg = segments.find((s) => s.label === active);

  const showTip = (label, e) => {
    setActive(label);
    if (e && e.clientX !== undefined) {
      const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
      setTip({ x: e.clientX - box.left, y: e.clientY - box.top });
    } else {
      setTip({ x: C, y: C }); // keyboard focus: centre of the pie
    }
  };
  const hideTip = () => {
    setActive(null);
    setTip(null);
  };

  return (
    <figure className="pie-card">
      <figcaption className="pie-head">
        <span className="pie-title">{title}</span>
        <span className="pie-total">
          {show(sum)}
        </span>
      </figcaption>

      {sum === 0 ? (
        <p className="pie-empty">Nothing to show for these parameters.</p>
      ) : (
        <div className="pie-body">
          <div className="pie-chart" style={{ width: SIZE, height: SIZE }}>
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`${title}: ${segments
                .map((s) => `${s.label} ${show(s.value)} (${pct(s)}%)`)
                .join(", ")}`}
            >
              {slices.map((s) => {
                const isOn = active === s.label;
                const dim = active && !isOn;
                // move the hovered slice out along its middle angle
                const [mx, my] = point((s.start + s.end) / 2, POP);
                const shift = isOn && slices.length > 1
                  ? `translate(${mx - C}px, ${my - C}px)`
                  : "none";
                const common = {
                  fill: s.color,
                  className: "pie-slice",
                  style: { transform: shift, opacity: dim ? 0.45 : 1 },
                  tabIndex: 0,
                  "aria-label": `${s.label}: ${show(s.value)}, ${pct(s)}%`,
                  onMouseMove: (e) => showTip(s.label, e),
                  onMouseLeave: hideTip,
                  onFocus: () => showTip(s.label),
                  onBlur: hideTip,
                };
                return slices.length === 1 ? (
                  <circle key={s.label} cx={C} cy={C} r={R} {...common} />
                ) : (
                  <path key={s.label} d={slicePath(s.start, s.end)} {...common} />
                );
              })}
            </svg>

            {activeSeg && tip && (
              <div
                className="pie-tip"
                style={{ left: tip.x, top: tip.y }}
                role="status"
              >
                <span className="pie-tip-label">
                  <span className="pie-swatch" style={{ background: activeSeg.color }} />
                  {activeSeg.label}
                </span>
                <span className="pie-tip-value">
                  {show(activeSeg.value)} · {pct(activeSeg)}%
                </span>
              </div>
            )}
          </div>

          <ul className="pie-legend">
            {segments.map((s) => (
              <li
                key={s.label}
                className={`pie-leg ${active && active !== s.label ? "dim" : ""}`}
                onMouseEnter={() => s.value > 0 && setActive(s.label)}
                onMouseLeave={hideTip}
              >
                <span className="pie-swatch" style={{ background: s.color }} />
                <span className="pie-leg-label">{s.label}</span>
                <span className="pie-leg-value">{format ? format(s.value) : s.value}</span>
                <span className="pie-leg-pct">{pct(s)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}

export default PieChart;
