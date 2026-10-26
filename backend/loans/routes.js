const {
  borrowItem,
  requestReturn,
  approveReturn,
  fetchUserLoans,
  fetchAllLoans,
  LoanError,
} = require("./loans");
const {
  fetchNotifications,
  markNotificationsRead,
} = require("../notifications/notifications");

// Routes for borrowing, returning and notifications.
// server.js calls handleLoanRoutes first; it returns true when it answered the request.

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

async function handleLoanRoutes(req, res, CORS_HEADERS) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  function send(status, body) {
    res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify(body));
  }

  try {
    // a student/faculty member borrows an item
    if (req.method === "POST" && path === "/api/loans/borrow") {
      const { userID, itemID } = await readJSON(req);

      if (!isID(userID) || !isID(itemID)) {
        send(400, { error: "Invalid userID or itemID" });
        return true;
      }

      const result = await borrowItem(userID, itemID);

      send(201, {
        message: `You borrowed "${result.loan.title}". It is due on ${result.loan.due_date}.`,
        ...result,
      });
      return true;
    }

    // a student/faculty member asks to return an item (the librarian has to approve it)
    if (req.method === "POST" && path === "/api/loans/request-return") {
      const { userID, loanID } = await readJSON(req);

      if (!isID(userID) || !isID(loanID)) {
        send(400, { error: "Invalid userID or loanID" });
        return true;
      }

      const result = await requestReturn(userID, loanID);

      send(200, {
        message: `Return request sent for "${result.loan.title}". It stays on your loans until the librarian approves it.`,
        ...result,
      });
      return true;
    }

    // a librarian approves a return request
    if (req.method === "POST" && path === "/api/loans/approve-return") {
      const { librarianID, loanID } = await readJSON(req);

      if (!isID(librarianID) || !isID(loanID)) {
        send(400, { error: "Invalid librarianID or loanID" });
        return true;
      }

      const result = await approveReturn(librarianID, loanID);

      send(200, {
        message: `Return approved for "${result.loan.title}".`,
        ...result,
      });
      return true;
    }

    // loans for one user (student/faculty My loans page)
    if (req.method === "GET" && path.startsWith("/api/loans/user/")) {
      const userID = Number(path.split("/")[4]);

      if (!isID(userID)) {
        send(400, { error: "Invalid userID" });
        return true;
      }

      const data = await fetchUserLoans(userID);

      if (data === null) {
        send(404, { error: "User not found" });
        return true;
      }

      send(200, data);
      return true;
    }

    // every loan (librarian Loans page)
    if (req.method === "GET" && path === "/api/loans/all") {
      const librarianID = Number(url.searchParams.get("userID"));

      if (!isID(librarianID)) {
        send(400, { error: "Invalid userID" });
        return true;
      }

      send(200, await fetchAllLoans(librarianID));
      return true;
    }

    if (req.method === "GET" && path.startsWith("/api/notifications/")) {
      const userID = Number(path.split("/")[3]);

      if (!isID(userID)) {
        send(400, { error: "Invalid userID" });
        return true;
      }

      send(200, await fetchNotifications(userID, url.searchParams.get("count") === "1"));
      return true;
    }

    // mark one notification as read, or all of them when notificationID is left out
    if (req.method === "POST" && path === "/api/notifications/read") {
      const { userID, notificationID } = await readJSON(req);

      if (!isID(userID) || (notificationID != null && !isID(notificationID))) {
        send(400, { error: "Invalid userID or notificationID" });
        return true;
      }

      await markNotificationsRead(userID, notificationID ?? null);

      send(200, { success: true });
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

module.exports = { handleLoanRoutes };
