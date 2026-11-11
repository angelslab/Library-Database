import { useState } from "react";
import Register from "./Register";
import "../styles/Auth.css";

function Login({ onLogin, message, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Cannot reach server: " + err.message);
    }
  };

  if (showRegister) {
    return <Register onLogin={onLogin} onBack={() => setShowRegister(false)} />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">📚</div>
          <h1 className="auth-title">Library</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>

        {message && <p className="auth-note">{message}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="auth-actions">
            <button type="submit" className="auth-button auth-button-primary">
              Sign in
            </button>
            <button
              type="button"
              className="auth-button auth-button-ghost"
              onClick={() => setShowRegister(true)}
            >
              Create an account
            </button>
            {onBack && (
              <button
                type="button"
                className="auth-button auth-button-ghost"
                onClick={onBack}
              >
                Back to catalog
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
