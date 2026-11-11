const { LoanError } = require("../loans/loans");
const { createPrintPayment, fetchPrintPayments } = require("./printing");

// Routes for print payments (librarian only).
// server.js calls handlePrintRoutes; it returns true when it answered the request.

function isID(value) {
  return Number.isInteger(value) && value > 0;
}

async function readJSON(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new LoanError(400, "Invalid JSON");
  }
}

async function handlePrintRoutes(req, res, CORS_HEADERS) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  if (path !== "/api/print-payments") {
    return false;
  }

  function send(status, body) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    });
    res.end(JSON.stringify(body));
  }

  try {
    // rates, today's totals and the latest payments
    if (req.method === "GET") {
      const librarianID = Number(url.searchParams.get("userID"));

      if (!isID(librarianID)) {
        send(400, { error: "Invalid userID" });
        return true;
      }

      send(200, await fetchPrintPayments(librarianID));
      return true;
    }

    // record a payment
    if (req.method === "POST") {
      const body = await readJSON(req);
      const librarianID = Number(body.librarianID);

      if (!isID(librarianID)) {
        send(400, { error: "Invalid librarianID" });
        return true;
      }

      let userID = null;

      if (body.userID !== undefined && body.userID !== null && body.userID !== "") {
        userID = Number(body.userID);

        if (!isID(userID)) {
          send(400, { error: "Invalid userID" });
          return true;
        }
      }

      const payment = await createPrintPayment({
        librarianID,
        userID,
        payerName: body.payerName,
        bwSheets: body.bwSheets,
        colorSheets: body.colorSheets,
        customAmount: body.customAmount,
        paymentMethod: body.paymentMethod,
        note: body.note,
      });

      send(201, {
        message: `Recorded $${payment.amount_charged.toFixed(2)} from ${payment.payer_name}.`,
        payment,
      });
      return true;
    }
  } catch (error) {
    if (error instanceof LoanError) {
      send(error.status, { error: error.message });
      return true;
    }

    console.error("Error handling", req.method, path, error);
    send(500, { error: "Something went wrong on the server" });
    return true;
  }

  return false;
}

module.exports = { handlePrintRoutes };
