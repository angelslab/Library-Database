const { LoanError } = require("../loans/loans");
const { syncLateFines, fetchUserFines, payFine } = require("./fines");

// Routes for fines (late fees and other charges).
// server.js calls handleFineRoutes; it returns true when it answered the request.

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

async function handleFineRoutes(req, res, CORS_HEADERS) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  function send(status, body) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    });
    res.end(JSON.stringify(body));
  }

  try {
    // the librarian's fines report and user details read the fines table too,
    // so bring late fees up to date first (their own routes still answer the request)
    if (
      req.method === "GET" &&
      (path.startsWith("/api/reports/fines") ||
        /^\/api\/users\/\d+$/.test(path))
    ) {
      await syncLateFines();
      return false;
    }

    // every fine for one user, with totals
    if (req.method === "GET" && path.startsWith("/api/fines/user/")) {
      const userID = Number(path.split("/")[4]);

      if (!isID(userID)) {
        send(400, { error: "Invalid userID" });
        return true;
      }

      const data = await fetchUserFines(userID);

      if (data === null) {
        send(404, { error: "User not found" });
        return true;
      }

      send(200, data);
      return true;
    }

    // a user pays one of their fines
    if (req.method === "POST" && path === "/api/fines/pay") {
      const { userID, fineID } = await readJSON(req);

      if (!isID(userID) || !isID(fineID)) {
        send(400, { error: "Invalid userID or fineID" });
        return true;
      }

      const result = await payFine(userID, fineID);

      send(200, {
        message: `Paid $${result.fine.amount.toFixed(2)} for "${result.fine.title}".`,
        ...result,
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

module.exports = { handleFineRoutes };
