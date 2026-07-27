import { useState, useEffect } from "react";

export default function PasswordView({ email, onLogout, hasPassword, onPasswordSet }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "success" or "error"
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleForgotSettings = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({
          text: data.message || "A password reset link has been sent to your email.",
          type: "success",
        });
        setResendTimer(60);
      } else {
        setMessage({ text: data.error || "Failed to send reset link.", type: "error" });
        if (response.status === 429) {
          const match = data.error.match(/wait (\d+) seconds/);
          if (match) {
            setResendTimer(parseInt(match[1]));
          }
        }
      }
    } catch (err) {
      console.error("Network error requesting password reset:", err);
      setMessage({ text: "Network error occurred. Please try again.", type: "error" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    // Validation
    if (newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }

    if (hasPassword && oldPassword === newPassword) {
      setMessage({ text: "New password cannot be the same as the old password.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters long.", type: "error" });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/password/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          oldPassword: hasPassword ? oldPassword : "",
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: hasPassword
            ? "Password updated successfully!"
            : "Password created successfully!",
          type: "success",
        });
        if (onPasswordSet) onPasswordSet();
        setResendTimer(0);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ text: data.error || "Failed to update password.", type: "error" });
      }
    } catch (err) {
      console.error("Network error updating password:", err);
      setMessage({ text: "Network error occurred. Please try again.", type: "error" });
    }
  };

  return (
    <div style={{ color: "var(--text-primary)", fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "left" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0" }}>
          {hasPassword ? "Change Password" : "Create Password"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", margin: 0 }}>
          {hasPassword
            ? "Update your existing account password."
            : "Set a password for your account to enable direct email logins."}
        </p>
      </div>

      {/* Form Container */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "36px",
          maxWidth: "480px",
        }}
      >
        {message.text && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "20px",
              backgroundColor: message.type === "success" ? "rgba(0, 230, 118, 0.1)" : "rgba(255, 82, 82, 0.1)",
              color: message.type === "success" ? "#00E676" : "#FF5252",
              border: `1px solid ${message.type === "success" ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 82, 82, 0.2)"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {hasPassword && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Old Password</label>
                {resendTimer > 0 ? (
                  <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500" }}>
                    Resend link in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleForgotSettings}
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
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "12px", display: "flex", alignItems: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    backgroundColor: "var(--bg-card-inner)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 16px 12px 46px",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          )}

          {/* New Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>
              {hasPassword ? "New Password" : "Password"}
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "12px", display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-card-inner)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px 16px 12px 46px",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "12px", display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-card-inner)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px 16px 12px 46px",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            onMouseEnter={() => setIsBtnHovered(true)}
            onMouseLeave={() => setIsBtnHovered(false)}
            style={{
              backgroundColor: isBtnHovered ? "#00e5ff" : "#00b6d3",
              color: "#080B11",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              marginTop: "10px",
            }}
          >
            {hasPassword ? "Update Password" : "Create Password"}
          </button>
        </form>
      </div>
    </div>
  );
}