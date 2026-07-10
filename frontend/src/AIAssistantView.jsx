import React, { useState, useEffect, useRef } from "react";

function AIAssistantView() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem("aiCurrentSessionId") || null);
  
  const initialMessage = { role: "assistant", text: "Hi there! I am your SpendSight AI. I can help you analyze your spending, set goals, or find anomalies. What would you like to know?" };
  
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userId = localStorage.getItem("spendsight_userId");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userId) return;
    const loadSessions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/sessions?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    };
    loadSessions();
  }, [userId, API_URL]);

  const selectSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    if (sessionId) {
      localStorage.setItem("aiCurrentSessionId", sessionId);
    } else {
      localStorage.removeItem("aiCurrentSessionId");
    }
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
           setMessages(data.map(m => ({ role: m.role, text: m.content })));
        } else {
           setMessages([initialMessage]);
        }
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  };

  const createNewChat = () => {
    setCurrentSessionId(null);
    localStorage.removeItem("aiCurrentSessionId");
    setMessages([initialMessage]);
  };

  useEffect(() => {
    const savedSessionId = localStorage.getItem("aiCurrentSessionId");
    if (savedSessionId) {
      selectSession(savedSessionId);
    }
  }, []);

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions/${sessionToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
        if (currentSessionId === sessionToDelete) {
          createNewChat();
        }
        if (isMobile) setShowMobileSidebar(false);
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const systemInstruction = "You are SpendSight AI, a strict, hyper-focused personal finance assistant. You only answer questions regarding budgeting, expenses, saving, investing, taxes, and financial strategies. If a user asks a general question, a coding question, or anything unrelated to money and finance, politely refuse to answer. Example refusal: 'I am your SpendSight AI assistant, specialized only in managing your personal finances. I cannot help with off-topic queries.'";

  const saveMessageToBackend = async (sessionId, role, content) => {
    try {
      await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content })
      });
    } catch (e) {
      console.error("Failed to save message", e);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : input;
    if (!text.trim() || isLoading) return;
    
    const userMsg = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const provider = localStorage.getItem("spendsight_aiProvider") || "gemini";
    const apiKey = localStorage.getItem("spendsight_aiKey") || "";
    const model = localStorage.getItem("spendsight_aiModel") || "gemini-2.5-flash";

    if (!apiKey) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Please add your API key in Settings > AI Assistant to start chatting." }]);
      setIsLoading(false);
      return;
    }

    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
      try {
        const res = await fetch(`${API_URL}/api/chat/sessions`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ user_id: userId, title: text.substring(0, 30) + (text.length > 30 ? "..." : "") })
        });
        if (res.ok) {
           const newSession = await res.json();
           activeSessionId = newSession.id;
           setCurrentSessionId(activeSessionId);
           setSessions(prev => [newSession, ...prev]);
        }
      } catch (e) {
         console.error("Failed to create session", e);
      }
    }

    if (activeSessionId) {
       await saveMessageToBackend(activeSessionId, "user", text);
    }

    try {
      let reply = "";
      
      if (provider === "openrouter") {
        const history = messages.slice(1).map(m => ({ role: m.role, content: m.text }));
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemInstruction },
              ...history,
              { role: "user", content: text }
            ]
          })
        });
        
        if (!response.ok) throw new Error("API request failed");
        const data = await response.json();
        reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
        
      } else {
        const history = messages.slice(1).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }]
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [
              ...history,
              { role: "user", parts: [{ text: text }] }
            ]
          })
        });
        
        if (!response.ok) throw new Error("API request failed");
        const data = await response.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
      }

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      if (activeSessionId) {
         await saveMessageToBackend(activeSessionId, "assistant", reply);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", text: "An error occurred while connecting to the AI. Please check your API key and model name." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: isMobile ? "transparent" : "var(--bg-card)",
        border: isMobile ? "none" : "1px solid var(--border-color)",
        borderRadius: isMobile ? "0" : "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        height: isMobile ? "calc(100vh - 70px)" : "calc(100vh - 100px)",
        position: "relative",
      }}
    >
      {/* Mobile Backdrop */}
      {isMobile && showMobileSidebar && (
        <div 
          onClick={() => setShowMobileSidebar(false)}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 40,
            backdropFilter: "blur(2px)"
          }}
        />
      )}

      {/* History Sidebar */}
      <div style={{
        position: isMobile ? "absolute" : "relative",
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: isMobile ? (showMobileSidebar ? "translateX(0)" : "translateX(-100%)") : "none",
        transition: "transform 0.3s ease",
        width: isMobile ? "280px" : "260px",
        flexShrink: 0,
        borderRight: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-card-inner)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        boxShadow: isMobile && showMobileSidebar ? "4px 0 24px rgba(0,0,0,0.5)" : "none"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "0 8px" }}>
          <h3 style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>
            Recent Chats
          </h3>
          <button 
            onClick={createNewChat}
            style={{
              background: "transparent",
              border: "none",
              color: "#00d8f6",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "4px"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
          {sessions.map((session) => (
            <div key={session.id} onClick={() => { selectSession(session.id); if (isMobile) setShowMobileSidebar(false); }} style={{
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: currentSessionId === session.id ? "rgba(0, 216, 246, 0.08)" : "transparent",
              color: currentSessionId === session.id ? "#00d8f6" : "var(--text-secondary)",
              fontSize: "14px",
              fontWeight: currentSessionId === session.id ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }} onMouseEnter={(e) => { 
                if (currentSessionId !== session.id) {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.color = "var(--text-primary)";
                }
            }} onMouseLeave={(e) => { 
                if (currentSessionId !== session.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                }
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSessionToDelete(session.id); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.5,
                    transition: "opacity 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                  title="Delete chat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
             <div style={{ padding: "12px 8px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
               No recent chats.
             </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        width: "100%"
      }}>
        <div
          style={{
            padding: isMobile ? "16px 20px" : "24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 216, 246, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00d8f6",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
            </svg>
          </div>
          <div style={{ flexGrow: 1 }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
              AI Assistant
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              Powered by SpendSight
            </p>
          </div>
          {isMobile && (
            <button
              onClick={() => setShowMobileSidebar(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
              }}
              title="Recent Chats"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </button>
          )}
        </div>

        {/* Messages */}
        <div
          style={{
            flexGrow: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {messages.map((msg, index) => (
            <div key={index} style={{ display: "flex", gap: isMobile ? "10px" : "16px", maxWidth: isMobile ? "95%" : "80%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              {msg.role === "assistant" && (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0, 216, 246, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#00d8f6",
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  </svg>
                </div>
              )}
              <div
                style={{
                  backgroundColor: msg.role === "user" ? "rgba(0, 216, 246, 0.15)" : "rgba(0, 216, 246, 0.04)",
                  border: msg.role === "user" ? "1px solid rgba(0, 216, 246, 0.3)" : "1px solid rgba(0, 216, 246, 0.2)",
                  padding: isMobile ? "12px 16px" : "16px 20px",
                  borderRadius: msg.role === "user" ? "16px 0 16px 16px" : "0 16px 16px 16px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                }}
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", gap: isMobile ? "10px" : "16px", maxWidth: isMobile ? "95%" : "80%" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 216, 246, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00d8f6",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              </div>
              <div style={{ padding: isMobile ? "12px 16px" : "16px 20px", color: "var(--text-secondary)", fontSize: "13px" }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: isMobile ? "12px 20px 24px 20px" : "24px", 
          borderTop: isMobile ? "none" : "1px solid var(--border-color)", 
          backgroundColor: isMobile ? "transparent" : "var(--bg-card)" 
        }}>
          {/* Suggestions */}
          {messages.length === 1 && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              {["Analyze this week's anomalies", "Set a savings goal", "Am I on track?"].map(
                (text) => (
                  <button
                    key={text}
                    onClick={() => handleSendMessage(text)}
                    disabled={isLoading}
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid var(--border-color)",
                      borderRadius: "20px",
                      padding: "8px 16px",
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      cursor: isLoading ? "default" : "pointer",
                      transition: "all 0.2s ease",
                      opacity: isLoading ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if(!isLoading) {
                        e.currentTarget.style.color = "var(--text-primary)";
                        e.currentTarget.style.borderColor = "var(--text-secondary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if(!isLoading) {
                        e.currentTarget.style.color = "var(--text-secondary)";
                        e.currentTarget.style.borderColor = "var(--border-color)";
                      }
                    }}
                  >
                    {text}
                  </button>
                )
              )}
            </div>
          )}

          {/* Input Field */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Ask anything about your finances..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={isLoading}
              style={{
                width: "100%",
                backgroundColor: "var(--bg-card-inner)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "12px 48px 12px 16px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                opacity: isLoading ? 0.5 : 1
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              style={{
                position: "absolute",
                right: "12px",
                backgroundColor: "rgba(0, 216, 246, 0.08)",
                border: "none",
                borderRadius: "8px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: (isLoading || !input.trim()) ? "var(--text-secondary)" : "#00d8f6",
                cursor: (isLoading || !input.trim()) ? "default" : "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "var(--bg-card)",
            padding: "32px",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            width: "90%",
            maxWidth: "400px",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)", fontSize: "20px" }}>Delete Chat</h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to permanently delete this chat history? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "transparent",
                  color: "var(--text-primary)",
                  cursor: isDeleting ? "default" : "pointer",
                  fontWeight: "600",
                  opacity: isDeleting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteSession}
                disabled={isDeleting}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "rgba(255, 69, 58, 0.1)",
                  color: "#ff453a",
                  cursor: isDeleting ? "default" : "pointer",
                  fontWeight: "600",
                  opacity: isDeleting ? 0.5 : 1
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Chat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistantView;
