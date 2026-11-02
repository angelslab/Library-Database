const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

console.log("API URL:", API_URL);

export default API_URL;