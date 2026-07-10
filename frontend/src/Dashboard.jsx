import { useState, useEffect } from "react";
import DashboardView from "./DashboardView";
import TransactionsView from "./TransactionsView";
import AIAssistantView from "./AIAssistantView";
import PhotosView from "./PhotosView";
import WalletView from "./WalletView";
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
  
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [isEditingAiSettings, setIsEditingAiSettings] = useState(false);
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem("spendsight_aiProvider") || "gemini");
  const [aiKey, setAiKey] = useState(() => localStorage.getItem("spendsight_aiKey") || "");
  const [aiModel, setAiModel] = useState(() => localStorage.getItem("spendsight_aiModel") || "gemini-2.5-flash");

  const saveAiSettings = async (e) => {
    e.preventDefault();
    localStorage.setItem("spendsight_aiProvider", aiProvider);
    localStorage.setItem("spendsight_aiKey", aiKey);
    localStorage.setItem("spendsight_aiModel", aiModel);
    setShowAiSettings(false);
    setIsEditingAiSettings(false);

    if (userId) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/user-settings/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            ai_provider: aiProvider,
            ai_model: aiModel
          })
        });
      } catch (err) {
        console.error("Failed to save AI settings to database", err);
      }
    }
  };

  const handleTabChange = (newTab) => {
    if (activeTab === "ai-settings" && isEditingAiSettings) {
      const hasChanges = 
        aiProvider !== (localStorage.getItem("spendsight_aiProvider") || "gemini") ||
        aiKey !== (localStorage.getItem("spendsight_aiKey") || "") ||
        aiModel !== (localStorage.getItem("spendsight_aiModel") || "gemini-2.5-flash");

      if (hasChanges) {
        setPendingTab(newTab);
        setShowUnsavedModal(true);
        return; // wait for modal interaction
      } else {
        setIsEditingAiSettings(false);
      }
    }
    
    // Normal navigation
    setActiveTab(newTab);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const handleUnsavedAction = (save) => {
    if (save) {
      saveAiSettings({ preventDefault: () => {} });
    } else {
      setAiProvider(localStorage.getItem("spendsight_aiProvider") || "gemini");
      setAiKey(localStorage.getItem("spendsight_aiKey") || "");
      setAiModel(localStorage.getItem("spendsight_aiModel") || "gemini-2.5-flash");
      setIsEditingAiSettings(false);
    }
    setShowUnsavedModal(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      if (isMobile) setMobileSidebarOpen(false);
      setPendingTab(null);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const fetchAiSettings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user-settings/ai?user_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ai_provider) {
            setAiProvider(data.ai_provider);
            localStorage.setItem("spendsight_aiProvider", data.ai_provider);
          }
          if (data.ai_model) {
            setAiModel(data.ai_model);
            localStorage.setItem("spendsight_aiModel", data.ai_model);
          }
        }
      } catch (err) {
        console.error("Failed to fetch AI settings", err);
      }
    };
    fetchAiSettings();
  }, [userId]);

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
        height: "100dvh",
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
          height: "100dvh",
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
              onClick={() => handleTabChange("dashboard")}
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
              onClick={() => handleTabChange("transactions")}
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
              onClick={() => handleTabChange("assistant")}
              title={isCollapsed ? "AI Assistant" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "assistant"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
                color: activeTab === "assistant" ? "#00d8f6" : "#718096",
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
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
              </svg>
              {!isCollapsed && "AI Assistant"}
            </button>

            <button
              onClick={() => handleTabChange("photos")}
              title={isCollapsed ? "Photos" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "photos"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
                color: activeTab === "photos" ? "#00d8f6" : "#718096",
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
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              {!isCollapsed && "Photos"}
            </button>

            <button
              onClick={() => handleTabChange("wallet")}
              title={isCollapsed ? "Wallet" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "wallet"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
                color: activeTab === "wallet" ? "#00d8f6" : "#718096",
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
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
              </svg>
              {!isCollapsed && "Wallet"}
            </button>

            <button
              onClick={() => handleTabChange("ai-settings")}
              title={isCollapsed ? "AI Settings" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? "0" : "14px",
                padding: "12px 16px",
                backgroundColor:
                  activeTab === "ai-settings"
                    ? "rgba(0, 216, 246, 0.08)"
                    : "transparent",
                color: activeTab === "ai-settings" ? "#00d8f6" : "#718096",
                border: "none",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease-in-out",
                width: "100%",
                marginTop: "20px"
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {!isCollapsed && "AI Settings"}
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
          <div style={{ padding: isMobile && (activeTab === "assistant" || activeTab === "photos") ? "0" : isMobile ? "24px 20px 80px 20px" : "50px 60px 100px 60px", minHeight: "100%", boxSizing: "border-box" }}>
            {activeTab === "dashboard" ? (
              <DashboardView email={email} user_id={userId} />
            ) : activeTab === "wallet" ? (
              <WalletView />
            ) : activeTab === "transactions" ? (
              <TransactionsView email={email} user_id={userId} />
            ) : activeTab === "assistant" ? (
              <AIAssistantView />
            ) : activeTab === "photos" ? (
              <PhotosView user_id={userId} />
            ) : activeTab === "ai-settings" ? (
              <div>
                {/* Header section matching Log Expenses */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: isMobile ? "24px" : "40px" }}>
                  <div>
                    <h1 style={{ fontSize: isMobile ? "28px" : "32px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                      AI Settings
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "14px" : "16px", marginTop: "8px" }}>
                      Bring Your Own Key (BYOK) to avoid free-tier quotas and access unlimited models.
                    </p>
                  </div>
                </div>

                <div style={{ maxWidth: "600px" }}>
                  <div style={{ backgroundColor: isMobile ? "transparent" : "var(--bg-card)", padding: isMobile ? "0" : "32px", borderRadius: isMobile ? "0" : "16px", border: isMobile ? "none" : "1px solid var(--border-color)", boxShadow: isMobile ? "none" : "0 4px 6px rgba(0,0,0,0.05)" }}>
                  
                  <form onSubmit={saveAiSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--text-secondary)" }}>AI Provider</label>
                      <select disabled={!isEditingAiSettings} value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", backgroundColor: isEditingAiSettings ? "var(--bg-app)" : "transparent", color: "var(--text-primary)", fontSize: "15px", outline: "none", opacity: isEditingAiSettings ? 1 : 0.6 }}>
                        <option value="gemini">Google Gemini (Native)</option>
                        <option value="openrouter">OpenRouter (Universal)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--text-secondary)" }}>Custom API Key</label>
                      <input disabled={!isEditingAiSettings} type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="Leave blank to use default server key" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", backgroundColor: isEditingAiSettings ? "var(--bg-app)" : "transparent", color: "var(--text-primary)", fontSize: "15px", outline: "none", opacity: isEditingAiSettings ? 1 : 0.6 }} />
                    </div>
                    
                    <div>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--text-secondary)" }}>Model ID</label>
                      <input disabled={!isEditingAiSettings} type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="e.g., google/gemini-2.5-flash" style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", backgroundColor: isEditingAiSettings ? "var(--bg-app)" : "transparent", color: "var(--text-primary)", fontSize: "15px", outline: "none", opacity: isEditingAiSettings ? 1 : 0.6 }} />
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>Note: To scan images, you MUST use a Vision-capable model (like gemini-2.5-flash or gpt-4o).</p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                      {!isEditingAiSettings ? (
                        <button type="button" onClick={(e) => { e.preventDefault(); setIsEditingAiSettings(true); }} style={{ padding: "12px 24px", backgroundColor: "rgba(0, 216, 246, 0.1)", border: "1px solid rgba(0, 216, 246, 0.2)", borderRadius: "10px", color: "#00d8f6", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}>Edit Settings</button>
                      ) : (
                        <button type="submit" style={{ padding: "12px 24px", backgroundColor: "#00d8f6", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "600", cursor: "pointer", transition: "opacity 0.2s" }}>Save Settings</button>
                      )}
                    </div>
                  </form>
                </div>
               </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ backgroundColor: "var(--bg-card)", padding: "24px", borderRadius: "16px", maxWidth: "400px", width: "100%", border: "1px solid var(--border-color)", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Unsaved Changes</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.5" }}>
              You have unsaved changes in your AI Settings. Would you like to save them before leaving?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => handleUnsavedAction(false)} style={{ padding: "10px 16px", backgroundColor: "rgba(255, 82, 82, 0.1)", border: "1px solid rgba(255, 82, 82, 0.2)", borderRadius: "8px", color: "#FF5252", fontWeight: "600", cursor: "pointer" }}>Discard</button>
              <button onClick={() => handleUnsavedAction(true)} style={{ padding: "10px 16px", backgroundColor: "#00d8f6", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600", cursor: "pointer" }}>Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
