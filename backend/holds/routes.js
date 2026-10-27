const { LoanError } = require("../loans/loans");
const {
  fulfillBorrowedHolds,
  placeHold,
  cancelHold,
  fetchUserHolds,
} = require("./holds");

// Routes for holds (getting in line for an item with no copies left).
// server.js calls handleHoldRoutes; it returns true when it answered the request.

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

async function handleHoldRoutes(req, res, CORS_HEADERS) {
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
    // the My loans page shows how many holds are waiting, so mark the ones
    // that were already borrowed first (the loans route still answers the request)
    if (req.method === "GET" && path.startsWith("/api/loans/user/")) {
      const userID = Number(path.split("/")[4]);

      if (isID(userID)) {
        await fulfillBorrowedHolds(userID);
      }

      return false;
    }

    // a student/faculty member places a hold on an item with no copies left
    if (req.method === "POST" && path === "/api/holds/place") {
      const { userID, itemID } = await readJSON(req);

      if (!isID(userID) || !isID(itemID)) {
        send(400, { error: "Invalid userID or itemID" });
        return true;
      }

      const result = await placeHold(userID, itemID);
      const place = result.hold.queue_position;

      send(201, {
        message: `Hold placed on "${result.hold.title}". You are #${place} in line.`,
        ...result,
      });
      return true;
    }

    // a student/faculty member cancels one of their holds
    if (req.method === "POST" && path === "/api/holds/cancel") {
      const { userID, holdID } = await readJSON(req);

      if (!isID(userID) || !isID(holdID)) {
        send(400, { error: "Invalid userID or holdID" });
        return true;
      }

      const result = await cancelHold(userID, holdID);

      send(200, {
        message: `Your hold on "${result.hold.title}" was cancelled.`,
        ...result,
      });
      return true;
    }

    // every hold for one user (active, cancelled, fulfilled)
    if (req.method === "GET" && path.startsWith("/api/holds/user/")) {
      const userID = Number(path.split("/")[4]);

      if (!isID(userID)) {
        send(400, { error: "Invalid userID" });
        return true;
      }

      const data = await fetchUserHolds(userID);

      if (data === null) {
        send(404, { error: "User not found" });
        return true;
      }

      send(200, data);
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

module.exports = { handleHoldRoutes };
