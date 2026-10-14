const http = require("http");
const initDB = require("./schema");
const { fetchAllItems, getItemByID } = require("./catalog/catalog")
const { addBook, deleteBook, fetchBooks, updateBook } = require("./catalog/book")
const { fetchMedia, addMedia, deleteMedia } = require("./catalog/media")
const { fetchDevices } = require("./catalog/device");

const hostname = "127.0.0.1";
const PORT = 3000;

async function startServer() {
  try {
    //initialize db

    await initDB();
    console.log("Database initialized successfully");

    const server = http.createServer(async (req, res) => {

      if (req.method === "GET" && req.url === "/") {

        res.writeHead(200, { "Content-Type": "text/plain" });

        res.end("Server is running");
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
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to retrieve catalog"
          }));

          return;
        }
      }

      //fetch catalog item by ITEMID
      if (req.method === "GET" && req.url.startsWith("/items/")) {
        try {

          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Invalid itemID"
            }));

            return;
          }

          const item = await getItemByID(itemID);

          if (item === null) {
            res.writeHead(404, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Item not found"
            }));

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify(item));

        } catch (error) {

          console.error("Error retrieving item:", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to retrieve item"
          }));

          return;

        }
      }

      //fetch all books
      if (req.method === "GET" && req.url === "/books") {
        try {

          const books = await fetchBooks();

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify(books));

        } catch (error) {

          console.error("Error retrieving books", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to retrieve book"
          }));

          return;
        }
      }


      //fetch all devices
      if (req.method === "GET" && req.url === "/device") {
        try {
          const device = await fetchDevices();

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify(device));


        } catch (error) {
          console.error("Error retrieving devices", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to retrieve devices"
          }));
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
            data.total_copies
          );

          res.writeHead(201, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Book created successfully",
            itemID: itemID
          }));


        } catch (error) {
          console.error("Error creating books", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to create book"
          }));
        }

        return;
      }

      //delete book
      if (req.method === "DELETE" && req.url.startsWith("/books/")) {
        try {
          const itemID = Number(req.url.split("/", [2]));

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Invalid bookID"
            }));

            return;
          }

          const affectedRows = await deleteBook(itemID);

          if (affectedRows === 0) {
            res.writeHead(404, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Book not found"
            }));

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json"
          })

          res.end(JSON.stringify({
            message: "Book deleted successfully",
            itemID: itemID
          }));

        } catch (error) {
          console.error("Error deleting book:", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to delete book"
          }));
        }
      }

      //updateBook
      if (req.method === "PUT" && req.url.startsWith === "/books/") {
        try {
          const itemID = Number(req.url.split("/")[2]);

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Invalid bookID"
            }));

            return;
          }

          let body = "";

          for await (const chunk of req) {
            body += chunk;
          }

          const book = JSON.parse(body);

          await updateBook(
            itemID,
            book.title,
            book.author,
            book.isbn,
            book.publication_year,
            book.total_copies
          );

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Book updated successfully"
          }));

        } catch (error) {
          console.error("Error updating book", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to update book"
          }))

          return;
        }
      }


      //fetch all media
      if (req.method === "GET" && req.url === "/media") {
        try {

          const media = await fetchMedia();

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify(media));

        } catch (error) {

          console.error("Error retrieving medias", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to retrieve medias"
          }));
        }
      }

      //addMedia
      if (req.method === "POST" && req.url === "/media") {

        try {

          let body = "";

          for await (const chunk of req) {
            body += chunk
          };

          const media = JSON.parse(body);

          const itemID = await addMedia(
            media.title,
            media.total_copies,
            media.author
          );

          res.writeHead(200, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Media added successfully",
            itemID: itemID
          }));

        } catch (error) {
          console.error("Error adding media", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to add media"
          }));
        }
      }

      //deleteMedia
      if (req.method === "DELETE" && req.url.startsWith("/media/")) {
        try {
          const itemID = Number(req.url.split("/", [2]));

          if (!Number.isInteger(itemID) || itemID <= 0) {
            res.writeHead(400, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Invalid mediaID"
            }));

            return;
          }

          const affectedRows = await deleteMedia(itemID);

          if (affectedRows === 0) {
            res.writeHead(404, {
              "Content-Type": "application/json"
            });

            res.end(JSON.stringify({
              message: "Media not found"
            }));

            return;
          }

          res.writeHead(200, {
            "Content-Type": "application/json"
          })

          res.end(JSON.stringify({
            message: "Media deleted successfully",
            itemID: itemID
          }));

        } catch (error) {
          console.error("Error deleting Media:", error);

          res.writeHead(500, {
            "Content-Type": "application/json"
          });

          res.end(JSON.stringify({
            message: "Failed to delete Media"
          }));
        }
      }

      //continue from here (editing MEdia)


    });

    server.listen(PORT, () => {
      console.log(`Server running at PORT: `, PORT);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
  }
}

startServer();
