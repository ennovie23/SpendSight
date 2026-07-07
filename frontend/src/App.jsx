import { useState, useEffect } from "react";
import "./App.css"; // Make sure your color variables are loaded here!
import Dashboard from "./Dashboard";
import { useGoogleLogin } from "@react-oauth/google";
import PasswordView from "./PasswordView";

function App() {
  // 1. React State Syntax: [variableName, functionToUpdateIt] = useState('initial_value')
  const [email, setEmail] = useState(
    () => localStorage.getItem("spendsight_email") || "",
  );
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("spendsight_isLoggedIn") === "true",
  );
  const [hasPassword, setHasPassword] = useState(
    () => localStorage.getItem("spendsight_hasPassword") === "true",
  );

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google token response:", tokenResponse);
      const accessToken = tokenResponse.access_token;

      try {
        const response = await fetch("http://localhost:5001/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: accessToken }),
        });

        const data = await response.json();
        if (response.ok) {
          setEmail(data.user.email);
          setIsLoggedIn(true);
          setHasPassword(data.user.hasPassword);
          localStorage.setItem("spendsight_email", data.user.email);
          localStorage.setItem("spendsight_isLoggedIn", "true");
          localStorage.setItem("spendsight_hasPassword", String(data.user.hasPassword));
        } else {
          console.error("Google login failed on backend:", data.error);
          alert(`Google Authentication failed: ${data.error}`);
        }
      } catch (err) {
        console.error("Network error authenticating with backend:", err);
      }
    },
    onError: (error) => console.log("Google Login Failed:", error),
  });

  // 2. Form submission handler function
  const handleLogin = (e) => {
    e.preventDefault(); // Prevents the browser from reloading the page
    console.log("Submitting login credentials across pipeline:", {
      email,
      password,
    });

    // Navigate to the empty page by updating state
    setIsLoggedIn(true);
    setHasPassword(true);
    localStorage.setItem("spendsight_email", email);
    localStorage.setItem("spendsight_isLoggedIn", "true");
    localStorage.setItem("spendsight_hasPassword", "true");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    setHasPassword(false);
    localStorage.removeItem("spendsight_email");
    localStorage.removeItem("spendsight_isLoggedIn");
    localStorage.removeItem("spendsight_hasPassword");
  };

  const handlePasswordSet = () => {
    setHasPassword(true);
    localStorage.setItem("spendsight_hasPassword", "true");
  };

  useEffect(() => {
    if (isLoggedIn && email) {
      fetch(`http://localhost:5001/api/auth/status?email=${encodeURIComponent(email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.hasPassword !== undefined) {
            setHasPassword(data.hasPassword);
            localStorage.setItem("spendsight_hasPassword", String(data.hasPassword));
          }
        })
        .catch((err) => console.error("Error fetching user status:", err));
    }
  }, [isLoggedIn, email]);

  if (isLoggedIn) {
    return <Dashboard email={email} onLogout={handleLogout} hasPassword={hasPassword} onPasswordSet={handlePasswordSet} />;
  }

  return (
    // Main full-screen centering container layout
    <div
      style={{
        backgroundColor: "#080B11",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* The Login Card Frame */}
      <div
        style={{
          backgroundColor: "#111625",
          width: "100%",
          maxWidth: "420px",
          borderRadius: "16px",
          padding: "40px",
          textAlign: "center",
          border: "1px solid #1b2135",
          boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Wallet Icon Header */}
        <div
          style={{
            backgroundColor: "#00b6d3",
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto",
            boxShadow: "0px 4px 14px rgba(0, 182, 211, 0.4)",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: "28px",
            fontWeight: "700",
            margin: "0 0 8px 0",
            color: "#FFF",
          }}
        >
          Welcome back
        </h2>
        <p
          style={{
            color: "#718096",
            fontSize: "14px",
            margin: "0 0 32px 0",
          }}
        >
          Enter your details to access your dashboard.
        </p>

        {/* Input Form Container */}
        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            textAlign: "left",
          }}
        >
          {/* Email Block */}
          <label
            style={{
              color: "#A0AEC0",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            Email
          </label>
          <div style={{ position: "relative", marginBottom: "20px" }}>
            <span
              style={{
                position: "absolute",
                left: "16px",
                top: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#718096"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#080B11",
                border: "1px solid #1b2135",
                borderRadius: "8px",
                padding: "12px 16px 12px 46px",
                color: "#FFF",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password Block */}
          <label
            style={{
              color: "#A0AEC0",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <span
              style={{
                position: "absolute",
                left: "16px",
                top: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#718096"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#080B11",
                border: "1px solid #1b2135",
                borderRadius: "8px",
                padding: "12px 16px 12px 46px",
                color: "#FFF",
                fontSize: "15px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              backgroundColor: isHovered ? "#00e5ff" : "#00b6d3",
              color: "#080B11",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              boxShadow: isHovered
                ? "0px 4px 20px rgba(0, 229, 255, 0.6)"
                : "none",
            }}
          >
            Login ➔
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "24px 0",
            color: "#718096",
          }}
        >
          <div
            style={{ flex: 1, height: "1px", backgroundColor: "#1b2135" }}
          ></div>
          <span
            style={{
              padding: "0 10px",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            or
          </span>
          <div
            style={{ flex: 1, height: "1px", backgroundColor: "#1b2135" }}
          ></div>
        </div>

        <button
          type="button"
          onClick={() => login()}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
            e.currentTarget.style.borderColor = "#00d8f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#1b2135";
          }}
          style={{
            width: "100%",
            backgroundColor: "transparent",
            color: "#FFF",
            border: "1px solid #1b2135",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease-in-out",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            style={{ marginRight: "10px" }}
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default App;
