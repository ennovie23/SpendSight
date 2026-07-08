import { useState, useEffect } from "react";
import DashboardView from "./DashboardView";
import TransactionsView from "./TransactionsView";
import PasswordView from "./PasswordView";

function Dashboard({
  email,
  onLogout,
  hasPassword,
  onPasswordSet,
  userId,
  name,
  picture,
  theme,
  setTheme,
}) {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("spendsight_activeTab") || "dashboard",
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("spendsight_activeTab", activeTab);
  }, [activeTab]);

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
        backgroundColor: "var(--bg-app)",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        color: "var(--text-primary)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Mobile Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 998,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          backgroundColor: "var(--bg-sidebar)",
          height: "100vh",
          position: isMobile ? "fixed" : "relative",
          zIndex: isMobile ? 999 : 1,
          left: 0,
          top: 0,
          transform: isMobile
            ? mobileSidebarOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "none",
          width: isMobile ? "280px" : isCollapsed ? "80px" : "auto",
          minWidth: isMobile ? "280px" : isCollapsed ? "80px" : "260px",
          maxWidth: isMobile ? "280px" : isCollapsed ? "80px" : "400px",
          padding: isCollapsed && !isMobile ? "30px 12px" : "30px 24px",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          transition:
            "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div>
          {/* Logo / Title section with collapse trigger */}
          {isCollapsed && !isMobile ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                marginBottom: "40px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00d8f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <button
                onClick={() => setIsCollapsed(false)}
                title="Expand Sidebar"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#718096",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: "none",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "40px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00d8f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span
                  style={{
                    fontSize: "21px",
                    fontWeight: "800",
                    color: "#00d8f6",
                    letterSpacing: "0.5px",
                  }}
                >
                  SpendSight
                </span>
              </div>
              <button
                onClick={() =>
                  isMobile ? setMobileSidebarOpen(false) : setIsCollapsed(true)
                }
                title={isMobile ? "Close Sidebar" : "Collapse Sidebar"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#718096",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: "none",
                }}
              >
                {isMobile ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <button
              onClick={() => setActiveTab("dashboard")}
              title={isCollapsed ? "Dashboard" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "dashboard"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              {!isCollapsed && "Dashboard"}
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              title={isCollapsed ? "Transactions" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "transactions"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {!isCollapsed && "Transactions"}
            </button>

            <button
              onClick={() => setActiveTab("password")}
              title={isCollapsed ? "Password Settings" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "password"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {!isCollapsed && "Password"}
            </button>
          </div>
        </div>

        {/* User Profile & Logout section at the bottom */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={
              isCollapsed
                ? `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`
                : undefined
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: isCollapsed ? "0" : "12px",
              padding: "12px 16px",
              backgroundColor: "var(--theme-toggle-bg)",
              border: "1px solid var(--theme-toggle-border)",
              color: "var(--text-primary)",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease-in-out",
              width: "100%",
              outline: "none",
            }}
          >
            {theme === "dark" ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFb300"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                {!isCollapsed && (
                  <span style={{ marginLeft: "10px" }}>Light Mode</span>
                )}
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9F7AEA"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                {!isCollapsed && (
                  <span style={{ marginLeft: "10px" }}>Dark Mode</span>
                )}
              </>
            )}
          </button>

          {/* Profile Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: isCollapsed ? "0" : "16px",
              padding: isCollapsed ? "8px" : "16px",
              backgroundColor: "var(--bg-card)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Profile Image with Initials fallback */}
            {picture ? (
              <img
                src={picture}
                alt={name || userName}
                referrerPolicy="no-referrer"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  border: "1.5px solid #00d8f6",
                }}
              />
            ) : (
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1e70e4, #00d8f6)",
                  color: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                {getInitials(email)}
              </div>
            )}
            {!isCollapsed && (
              <div style={{ textAlign: "left", flexGrow: 1 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}
                  title={name || userName}
                >
                  {name || userName}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                    marginTop: "2px",
                  }}
                  title={email || "user@gmail.com"}
                >
                  {email || "user@gmail.com"}
                </div>
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: isCollapsed ? "0" : "12px",
              padding: "12px 16px",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
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
              e.currentTarget.style.backgroundColor = "rgba(255, 82, 82, 0.08)";
              e.currentTarget.style.color = "#FF5252";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flexGrow: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-app)",
        }}
      >
        {isMobile && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              backgroundColor: "var(--bg-sidebar)",
              borderBottom: "1px solid var(--border-color)",
              zIndex: 10,
            }}
          >
            <button
              onClick={() => setMobileSidebarOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00d8f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#00d8f6",
                  letterSpacing: "0.5px",
                }}
              >
                SpendSight
              </span>
            </div>

            {picture ? (
              <img
                src={picture}
                alt={userName}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1.5px solid #00d8f6",
                }}
              />
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1e70e4, #00d8f6)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {getInitials(email)}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            flexGrow: 1,
            boxSizing: "border-box",
            overflowY: "auto",
            overflowX: "hidden",
            transition: "background-color 0.3s ease",
          }}
        >
          <div style={{ padding: isMobile ? "24px 20px" : "50px 60px" }}>
            {activeTab === "dashboard" ? (
              <DashboardView email={email} user_id={userId} />
            ) : activeTab === "password" ? (
              <PasswordView
                email={email}
                onLogout={onLogout}
                hasPassword={hasPassword}
                onPasswordSet={onPasswordSet}
              />
            ) : activeTab === "transactions" ? (
              <TransactionsView email={email} user_id={userId} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
