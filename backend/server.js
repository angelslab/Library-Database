const http = require("http");
const initDB = require("./schema");

const hostname = "127.0.0.1";
const PORT = 3000;

async function startServer() {
  try {
    //initialize db

    await initDB();
    console.log("database initialized successfully");

    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });

      res.end("Server is running");
    });

    server.listen(PORT, () => {
      console.log(`Server running at PORT: `, PORT);
    });
  } catch (err) {
    console.error("Server startup failed:", err.message);
  }
}

startServer();
