import { useState } from "react";

export default function PasswordView({ email, onLogout, hasPassword, onPasswordSet }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "success" or "error"

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
      const response = await fetch("http://localhost:5001/api/auth/password/update", {
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
    <div style={{ color: "#F3F4F6", fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "left" }}>
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#FFF", margin: "0 0 6px 0" }}>
          {hasPassword ? "Change Password" : "Create Password"}
        </h1>
        <p style={{ color: "#718096", fontSize: "16px", margin: 0 }}>
          {hasPassword
            ? "Update your existing account password."
            : "Set a password for your account to enable direct email logins."}
        </p>
      </div>

      {/* Form Container */}
      <div
        style={{
          backgroundColor: "#111625",
          border: "1px solid #1b2135",
          borderRadius: "16px",
          padding: "36px",
          maxWidth: "480px",
          boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.5)",
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
          {/* Old Password Field (Only if they already have one) */}
          {hasPassword && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "#A0AEC0", fontSize: "14px", fontWeight: "500" }}>Old Password</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "12px", display: "flex", alignItems: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            </div>
          )}

          {/* New Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ color: "#A0AEC0", fontSize: "14px", fontWeight: "500" }}>
              {hasPassword ? "New Password" : "Password"}
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "12px", display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </div>

          {/* Confirm New Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ color: "#A0AEC0", fontSize: "14px", fontWeight: "500" }}>
              {hasPassword ? "Confirm New Password" : "Confirm Password"}
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "12px", display: "flex", alignItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            onMouseEnter={() => setIsBtnHovered(true)}
            onMouseLeave={() => setIsBtnHovered(false)}
            style={{
              width: "100%",
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