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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("spendsight_isLoggedIn") === "true",
  );
  const [hasPassword, setHasPassword] = useState(
    () => localStorage.getItem("spendsight_hasPassword") === "true",
  );
  const [userId, setUserId] = useState(
    () => localStorage.getItem("spendsight_userId") || ""
  );
  const [name, setName] = useState(
    () => localStorage.getItem("spendsight_name") || ""
  );
  const [picture, setPicture] = useState(
    () => localStorage.getItem("spendsight_picture") || ""
  );
  const [loginError, setLoginError] = useState("");

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState({ text: "", type: "" });

  const [resetMode, setResetMode] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetStatus, setResetStatus] = useState({ text: "", type: "" });
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);



  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotStatus({ text: "", type: "" });
    if (!forgotEmail) {
      setForgotStatus({ text: "Email is required.", type: "error" });
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setForgotStatus({ text: data.message || "Reset link sent!", type: "success" });
        setResendTimer(60);
      } else {
        setForgotStatus({ text: data.error || "Failed to request link.", type: "error" });
        if (response.status === 429) {
          const match = data.error.match(/wait (\d+) seconds/);
          if (match) {
            setResendTimer(parseInt(match[1]));
          }
        }
      }
    } catch (err) {
      setForgotStatus({ text: "Network error. Please try again.", type: "error" });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetStatus({ text: "", type: "" });
    if (newPassword !== confirmPassword) {
      setResetStatus({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setResetStatus({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setResetStatus({ text: "Password reset successfully! You can now log in.", type: "success" });
        setTimeout(() => {
          window.history.replaceState({}, document.title, "/");
          setResetMode(false);
          setResetToken("");
          setResetEmail("");
          setNewPassword("");
          setConfirmPassword("");
          setResetStatus({ text: "", type: "" });
        }, 2500);
      } else {
        setResetStatus({ text: data.error || "Failed to reset password.", type: "error" });
      }
    } catch (err) {
      setResetStatus({ text: "Network error. Please try again.", type: "error" });
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google token response:", tokenResponse);
      const accessToken = tokenResponse.access_token;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
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
          setUserId(data.user.id);
          setName(data.user.name);
          setPicture(data.user.picture);
          localStorage.setItem("spendsight_email", data.user.email);
          localStorage.setItem("spendsight_isLoggedIn", "true");
          localStorage.setItem("spendsight_hasPassword", String(data.user.hasPassword));
          localStorage.setItem("spendsight_userId", String(data.user.id));
          localStorage.setItem("spendsight_name", data.user.name || "");
          localStorage.setItem("spendsight_picture", data.user.picture || "");
        } else {
          console.error("Google login failed on backend:", data.error);
          setLoginError(data.error || "Google login failed.");
        }
      } catch (err) {
        console.error("Network error authenticating with backend:", err);
        setLoginError("Network error authenticating with Google.");
      }
    },
    onError: (error) => console.log("Google Login Failed:", error),
  });

  // 2. Form submission handler function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmail(data.user.email);
        setIsLoggedIn(true);
        setHasPassword(data.user.hasPassword);
        setUserId(data.user.id);
        setName(data.user.name);
        setPicture(data.user.picture);
        localStorage.setItem("spendsight_email", data.user.email);
        localStorage.setItem("spendsight_isLoggedIn", "true");
        localStorage.setItem("spendsight_hasPassword", String(data.user.hasPassword));
        localStorage.setItem("spendsight_userId", String(data.user.id));
        localStorage.setItem("spendsight_name", data.user.name || "");
        localStorage.setItem("spendsight_picture", data.user.picture || "");
      } else {
        setLoginError(data.error || "Login failed.");
      }
    } catch (err) {
      console.error("Network error during password login:", err);
      setLoginError("Network error. Please make sure the backend is running.");
    }
  };


  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    setHasPassword(false);
    setUserId("");
    setName("");
    setPicture("");
    localStorage.removeItem("spendsight_email");
    localStorage.removeItem("spendsight_isLoggedIn");
    localStorage.removeItem("spendsight_hasPassword");
    localStorage.removeItem("spendsight_userId");
    localStorage.removeItem("spendsight_name");
    localStorage.removeItem("spendsight_picture");
    localStorage.removeItem("spendsight_activeTab");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "reset-password" && params.get("token") && params.get("email")) {
      handleLogout();
      setResetMode(true);
      setResetToken(params.get("token"));
      setResetEmail(params.get("email"));
    }
  }, []);

  const handlePasswordSet = () => {
    setHasPassword(true);
    localStorage.setItem("spendsight_hasPassword", "true");
  };

  const [theme, setTheme] = useState(
    () => localStorage.getItem("spendsight_theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("spendsight_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (isLoggedIn && email) {
      fetch(`${import.meta.env.VITE_API_URL}/api/auth/status?email=${encodeURIComponent(email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            if (data.hasPassword !== undefined) {
              setHasPassword(data.hasPassword);
              localStorage.setItem("spendsight_hasPassword", String(data.hasPassword));
            }
            if (data.name) {
              setName(data.name);
              localStorage.setItem("spendsight_name", data.name);
            }
            if (data.picture) {
              setPicture(data.picture);
              localStorage.setItem("spendsight_picture", data.picture);
            }
          }
        })
        .catch((err) => console.error("Error fetching user status:", err));
    }
  }, [isLoggedIn, email]);

  if (isLoggedIn) {
    return <Dashboard email={email} onLogout={handleLogout} hasPassword={hasPassword} onPasswordSet={handlePasswordSet} userId={userId} name={name} picture={picture} theme={theme} setTheme={setTheme} />;
  }

  return (
    // Main full-screen centering container layout
    <div
      style={{
        backgroundColor: "#080B11",
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* The Login Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: isMobile ? "20px" : "40px",
          textAlign: "center",
          backgroundColor: isMobile ? "transparent" : "#111625",
          borderRadius: isMobile ? "0" : "16px",
          border: isMobile ? "none" : "1px solid #1b2135",
          boxShadow: isMobile ? "none" : "0px 10px 30px rgba(0, 0, 0, 0.5)",
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

        {resetMode ? (
          <>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: "#FFF",
              }}
            >
              Reset Password
            </h2>
            <p
              style={{
                color: "#718096",
                fontSize: "14px",
                margin: "0 0 32px 0",
              }}
            >
              Enter a new secure password for {resetEmail}
            </p>

            <form
              onSubmit={handleResetPassword}
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
              }}
            >
              <label
                style={{
                  color: "#A0AEC0",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                }}
              >
                New Password
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
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              <label
                style={{
                  color: "#A0AEC0",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                }}
              >
                Confirm Password
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

              {resetStatus.text && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "20px",
                    backgroundColor:
                      resetStatus.type === "success"
                        ? "rgba(72, 187, 120, 0.1)"
                        : "rgba(255, 82, 82, 0.1)",
                    color: resetStatus.type === "success" ? "#48BB78" : "#FF5252",
                    border:
                      resetStatus.type === "success"
                        ? "1px solid rgba(72, 187, 120, 0.2)"
                        : "1px solid rgba(255, 82, 82, 0.2)",
                  }}
                >
                  {resetStatus.text}
                </div>
              )}

              <button
                type="submit"
                style={{
                  backgroundColor: "#00b6d3",
                  color: "#080B11",
                  border: "none",
                  borderRadius: "8px",
                  padding: "14px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                Reset Password
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  window.history.replaceState({}, document.title, "/");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#718096",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginTop: "16px",
                  fontWeight: "600",
                }}
              >
                Back to Login
              </button>
            </form>
          </>
        ) : forgotMode ? (
          <>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                color: "#FFF",
              }}
            >
              Forgot Password
            </h2>
            <p
              style={{
                color: "#718096",
                fontSize: "14px",
                margin: "0 0 32px 0",
              }}
            >
              Enter your email to receive a password reset link.
            </p>

            <form
              onSubmit={handleForgotPassword}
              style={{
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
              }}
            >
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
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
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

              {forgotStatus.text && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "20px",
                    backgroundColor:
                      forgotStatus.type === "success"
                        ? "rgba(72, 187, 120, 0.1)"
                        : "rgba(255, 82, 82, 0.1)",
                    color: forgotStatus.type === "success" ? "#48BB78" : "#FF5252",
                    border:
                      forgotStatus.type === "success"
                        ? "1px solid rgba(72, 187, 120, 0.2)"
                        : "1px solid rgba(255, 82, 82, 0.2)",
                  }}
                >
                  {forgotStatus.text}
                </div>
              )}

              {resendTimer > 0 ? (
                <div
                  style={{
                    padding: "14px",
                    fontSize: "15px",
                    fontWeight: "bold",
                    color: "#718096",
                    textAlign: "center",
                    border: "1px dashed #1b2135",
                    borderRadius: "8px",
                  }}
                >
                  Resend link in {resendTimer}s
                </div>
              ) : (
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#00b6d3",
                    color: "#080B11",
                    border: "none",
                    borderRadius: "8px",
                    padding: "14px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  Send Reset Link
                </button>
              )}

              <button
                type="button"
                onClick={() => setForgotMode(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#718096",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginTop: "16px",
                  fontWeight: "600",
                }}
              >
                Back to Login
              </button>
            </form>
          </>
        ) : (
          <>
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
              <div style={{ position: "relative" }}>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                  marginBottom: "24px",
                }}
              >
                {resendTimer > 0 ? (
                  <span
                    style={{
                      color: "#718096",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    Resend link in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotStatus({ text: "", type: "" });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00d8f6",
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: "500",
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {loginError && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "20px",
                    backgroundColor: "rgba(255, 82, 82, 0.1)",
                    color: "#FF5252",
                    border: "1px solid rgba(255, 82, 82, 0.2)",
                    textAlign: "left",
                  }}
                >
                  {loginError}
                </div>
              )}

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
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.04)";
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
          </>
        )}
      </div>
    </div>
  );
}

export default App;
