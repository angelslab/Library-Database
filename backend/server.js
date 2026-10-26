const http = require("http");
const initDB = require("./schema");

const { fetchAllItems, getItemByID } = require("./catalog/catalog");
const {
  addBook,
  deleteBook,
  fetchBooks,
  updateBook,
} = require("./catalog/book");
const {
  fetchMedia,
  addMedia,
  deleteMedia,
  editMedia,
} = require("./catalog/media");
const {
  fetchDevices,
  addDevice,
  deleteDevice,
  editDevice,
} = require("./catalog/device");
const { login, register } = require("./auth/auth");
const { getProfile } = require("./user/user");

const { searchItems } = require("./queries/inventory");
const { manageUsers } = require("./queries/users");
const { getUserDetails } = require("./queries/manageUsers");
const { getFinesReport } = require("./reports/fines");
const { getLoansReport } = require("./reports/loans");
const { getInventoryReport } = require("./reports/inventory");
const { handleLoanRoutes } = require("./loans/routes");

// lets the React app (different port) call the API
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function sendJSON(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

const hostname = "127.0.0.1";
const PORT = 3000;

async function startServer() {
  try {
    //initialize db

    await initDB();
    console.log("Database initialized successfully");

    const server = http.createServer(async (req, res) => {
      // browser asks permission before sending JSON from another port
      if (req.method === "OPTIONS") {
        res.writeHead(204, CORS_HEADERS);
        res.end();
        return;
      }

      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });

        res.end("Server is running");
        return;
      }

      // Allow requests from the React frontend
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");

      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );

      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      // Handle CORS preflight requests
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // borrowing, returns and notifications
      if (await handleLoanRoutes(req, res, CORS_HEADERS)) {
        return;
      }

      // fetch all catalog items
      if (req.method === "GET" && req.url === "/items") {
        try {
          const items = await fetchAllItems();

          res.writeHead(200, { "Content-Type": "application/json" });

          res.end(JSON.stringify(items));
        } catch (error) {
          console.error("Error retrieving items:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to retrieve catalog",
            }),
          );

          return;
        }
      }

      //fetch catalog item by ITEMID
      if (req.method === "GET" && req.url.startsWith("/items/")) {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Invalid itemID",
              }),
            );

            return;
          }

          const item = await getItemByID(itemID);

          if (item === null) {
            res.writeHead(404, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Item not found",
              }),
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(JSON.stringify(item));
        } catch (error) {
          console.error("Error retrieving item:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to retrieve item",
            }),
          );

          return;
        }
      }

      //fetch all books
      if (req.method === "GET" && req.url === "/books") {
        try {
          const books = await fetchBooks();

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(JSON.stringify(books));
        } catch (error) {
          console.error("Error retrieving books", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to retrieve book",
            }),
          );

          return;
        }
      }

      //create book
      if (req.method === "POST" && req.url === "/books") {
        try {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const data = JSON.parse(body);

          const itemID = await addBook(
            data.title,
            data.author,
            data.isbn,
            data.publication_year,
            data.total_copies,
          );

          res.writeHead(201, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Book created successfully",
              itemID: itemID,
            }),
          );
        } catch (error) {
          console.error("Error creating books", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to create book",
            }),
          );
        }

        return;
      }

      //delete book
      if (req.method === "DELETE" && req.url.startsWith("/books/")) {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Invalid bookID",
              }),
            );

            return;
          }

          const affectedRows = await deleteBook(itemID);

          if (affectedRows === 0) {
            res.writeHead(404, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Book not found",
              }),
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Book deleted successfully",
              itemID: itemID,
            }),
          );
        } catch (error) {
          console.error("Error deleting book:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to delete book",
            }),
          );
        }
      }

      //updateBook
      if (req.method === "PUT" && req.url.startsWith("/books/")) {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Invalid bookID",
              }),
            );

            return;
          }

          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const book = JSON.parse(body);

          const result = await updateBook(
            itemID,
            book.title,
            book.author,
            book.isbn,
            book.publication_year,
            book.total_copies,
          );

          if (!result) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                error: "Device item not found",
              }),
            );
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Book updated successfully",
            }),
          );
        } catch (error) {
          console.error("Error updating book", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to update book",
            }),
          );

          return;
        }
      }

      //fetch all media
      if (req.method === "GET" && req.url === "/media") {
        try {
          const media = await fetchMedia();

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(JSON.stringify(media));
        } catch (error) {
          console.error("Error retrieving medias", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to retrieve medias",
            }),
          );
        }
      }

      //addMedia
      if (req.method === "POST" && req.url === "/media") {
        try {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const media = JSON.parse(body);

          const itemID = await addMedia(
            media.title,
            media.total_copies,
            media.author,
          );

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Media added successfully",
              itemID: itemID,
            }),
          );
        } catch (error) {
          console.error("Error adding media", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to add media",
            }),
          );
        }
      }

      //deleteMedia
      if (req.method === "DELETE" && req.url.startsWith("/media/")) {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Invalid mediaID",
              }),
            );

            return;
          }

          const affectedRows = await deleteMedia(itemID);

          if (affectedRows === 0) {
            res.writeHead(404, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Media not found",
              }),
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Media deleted successfully",
              itemID: itemID,
            }),
          );
        } catch (error) {
          console.error("Error deleting Media:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to delete Media",
            }),
          );
        }
      }

      //editMedia
      if (req.method === "PUT" && req.url.startsWith("/media/")) {
        const itemID = Number(req.url.split("/")[2]);

        if (!Number.isInteger(itemID) || itemID <= 0) {
          res.writeHead(400, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              error: "Invalid media ID",
            }),
          );

          return;
        }

        try {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const data = JSON.parse(body);

          if (
            typeof data.title != "string" ||
            !data.title.trim() ||
            typeof data.author != "string" ||
            !data.author.trim() ||
            !Number.isInteger(data.total_copies) ||
            data.total_copies < 1
          ) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                error: "Invalid media data",
              }),
            );
            return;
          }

          const edited = await editMedia(
            itemID,
            data.title,
            data.total_copies,
            data.author,
          );

          if (!edited) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                error: "Media item not found",
              }),
            );
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Media updated successfully",
            }),
          );
        } catch (error) {
          console.error(error);

          res.writeHead(500, {
            "content-type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to update media",
            }),
          );
        }
      }

      //fetch all devices
      if (req.method === "GET" && req.url === "/device") {
        try {
          const device = await fetchDevices();

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(JSON.stringify(device));
        } catch (error) {
          console.error("Error retrieving devices", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to retrieve devices",
            }),
          );
        }
      }

      //device addition
      if (req.method === "POST" && req.url === "/device") {
        try {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const device = JSON.parse(body);

          const itemID = await addDevice(
            device.title,
            device.total_copies,
            device.brand,
            device.device_type,
          );

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Device added successfully",
              itemID: itemID,
            }),
          );
        } catch (error) {
          console.error("Error adding device", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to add device",
            }),
          );
        }
      }

      //delete device
      if (req.method === "DELETE" && req.url.startsWith("/device/")) {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Invalid deviceID",
              }),
            );

            return;
          }

          const affectedRows = await deleteDevice(itemID);

          if (affectedRows === 0) {
            res.writeHead(404, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                message: "Device not found",
              }),
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Device deleted successfully",
              itemID: itemID,
            }),
          );
        } catch (error) {
          console.error("Error deleting Device:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to delete Device",
            }),
          );
        }
      }

      //editDevice
      if (req.method === "PUT" && req.url.startsWith("/device/")) {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                error: "Invalid deviceID",
              }),
            );

            return;
          }

          let body = "";

          for await (chunk of req) {
            body += chunk;
          }

          const data = JSON.parse(body);

          const result = await editDevice(
            itemID,
            data.title,
            data.total_copies,
            data.brand,
            data.deviceType,
          );

          if (!result) {
            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                error: "Device item not found",
              }),
            );
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Device updated successfully",
            }),
          );
        } catch (error) {
          console.error(error);

          res.writeHead(500, {
            "content-type": "application/json",
          });

          res.end(
            JSON.stringify({
              message: "Failed to update device",
            }),
          );
        }
      }

      //login
      if (req.method === "POST" && req.url === "/api/login") {
        try {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const data = JSON.parse(body);

          const user = await login(data.email, data.password);

          if (user === null) {
            res.writeHead(401, {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            });

            res.end(
              JSON.stringify({
                error: "Wrong email or password",
              }),
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });

          res.end(JSON.stringify(user));
        } catch (error) {
          console.error("Error logging in:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });

          res.end(
            JSON.stringify({
              error: "Failed to log in",
            }),
          );
        }

        return;
      }

      //register
      if (req.method === "POST" && req.url === "/api/register") {
        try {
          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const data = JSON.parse(body);

          const result = await register(data);

          if (result.error) {
            res.writeHead(400, {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            });

            res.end(
              JSON.stringify({
                error: result.error,
              }),
            );

            return;
          }

          res.writeHead(201, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });

          res.end(JSON.stringify(result.user));
        } catch (error) {
          console.error("Error registering:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });

          res.end(
            JSON.stringify({
              error: "Failed to register",
            }),
          );
        }

        return;
      }

      //profile
      if (req.method === "GET" && req.url.startsWith("/api/profile/")) {
        try {
          const userID = Number(req.url.split("/")[3]);

          if (!Number.isInteger(userID) || userID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            });

            res.end(
              JSON.stringify({
                error: "Invalid userID",
              }),
            );

            return;
          }

          const data = await getProfile(userID);

          if (data === null) {
            res.writeHead(404, {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            });

            res.end(
              JSON.stringify({
                error: "User not found",
              }),
            );

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });

          res.end(JSON.stringify(data));
        } catch (error) {
          console.error("Error load profile:", error);

          res.writeHead(500, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });

          res.end(
            JSON.stringify({
              error: "Failed to load profile",
            }),
          );
        }

        return;
      }

      // librarian item search
      if (req.method === "GET" && req.url.startsWith("/api/items")) {
        try {
          const url = new URL(req.url, "http://localhost");
          const q = (url.searchParams.get("q") || "").trim();

          const rows = await searchItems(q);

          res.writeHead(200, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });
          res.end(JSON.stringify(rows));
        } catch (error) {
          console.error("Error searching item:", error);
          res.writeHead(500, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });
          res.end(JSON.stringify({ error: "Failed to search item" }));
        }
        return;
      }
      // librian find user
      if (req.method === "GET" && req.url.startsWith("/api/users?")) {
        try {
          const url = new URL(req.url, "http://localhost");
          const q = (url.searchParams.get("q") || "").trim();

          const rows = await manageUsers(q);

          res.writeHead(200, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });
          res.end(JSON.stringify(rows));
        } catch (error) {
          console.error("Error searching user:", error);
          res.writeHead(500, {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          });
          res.end(JSON.stringify({ error: "Failed to search user" }));
        }
        return;
      }
      // detail about selected user
      if (req.method === "GET" && req.url.startsWith("/api/users/")) {
        try {
          const userID = Number(req.url.split("/")[3]);

          if (!Number.isInteger(userID) || userID < 1) {
            res.writeHead(400, {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            });
            res.end(JSON.stringify({ error: "Invalid userID" }));
            return;
          }

          const rows = await getUserDetails(userID);

          if (rows.length === 0) {
            res.writeHead(404, {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            });
            res.end(JSON.stringify({ error: "User not found" }));
            return;
          }

    res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify(rows));
  } catch (error) {
    console.error("Error getting user detail:", error);
    res.writeHead(500, { "Content-Type": "application/json", ...CORS_HEADERS });
    res.end(JSON.stringify({ error: "Failed to get user detail" }));
  }
  return;
}
    
});



    server.listen(PORT, () => {
      console.log(`Server running at PORT: `, PORT);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
  }
}

startServer();
