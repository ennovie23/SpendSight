import { useState } from "react";
import DashboardView from "./DashboardView";
import TransactionsView from "./TransactionsView";
import PasswordView from "./PasswordView";

function Dashboard({ email, onLogout, hasPassword, onPasswordSet }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Get initials for profile badge
  const getInitials = (emailStr) => {
    if (!emailStr) return "US";
    const part = emailStr.split("@")[0];
    if (part.length <= 2) return part.toUpperCase();
    return part.substring(0, 2).toUpperCase();
  };

  const rawUserName = email ? email.split("@")[0] : "User";
  const userName = rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1);

  return (
    <div
      style={{
        backgroundColor: "#080B11",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        color: "#F3F4F6",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          backgroundColor: "#090D16",
          height: "100vh",
          width: "260px",
          minWidth: "260px",
          padding: "30px 24px",
          borderRight: "1px solid #1b2135",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div>
          {/* Logo / Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            {/* Wallet SVG Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d8f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span style={{ fontSize: "21px", fontWeight: "800", color: "#00d8f6", letterSpacing: "0.5px" }}>SpendSight</span>
          </div>

          {/* Navigation Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={() => setActiveTab("dashboard")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                backgroundColor: activeTab === "dashboard" ? "rgba(0, 216, 246, 0.08)" : "transparent",
                color: activeTab === "dashboard" ? "#00d8f6" : "#718096",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease-in-out",
                width: "100%",
              }}
            >
              {/* Dashboard Layout SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                backgroundColor: activeTab === "transactions" ? "rgba(0, 216, 246, 0.08)" : "transparent",
                color: activeTab === "transactions" ? "#00d8f6" : "#718096",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease-in-out",
                width: "100%",
              }}
            >
              {/* Transactions Card/Dollar SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Transactions
            </button>

            <button
              onClick={() => setActiveTab("password")}
              style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 16px",
                  backgroundColor: activeTab === "password" ? "rgba(0, 216, 246, 0.08)" : "transparent",
                  color: activeTab === "password" ? "#00d8f6" : "#718096",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease-in-out",
                  width: "100%",
                }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Password
            </button>
          </div>
        </div>

        {/* User Profile & Logout section at the bottom */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Profile Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              backgroundColor: "#111625",
              borderRadius: "12px",
              border: "1px solid #1b2135",
            }}
          >
            {/* Initials Badge */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1e70e4, #00d8f6)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              {getInitials(email)}
            </div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FFF" }}>
                {userName}
              </div>
              <div style={{ fontSize: "14px", color: "#718096", overflow: "hidden", textOverflow: "ellipsis" }}>
                {email || "user@gmail.com"}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              backgroundColor: "transparent",
              color: "#A0AEC0",
              border: "none",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease-in-out",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FF5252";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#A0AEC0";
            }}
          >
            {/* Sign out Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          padding: "50px 60px",
          flexGrow: 1,
          backgroundColor: "#080B11",
          height: "100vh",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        { activeTab === "dashboard" ? <DashboardView email={email} /> :
          activeTab === "password" ? <PasswordView email={email} onLogout={onLogout} hasPassword={hasPassword} onPasswordSet={onPasswordSet} /> :
          activeTab === "transactions" ? <TransactionsView email={email} /> 
          : null}
      </div>
    </div>
  );
}

export default Dashboard;
