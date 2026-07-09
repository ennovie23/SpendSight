import { useState, useEffect } from "react";

// Helper to fetch current date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function TransactionsView({ email, user_id }) {
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const currentYear = new Date().getFullYear().toString(); // "2026"
  const currentMonthIdx = new Date().getMonth(); // 6 (July)
  const currentMonthName = monthsShort[currentMonthIdx]; // "Jul"

  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(getTodayDateString());
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [availableYears, setAvailableYears] = useState(["2026"]);
  const [sortDirection, setSortDirection] = useState("desc");

  // Page limit size & pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Category states
  const [categoriesList, setCategoriesList] = useState(["Food", "Transport", "Utilities", "Entertainment"]);
  const [customCategory, setCustomCategory] = useState("");

  // Edit states
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [showScannerOptions, setShowScannerOptions] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [scanImagePreview, setScanImagePreview] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [formReceiptUrl, setFormReceiptUrl] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Trash bin states
  const [viewTrash, setViewTrash] = useState(false);

  // Modal confirmation states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "", onConfirm: null });

  // Helper to format date string from database format (e.g. YYYY-MM-DD) to frontend presentation
  const formatDateString = (dateStr) => {
    if (!dateStr) return "";
    const parsedDate = new Date(dateStr);
    const options = { month: "short", day: "numeric", year: "numeric" };
    return parsedDate.toLocaleDateString("en-US", options);
  };



  // Helper to trim whitespaces and capitalize the first letter
  const cleanAndFormatCategory = (str) => {
    if (!str) return "";
    const cleaned = str.trim().replace(/\s+/g, ' ');
    if (!cleaned) return "";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  // Update dynamic dropdown options list based on active transactions
  const syncCategories = (data) => {
    const defaultCats = ["Food", "Transport", "Utilities", "Entertainment"];
    const uniqueCats = Array.from(new Set(data.map((tx) => cleanAndFormatCategory(tx.category))));
    const combined = Array.from(new Set([...defaultCats, ...uniqueCats]));
    setCategoriesList(combined);
  };

  // Update dynamic years dropdown based on database records
  const syncAvailableYears = (data) => {
    const txYears = data.map((tx) => {
      if (!tx.date) return null;
      const d = new Date(tx.date);
      return d.getFullYear().toString();
    }).filter(Boolean);

    const uniqueYears = Array.from(new Set(["2026", ...txYears])).sort((a, b) => b - a);
    setAvailableYears(uniqueYears);
  };

  // Load all active expenses
  const fetchExpenses = async () => {
    if (!user_id) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses?user_id=${user_id}`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((tx) => ({
          ...tx,
          date: formatDateString(tx.date),
          amount: parseFloat(tx.amount),
        }));
        setTransactions(formattedData);
        syncCategories(data);
        syncAvailableYears(data);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    }
  };

  // Load soft-deleted expenses
  const fetchTrash = async () => {
    if (!user_id) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/trash?user_id=${user_id}`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((tx) => ({
          ...tx,
          date: formatDateString(tx.date),
          amount: parseFloat(tx.amount),
        }));
        setTransactions(formattedData);
        syncAvailableYears(data);
      }
    } catch (err) {
      console.error("Failed to fetch trash:", err);
    }
  };

  // Sync data fetch on mount or state toggling
  useEffect(() => {
    setEditingId(null);
    clearForm();

    if (viewTrash) {
      fetchTrash();
    } else {
      fetchExpenses();
    }
  }, [user_id, viewTrash]);

  // Reset page index back to 1 if filter settings change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, pageSize, viewTrash]);

  // Determine which months to show in the dropdown based on selected year
  const displayedMonths = selectedYear === currentYear
    ? monthsShort.slice(0, currentMonthIdx + 1) // Only up to current month (Jan - Jul)
    : monthsShort; // All 12 months for previous years

  // Safely reset selected month if it's no longer present in the updated months list
  useEffect(() => {
    if (selectedMonth !== "All" && !displayedMonths.includes(selectedMonth)) {
      setSelectedMonth("All");
    }
  }, [selectedYear, displayedMonths]);

  // Open modal trigger helper
  const confirmAction = (title, message, onConfirm) => {
    setModalConfig({ title, message, onConfirm });
    setShowModal(true);
  };

  // Reset form inputs helper
  const clearForm = () => {
    setAmount("");
    setDescription("");
    setDate(getTodayDateString());
    setCategory("Food");
    setCustomCategory("");
    setScanFile(null);
    setFormReceiptUrl("");
  };

  const handleImageUpload = async (event) => {
    const inputTarget = event.target;
    const file = inputTarget.files[0];
    if (!file) return;

    // Create an object URL to preview the image while scanning
    const objectUrl = URL.createObjectURL(file);
    setScanImagePreview(objectUrl);
    setIsScanning(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/scanner/scan`, {
        method: "POST",
        headers: {
          "x-ai-provider": localStorage.getItem("spendsight_aiProvider") || "gemini",
          "x-ai-key": localStorage.getItem("spendsight_aiKey") || "",
          "x-ai-model": localStorage.getItem("spendsight_aiModel") || "gemini-2.5-flash",
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setScanFile(file); // Save the raw file object to be uploaded upon save
        
        if (data.is_receipt === false) {
          // Pre-fill manual form for objects
          setAmount(data.amount || "");
          setCategory(data.category || "Food");
          setDescription(data.description || data.merchant || "");
          setFormReceiptUrl(data.receipt_url || "");
          
          if (data.category && !categoriesList.includes(data.category)) {
            setCategoriesList(prev => Array.from(new Set([...prev, data.category])));
          }
        } else {
          // Show verification modal for receipts
          setScanResult({
            amount: data.amount || "",
            originalAmount: data.amount || 0,
            merchant: data.merchant || "",
            category: data.category || "Food",
            description: data.description || "",
            items: data.items || [],
            receipt_url: data.receipt_url || ""
          });
          
          if (data.category && !categoriesList.includes(data.category)) {
            setCategoriesList(prev => Array.from(new Set([...prev, data.category])));
          }
        }
      } else {
        setModalConfig({
          title: "Invalid Image",
          message: data.error || "Scanning failed due to an unknown error.",
          onConfirm: null
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error("Scanner error:", err);
      setModalConfig({
        title: "Scanning Error",
        message: "Network error connecting to scanner.",
        onConfirm: null
      });
      setShowModal(true);
    } finally {
      setIsScanning(false);
      setScanImagePreview(null);
      // Clean up the object URL to avoid memory leaks
      URL.revokeObjectURL(objectUrl);
      inputTarget.value = null;
    }
  };

  const handleVoiceLog = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Logging. Please try Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      setIsListening(false);
      const transcript = event.results[0][0].transcript;
      setIsVoiceProcessing(true); // Show voice-specific loader
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/scanner/voice`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-ai-provider": localStorage.getItem("spendsight_aiProvider") || "gemini",
            "x-ai-key": localStorage.getItem("spendsight_aiKey") || "",
            "x-ai-model": localStorage.getItem("spendsight_aiModel") || "gemini-2.5-flash",
          },
          body: JSON.stringify({ transcript }),
        });
        const data = await response.json();
        
        if (response.ok) {
          // Pre-fill manual form directly
          setAmount(data.amount || "");
          setCategory(data.category || "Food");
          setDescription(data.description || data.merchant || "");
          setFormReceiptUrl("");
          setScanFile(null);
          
          if (data.category && !categoriesList.includes(data.category)) {
            setCategoriesList(prev => Array.from(new Set([...prev, data.category])));
          }
        } else {
          setModalConfig({ title: "Voice Log Failed", message: data.error || "Failed to process voice log.", onConfirm: null });
          setShowModal(true);
        }
      } catch (err) {
        console.error("Voice Log Error:", err);
        setModalConfig({ title: "Error", message: "Failed to connect to the server.", onConfirm: null });
        setShowModal(true);
      } finally {
        setIsVoiceProcessing(false);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      console.error("Speech recognition error", event.error);
      if (event.error !== "no-speech") {
        alert("Microphone error: " + event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSaveScan = async () => {
    if (!user_id) {
      setModalConfig({ title: "Error", message: "You are not logged in.", onConfirm: null });
      return setShowModal(true);
    }
    if (!scanResult.amount || isNaN(scanResult.amount) || parseFloat(scanResult.amount) <= 0) {
      setModalConfig({ title: "Invalid Amount", message: "Expense amount must be greater than 0.", onConfirm: null });
      return setShowModal(true);
    }

    try {
      const formData = new FormData();
      formData.append("amount", scanResult.amount);
      formData.append("category", scanResult.category);
      formData.append("description", scanResult.description || scanResult.merchant);
      formData.append("date", getTodayDateString());
      formData.append("user_id", user_id);
      formData.append("merchant", scanResult.merchant || "");
      if (scanFile) formData.append("image", scanFile);
      if (scanResult.receipt_url) formData.append("receipt_url", scanResult.receipt_url);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const savedTx = await response.json();
        setTransactions((prev) => [{ ...savedTx, date: formatDateString(savedTx.date), amount: parseFloat(savedTx.amount) }, ...prev]);
        setScanResult(null); // close modal
        setScanFile(null); // Clear file
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Form submit handler
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      if (!user_id) {
        setModalConfig({ title: "Error", message: "You are not logged in.", onConfirm: null });
        setShowModal(true);
        return;
      }
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        setModalConfig({ title: "Invalid Amount", message: "Expense amount must be greater than 0.", onConfirm: null });
        setShowModal(true);
        return;
      }
      if (!category) {
        alert("Please select a category");
        return;
      }
      if (category === "Other" && !customCategory.trim()) {
        alert("Please specify custom category name");
        return;
      }
      if (!date) {
        alert("Please select a date");
        return;
      }
      if (date > getTodayDateString()) {
        alert("You cannot log expenses for future dates.");
        return;
      }

      const finalCategory = category === "Other" ? cleanAndFormatCategory(customCategory) : category;

      if (editingId) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            category: finalCategory,
            description: description || finalCategory,
            date,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const updatedTx = {
            ...data,
            date: formatDateString(data.date),
            amount: parseFloat(data.amount),
          };
          setTransactions(transactions.map((t) => (t.id === editingId ? updatedTx : t)));
          
          if (!categoriesList.includes(finalCategory)) {
            setCategoriesList([...categoriesList, finalCategory]);
          }
          
          setEditingId(null);
          clearForm();
          fetchExpenses();
        } else {
          alert("Failed to update expense in the database.");
        }
      } else {
        const formData = new FormData();
        formData.append("amount", amount);
        formData.append("category", finalCategory);
        formData.append("description", description || finalCategory);
        formData.append("date", date);
        formData.append("user_id", user_id);
        if (formReceiptUrl) formData.append("receipt_url", formReceiptUrl);
        if (scanFile) formData.append("image", scanFile);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const newTx = {
            ...data,
            date: formatDateString(data.date),
            amount: parseFloat(data.amount),
          };
          if (!viewTrash) {
            setTransactions([newTx, ...transactions]);
          }

          if (!categoriesList.includes(finalCategory)) {
            setCategoriesList([...categoriesList, finalCategory]);
          }

          clearForm();
          fetchExpenses();
        } else {
          alert("Failed to save expense in the database.");
        }
      }
    } catch (error) {
      console.error("Error processing expense:", error);
      alert("Error processing expense. Please try again.");
    }
  };

  // Populate form with transaction data to initiate editing
  const handleEditClick = (tx) => {
    const dateObj = new Date(tx.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const formattedDateForInput = `${year}-${month}-${day}`;

    if (!categoriesList.includes(tx.category)) {
      setCategoriesList([...categoriesList, tx.category]);
    }

    setEditingId(tx.id);
    setAmount(tx.amount.toString());
    setCategory(tx.category);
    setDescription(tx.description === tx.category ? "" : tx.description);
    setDate(formattedDateForInput);
    setCustomCategory("");
  };

  // Soft delete active expense handler
  const handleDeleteClick = (id) => {
    confirmAction(
      "Move to Trash?",
      "Are you sure you want to move this expense to the trash bin? You can restore it later.",
      async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/${id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            setTransactions(transactions.filter((t) => t.id !== id));
            if (editingId === id) {
              setEditingId(null);
              clearForm();
            }
            fetchExpenses();
          } else {
            alert("Failed to delete transaction.");
          }
        } catch (err) {
          console.error("Error deleting transaction:", err);
        }
      }
    );
  };

  // Restore trashed expense handler
  const handleRestoreClick = (id) => {
    confirmAction(
      "Restore Transaction?",
      "This transaction will be recovered back into your active logs.",
      async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/restore/${id}`, {
            method: "POST",
          });
          if (response.ok) {
            setTransactions(transactions.filter((t) => t.id !== id));
            fetchTrash();
          } else {
            alert("Failed to restore transaction.");
          }
        } catch (err) {
          console.error("Error restoring transaction:", err);
        }
      }
    );
  };

  // Hard delete / purge single trashed expense handler
  const handlePurgeClick = (id) => {
    confirmAction(
      "Delete Permanently?",
      "Warning: This action cannot be undone. This expense will be permanently deleted from the database.",
      async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/purge/${id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            setTransactions(transactions.filter((t) => t.id !== id));
          } else {
            alert("Failed to delete transaction permanently.");
          }
        } catch (err) {
          console.error("Error purging transaction:", err);
        }
      }
    );
  };

  // Purge all trashed expenses handler
  const handleClearTrashClick = () => {
    confirmAction(
      "Empty Trash Bin?",
      "Warning: This will permanently delete all trashed expenses. This action cannot be undone.",
      async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses/trash/clear?user_id=${user_id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            setTransactions([]);
          } else {
            alert("Failed to clear trash bin.");
          }
        } catch (err) {
          console.error("Error clearing trash:", err);
        }
      }
    );
  };

  // Toggle sort direction
  const handleSortToggle = () => {
    setSortDirection(sortDirection === "desc" ? "asc" : "desc");
  };

  // Badge stylings per category
  const getCategoryStyles = (cat) => {
    switch (cat) {
      case "Food":
        return { color: "#00d8f6", bg: "rgba(0, 216, 246, 0.1)", dot: "#00d8f6" };
      case "Transport":
        return { color: "#FF007A", bg: "rgba(255, 0, 122, 0.1)", dot: "#FF007A" };
      case "Utilities":
        return { color: "#9F7AEA", bg: "rgba(121, 40, 202, 0.1)", dot: "#9F7AEA" };
      case "Entertainment":
        return { color: "#00E676", bg: "rgba(0, 230, 118, 0.1)", dot: "#00E676" };
      default:
        let hash = 0;
        for (let i = 0; i < cat.length; i++) {
          hash = cat.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        const color = `hsl(${hue}, 85%, 60%)`;
        const bg = `hsla(${hue}, 85%, 60%, 0.12)`;
        return { color, bg, dot: color };
    }
  };

  // Filter and sort transactions by year and dynamic months
  const filteredAndSortedTransactions = transactions
    .filter((tx) => {
      if (selectedYear && !tx.date.includes(selectedYear)) return false;
      if (selectedMonth === "All") return true;
      return tx.date.startsWith(selectedMonth);
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

  // Calculate pagination boundaries
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedTransactions = filteredAndSortedTransactions.slice(startIndex, endIndex);

  return (
    <div style={{ color: "var(--text-primary)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: isMobile ? "24px" : "40px" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "28px" : "32px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
            {viewTrash ? "Trash Bin" : "Log Expenses"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "14px" : "16px", marginTop: "8px" }}>
            {viewTrash ? "Recover or permanently delete trashed items." : "Track your daily spending."}
          </p>
        </div>

        {/* Page Level Trash & Clear Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {viewTrash && transactions.length > 0 && (
            <button
              onClick={handleClearTrashClick}
              style={{
                backgroundColor: "rgba(255, 82, 82, 0.1)",
                border: "1px solid rgba(255, 82, 82, 0.2)",
                color: "#FF5252",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 82, 82, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 82, 82, 0.1)";
              }}
            >
              Empty Trash
            </button>
          )}

          <button
            onClick={() => setViewTrash(!viewTrash)}
            style={{
              backgroundColor: viewTrash ? "rgba(0, 216, 246, 0.1)" : "rgba(113, 128, 150, 0.1)",
              border: `1px solid ${viewTrash ? "rgba(0, 216, 246, 0.2)" : "rgba(113, 128, 150, 0.2)"}`,
              color: viewTrash ? "#00d8f6" : "var(--text-secondary)",
              padding: "10px 18px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
          >
            {viewTrash ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Log
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Trash Bin
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI & Voice Action Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        <div style={{ position: "relative" }}>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            onChange={(e) => { setShowScannerOptions(false); handleImageUpload(e); }} 
            id="scanner-input-camera" 
            style={{ display: "none" }} 
          />
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => { setShowScannerOptions(false); handleImageUpload(e); }} 
            id="scanner-input-gallery" 
            style={{ display: "none" }} 
          />
          <button 
            onClick={() => setShowScannerOptions(!showScannerOptions)}
            disabled={isScanning}
            style={{ width: "100%", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", cursor: isScanning ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: isScanning ? 0.7 : 1 }} 
            onMouseEnter={(e) => { if (!isScanning) e.currentTarget.style.backgroundColor = "var(--card-hover)" }} 
            onMouseLeave={(e) => { if (!isScanning) e.currentTarget.style.backgroundColor = "var(--bg-card)" }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(0, 216, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d8f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
              {isScanning ? "Scanning..." : "Snap & Log AI"}
            </span>
          </button>
          
          {showScannerOptions && !isScanning && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: "8px",
              backgroundColor: "var(--bg-card-inner)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              zIndex: 10
            }}>
              <button 
                onClick={(e) => { e.stopPropagation(); document.getElementById("scanner-input-camera").click(); }}
                style={{ padding: "12px 16px", backgroundColor: "transparent", border: "none", color: "var(--text-primary)", textAlign: "left", cursor: "pointer", borderRadius: "8px", fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0, 216, 246, 0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                📸 Take Photo
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); document.getElementById("scanner-input-gallery").click(); }}
                style={{ padding: "12px 16px", backgroundColor: "transparent", border: "none", color: "var(--text-primary)", textAlign: "left", cursor: "pointer", borderRadius: "8px", fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0, 216, 246, 0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                🖼️ Upload from Gallery
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={handleVoiceLog}
          style={{ 
            backgroundColor: isListening ? "rgba(255, 69, 58, 0.1)" : "var(--bg-card)", 
            border: `1px solid ${isListening ? "rgba(255, 69, 58, 0.5)" : "var(--border-color)"}`, 
            borderRadius: "16px", 
            padding: "28px", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "16px", 
            cursor: "pointer", 
            transition: "all 0.2s",
            animation: isListening ? "pulse-border 1.5s infinite" : "none"
          }} 
          onMouseEnter={(e) => !isListening && (e.currentTarget.style.backgroundColor = "rgba(121, 40, 202, 0.08)")} 
          onMouseLeave={(e) => !isListening && (e.currentTarget.style.backgroundColor = "var(--bg-card)")}
        >
          <style>
            {`
              @keyframes pulse-border {
                0% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(255, 69, 58, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0); }
              }
            `}
          </style>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: isListening ? "rgba(255, 69, 58, 0.2)" : "rgba(121, 40, 202, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isListening ? "#FF453A" : "#7928CA"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <span style={{ fontSize: "16px", fontWeight: "600", color: isListening ? "#FF453A" : "var(--text-secondary)", transition: "color 0.2s" }} onMouseEnter={(e) => !isListening && (e.currentTarget.style.color = "var(--text-primary)")} onMouseLeave={(e) => !isListening && (e.currentTarget.style.color = "var(--text-secondary)")}>
            {isListening ? "Listening..." : "Voice Log"}
          </span>
        </button>
      </div>

      {/* Two Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: "32px", alignItems: "start" }}>
        
        {/* Left Column: New Transaction Form */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "20px" : "28px", textAlign: "left", opacity: viewTrash ? 0.5 : 1, pointerEvents: viewTrash ? "none" : "auto" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 24px 0" }}>
            {editingId ? "Edit Transaction" : "Manual Entry"}
          </h2>

          <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Amount input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Amount (₱)</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: "14px", pointerEvents: "none", color: "var(--text-secondary)", display: "flex" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={viewTrash}
                  style={{
                    width: "100%",
                    backgroundColor: "var(--bg-card-inner)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 16px 12px 40px",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Category selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Category</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: "14px", pointerEvents: "none", color: "var(--text-secondary)", display: "flex" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomCategory("");
                    }
                  }}
                  disabled={viewTrash}
                  style={{
                    width: "100%",
                    backgroundColor: "var(--bg-card-inner)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 16px 12px 40px",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Other">Other (Custom)</option>
              </select>
            </div>
          </div>

            {/* Custom Category name input (Only if Category === "Other") */}
            {category === "Other" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Custom Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Shopping, Subscriptions"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  disabled={viewTrash}
                  style={{
                    width: "100%",
                    backgroundColor: "var(--bg-card-inner)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Description input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Add a short note (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={viewTrash}
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-card-inner)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Date selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Date</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: "14px", pointerEvents: "none", color: "var(--text-secondary)", display: "flex" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <input
                  type="date"
                  value={date}
                  max={getTodayDateString()}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={viewTrash}
                  style={{
                    width: "100%",
                    backgroundColor: "var(--bg-card-inner)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 16px 12px 40px",
                    color: "var(--text-primary)",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            {/* Submit / Cancel Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <button
                type="submit"
                disabled={viewTrash}
                onMouseEnter={() => setIsBtnHovered(true)}
                onMouseLeave={() => setIsBtnHovered(false)}
                style={{
                  width: "100%",
                  backgroundColor: isBtnHovered ? "#00e5ff" : "#00d8f6",
                  color: "#080B11",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: viewTrash ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background-color 0.2s ease-in-out",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {editingId ? "Update" : "Add Expense"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    clearForm();
                  }}
                  style={{
                    width: "100%",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--text-secondary)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Transactions List */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "20px" : "28px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
              {viewTrash ? "Deleted Transactions" : "Recent Transactions"}
            </h2>
            
            {/* Filter controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Page size limit selector */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  backgroundColor: "var(--bg-card-inner)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value={10}>Show 10</option>
                <option value={25}>Show 25</option>
                <option value={50}>Show 50</option>
              </select>

              {/* Year Selector dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-card-inner)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              {/* Month selector dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-card-inner)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="All">All Months</option>
                {displayedMonths.map((month) => (
                  <option key={month} value={month}>
                    {month === "Jan" && "January"}
                    {month === "Feb" && "February"}
                    {month === "Mar" && "March"}
                    {month === "Apr" && "April"}
                    {month === "May" && "May"}
                    {month === "Jun" && "June"}
                    {month === "Jul" && "July"}
                    {month === "Aug" && "August"}
                    {month === "Sep" && "September"}
                    {month === "Oct" && "October"}
                    {month === "Nov" && "November"}
                    {month === "Dec" && "December"}
                  </option>
                ))}
              </select>
              
              <span style={{ color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>
                Showing {Math.min(startIndex + 1, filteredAndSortedTransactions.length)} - {Math.min(endIndex, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length}
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: "600px", display: "flex", flexDirection: "column" }}>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", padding: "16px 24px", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px" }}>
                <span>DATE</span>
                <span>CATEGORY</span>
                <span>AMOUNT</span>
                <span style={{ textAlign: "right" }}>ACTION</span>
              </div>

              <div style={{ overflowY: "auto", maxHeight: "480px", display: "flex", flexDirection: "column" }}>
                {displayedTransactions.length === 0 ? (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
                    {viewTrash ? "Trash bin is empty." : "No transactions logged yet."}
                  </div>
                ) : (
                  displayedTransactions.map((tx, index) => {
                    const styleData = getCategoryStyles(tx.category);
                    const isEditingThis = editingId === tx.id;
                    const rowBg = index % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.02)";
                    
                    return (
                      <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border-color)", backgroundColor: isEditingThis ? "rgba(0, 216, 246, 0.08)" : rowBg, opacity: viewTrash && !tx.deleted_at ? 0.5 : 1, transition: "background-color 0.2s" }} onMouseEnter={(e) => {if(!isEditingThis) e.currentTarget.style.backgroundColor = "var(--bg-card-inner)"}} onMouseLeave={(e) => {if(!isEditingThis) e.currentTarget.style.backgroundColor = rowBg}}>
                        
                        {/* Date */}
                        <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                          {tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </span>
                        
                        {/* Category Badge */}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              backgroundColor: styleData.bg,
                              color: styleData.color,
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "bold"
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: styleData.dot }}></span>
                            {tx.category}
                          </span>
                        </div>

                        {/* Amount */}
                        <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                          ₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        
                        {/* Action Buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", opacity: isEditingThis ? 1 : 0.6, transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = isEditingThis ? 1 : 0.6}>
                        {viewTrash ? (
                          <>
                            {tx.receipt_url && (
                              <button onClick={() => setReceiptPreview(tx)} title="View Receipt" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#00d8f6"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m16 17-2.5-2.5-1.5 1.5-2-2L8 16"/></svg>
                              </button>
                            )}
                            {/* Restore Button */}
                            <button onClick={() => handleRestoreClick(tx.id)} title="Restore" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#00d8f6"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 9.5 2.5M2 12.5a10 10 0 0 0 12.5 9"/></svg>
                            </button>
                            <button onClick={() => handlePurgeClick(tx.id)} title="Delete Permanently" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#FF5252"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </>
                        ) : (
                          <>
                            {tx.receipt_url && (
                              <button onClick={() => setReceiptPreview(tx)} title="View Receipt" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#00d8f6"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m16 17-2.5-2.5-1.5 1.5-2-2L8 16"/></svg>
                              </button>
                            )}
                            <button onClick={() => handleEditClick(tx)} title="Edit Expense" style={{ background: "none", border: "none", cursor: "pointer", color: isEditingThis ? "#00d8f6" : "var(--text-secondary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#00d8f6"} onMouseLeave={(e) => e.currentTarget.style.color = isEditingThis ? "#00d8f6" : "var(--text-secondary)"}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={() => handleDeleteClick(tx.id)} title="Move to Trash" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#FF5252"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
              </div>
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredAndSortedTransactions.length > pageSize && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-color)",
              flexShrink: 0
            }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-color)",
                  color: currentPage === 1 ? "var(--text-secondary)" : "var(--text-primary)",
                  opacity: currentPage === 1 ? 0.4 : 1,
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-color)",
                  color: currentPage === totalPages ? "var(--text-secondary)" : "var(--text-primary)",
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--modal-overlay)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(1.5px)",
        }}>
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "30px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.7)",
            textAlign: "left"
          }}>
            <h3 style={{ margin: "0 0 12px 0", color: "var(--text-primary)", fontSize: "18px", fontWeight: "700" }}>
              {modalConfig.title}
            </h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
              {modalConfig.message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {modalConfig.onConfirm ? "Cancel" : "Close"}
              </button>
              {modalConfig.onConfirm && (
                <button
                  onClick={() => {
                    modalConfig.onConfirm();
                    setShowModal(false);
                  }}
                  style={{
                    backgroundColor: "#FF5252",
                    border: "none",
                    color: "#FFF",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {scanResult && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--modal-overlay)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(2px)",
        }}>
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.5)",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d8f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Scan Result</h3>
              </div>
              <button 
                onClick={() => setScanResult(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", fontSize: "18px" }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "13px" }}>
                <span>Merchant</span>
                <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{scanResult.merchant || "Unknown"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "13px" }}>
                <span>Date</span>
                <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{formatDateString(getTodayDateString())}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", maxHeight: "150px", overflowY: "auto" }}>
              {scanResult.items && scanResult.items.length > 0 ? (
                scanResult.items.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--text-secondary)" }}>
                    <span>{item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</span>
                    <span>₱{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontStyle: "italic" }}>No line items detected</div>
              )}
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", paddingBottom: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>Total (₱)</span>
              <input
                type="number"
                value={scanResult.amount}
                onChange={(e) => setScanResult({...scanResult, amount: e.target.value})}
                readOnly={parseFloat(scanResult.originalAmount) > 0}
                style={{ 
                  width: "120px", 
                  textAlign: "right", 
                  backgroundColor: "var(--bg-app)", 
                  border: parseFloat(scanResult.originalAmount) > 0 ? "none" : "1px solid var(--border-color)", 
                  color: "#00d8f6", 
                  padding: "6px 12px", 
                  borderRadius: "8px", 
                  fontSize: "18px", 
                  fontWeight: "700", 
                  outline: "none" 
                }}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Description / Category</span>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  value={scanResult.description}
                  onChange={(e) => setScanResult({...scanResult, description: e.target.value})}
                  style={{ flex: 1, backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                />
                <select
                  value={scanResult.category}
                  onChange={(e) => setScanResult({...scanResult, category: e.target.value})}
                  style={{ width: "120px", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "10px 12px", borderRadius: "8px", fontSize: "14px", outline: "none" }}
                >
                  {categoriesList.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleSaveScan}
              style={{ width: "100%", backgroundColor: "#00d8f6", color: "#000", border: "none", padding: "14px", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: "pointer", marginTop: "8px", transition: "all 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#00b5ce"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#00d8f6"}
            >
              ✓ Save Transaction
            </button>
          </div>
        </div>
      )}

      {isScanning && scanImagePreview && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          backdropFilter: "blur(8px)",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            backgroundColor: "var(--bg-card)",
            padding: "32px",
            borderRadius: "20px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            width: "90%",
            maxWidth: "400px",
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{
              width: "200px",
              height: "200px",
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid #00d8f6",
              position: "relative"
            }}>
              <img 
                src={scanImagePreview} 
                alt="Scanning..." 
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} 
              />
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                backgroundColor: "#00d8f6",
                boxShadow: "0 0 10px #00d8f6",
                animation: "scanLine 2s infinite ease-in-out"
              }} />
            </div>
            
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#00d8f6", fontSize: "20px" }}>Scanning Receipt</h3>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
                Analyzing items, dates, and amounts...
              </p>
            </div>
            
            <style>
              {`
                @keyframes scanLine {
                  0% { top: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { top: 100%; opacity: 0; }
                }
              `}
            </style>
          </div>
        </div>
      )}

      {isVoiceProcessing && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          backdropFilter: "blur(8px)",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            backgroundColor: "var(--bg-card)",
            padding: "32px",
            borderRadius: "20px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            width: "90%",
            maxWidth: "400px",
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 69, 58, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "voicePulse 1.5s infinite"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#FF453A", fontSize: "20px" }}>Analyzing Audio</h3>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
                Extracting amount and merchant using AI...
              </p>
            </div>
            
            <style>
              {`
                @keyframes voicePulse {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.4); }
                  70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(255, 69, 58, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 69, 58, 0); }
                }
              `}
            </style>
          </div>
        </div>
      )}


      {receiptPreview && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ position: "absolute", top: "24px", right: "24px" }}>
            <button onClick={() => setReceiptPreview(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "8px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: "900px", width: "90%", maxHeight: "90vh", backgroundColor: "var(--bg-card)", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ flex: 1, backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={receiptPreview.receipt_url.startsWith('http') ? receiptPreview.receipt_url : `${import.meta.env.VITE_API_URL}${receiptPreview.receipt_url}`} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ width: isMobile ? "100%" : "350px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "20px" }}>Transaction Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>MERCHANT</div>
                  <div style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "500" }}>{receiptPreview.merchant || "Unknown"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>DATE</div>
                  <div style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "500" }}>{new Date(receiptPreview.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>CATEGORY</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: getCategoryStyles(receiptPreview.category).bg, color: getCategoryStyles(receiptPreview.category).color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: getCategoryStyles(receiptPreview.category).dot }}></span>
                    {receiptPreview.category}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>AMOUNT</div>
                  <div style={{ fontSize: "24px", color: "#00d8f6", fontWeight: "700" }}>₱{parseFloat(receiptPreview.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                {receiptPreview.description && receiptPreview.description !== receiptPreview.merchant && (
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>NOTE</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: "1.5" }}>{receiptPreview.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsView;
