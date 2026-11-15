
export function money(value) {
    return "$" + Number(value || 0).toFixed(2);
}

export function usDate(value) {
    if (!value) return "—";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return `${month}/${day}/${year}`;
}

function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (typeof value === "string" && /^[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

export function downloadCSV(filename, headerRow, dataRows) {
    const lines = [headerRow, ...dataRows].map((row) =>
        row.map(csvCell).join(","),
    );
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
// chart colors
export const CHART_COLORS = {
    pair: ["#3987e5", "#c98500"],
    trio: ["#199e70", "#d95926", "#9085e9"],
    other: "#898781",
};

export const ITEM_TYPES = ["Book", "Media", "Device"];

// count rows per key
export function tally(rows, keyOf, valueOf = () => 1) {
    const out = {};
    rows.forEach((r) => {
        const k = keyOf(r);
        out[k] = (out[k] || 0) + valueOf(r);
    });
    return out;
}

// pie segments
export function segmentsFor(counts, labels, colors) {
    const known = labels.map((label, i) => ({
        label,
        value: counts[label] || 0,
        color: colors[i],
    }));
    const other = Object.keys(counts)
        .filter((k) => !labels.includes(k))
        .reduce((n, k) => n + counts[k], 0);
    return other > 0
        ? [...known, { label: "Other", value: other, color: CHART_COLORS.other }]
        : known;
}
