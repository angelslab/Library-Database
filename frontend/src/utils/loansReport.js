// What a loan is called on screen and in the PDF
export function getLoanStatus(loan) {
  if (loan.returned_date) return "Returned";
  if (loan.status === "return_requested") return "Return requested";
  if (loan.days_left !== null && loan.days_left < 0) return "Overdue";
  return "On loan";
}

export function formatLoanDate(value) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/*
 * Builds a PDF of the loans that are on screen and downloads it.
 */
export async function downloadLoansReport({
  loans,
  viewLabel,
  dateLabel,
  keyword,
  generatedBy,
}) {
  // loaded only when the button is clicked, so the PDF library doesn't slow down the rest of the site
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  const now = new Date();

  // ---- heading ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Library Loans Report", margin, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);

  const lines = [
    `Generated: ${now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}${
      generatedBy ? ` by ${generatedBy}` : ""
    }`,
    `View: ${viewLabel}`,
    `Date filter: ${dateLabel}`,
  ];

  if (keyword) {
    lines.push(`Search: "${keyword}"`);
  }

  lines.forEach((line, index) => doc.text(line, margin, 68 + index * 14));

  // ---- summary ----
  const counts = {
    total: loans.length,
    current: loans.filter((loan) => !loan.returned_date).length,
    overdue: loans.filter((loan) => getLoanStatus(loan) === "Overdue").length,
    requests: loans.filter((loan) => getLoanStatus(loan) === "Return requested").length,
    returned: loans.filter((loan) => loan.returned_date).length,
  };

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${counts.total} loans   |   ${counts.current} checked out   |   ${counts.overdue} overdue   |   ${counts.requests} return requests   |   ${counts.returned} returned`,
    pageWidth - margin,
    48,
    { align: "right" },
  );

  // ---- table ----
  autoTable(doc, {
    startY: 68 + lines.length * 14 + 6,
    margin: { left: margin, right: margin, bottom: 40 },
    head: [["Loan #", "Borrower", "Role", "Item", "Borrowed", "Due", "Returned", "Status"]],
    body: loans.map((loan) => [
      loan.loanID,
      `${loan.borrower}\n${loan.email}`,
      loan.role,
      loan.creator ? `${loan.title}\n${loan.creator}` : loan.title,
      formatLoanDate(loan.borrow_date),
      formatLoanDate(loan.due_date),
      formatLoanDate(loan.returned_date),
      getLoanStatus(loan),
    ]),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [25, 53, 80], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
    columnStyles: {
      0: { cellWidth: 40 },
      2: { cellWidth: 50 },
      4: { cellWidth: 68 },
      5: { cellWidth: 68 },
      6: { cellWidth: 68 },
      7: { cellWidth: 80 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 7) {
        const status = String(data.cell.raw);

        if (status === "Overdue") data.cell.styles.textColor = [180, 30, 30];
        if (status === "Return requested") data.cell.styles.textColor = [160, 100, 0];
        if (status === "Returned") data.cell.styles.textColor = [90, 90, 90];

        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  if (loans.length === 0) {
    doc.setFontSize(11);
    doc.text("No loans match these filters.", margin, doc.lastAutoTable.finalY + 24);
  }

  // ---- page numbers ----
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(120);

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 20, {
      align: "right",
    });
  }

  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  doc.save(`loans-report-${stamp}.pdf`);
}
