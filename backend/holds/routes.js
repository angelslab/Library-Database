const { LoanError } = require("../loans/loans");
const {
  fulfillBorrowedHolds,
  placeHold,
  cancelHold,
  fetchUserHolds,
} = require("./holds");

// hold routes

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
    // update holds before loading loans
    if (req.method === "GET" && path.startsWith("/api/loans/user/")) {
      const userID = Number(path.split("/")[4]);

      if (isID(userID)) {
        await fulfillBorrowedHolds(userID);
      }

      return false;
    }

    // place hold
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

    // cancel hold
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

    // user holds
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
