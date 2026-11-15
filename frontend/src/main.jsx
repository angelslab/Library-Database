import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App.jsx";
import API_URL from "./api";

// redirect localhost:3000 to API_URL
const LOCAL_API = "http://localhost:3000";
const originalFetch = window.fetch;
window.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith(LOCAL_API)) {
    input = API_URL + input.slice(LOCAL_API.length);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
