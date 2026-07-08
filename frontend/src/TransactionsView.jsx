import { useState, useEffect } from "react";

function TransactionsView({ email, user_id }) {
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const currentYear = new Date().getFullYear().toString(); // "2026"
  const currentMonthIdx = new Date().getMonth(); // 6 (July)
  const currentMonthName = monthsShort[currentMonthIdx]; // "Jul"

  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState("2026-07-07");
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

  // Helper to fetch current date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    setDate("2026-07-07");
    setCategory("Food");
    setCustomCategory("");
  };

  // Form submit handler
  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      if (!user_id) {
        alert("You are not logged in.");
        return;
      }
      if (!amount) {
        alert("Please enter an amount");
        return;
      }
      if (isNaN(amount)) {
        alert("Please enter a valid amount");
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            category: finalCategory,
            description: description || finalCategory,
            date,
            user_id,
          }),
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

      {/* Two Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: "32px", alignItems: "start" }}>
        
        {/* Left Column: New Transaction Form */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "20px" : "28px", textAlign: "left", opacity: viewTrash ? 0.5 : 1, pointerEvents: viewTrash ? "none" : "auto" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 24px 0" }}>
            {editingId ? "Edit Transaction" : "New Transaction"}
          </h2>

          <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Amount input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Amount (₱)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "12px", color: "var(--text-secondary)", fontSize: "15px" }}>₱</span>
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
                    padding: "12px 16px 12px 32px",
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
                  padding: "12px 16px",
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
                  padding: "12px 16px",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              />
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
                  backgroundColor: isBtnHovered ? "#00e5ff" : "#00b6d3",
                  color: "#080B11",
                  border: "none",
                  borderRadius: "8px",
                  padding: "14px",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {editingId ? "Save Expense" : <><span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span> Add Expense</>}
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

          <div style={{ overflowY: "auto", maxHeight: "480px" }}>
          <div style={{ overflowY: "auto", maxHeight: "480px", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "4px" }}>
            {displayedTransactions.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px", border: "1px dashed var(--border-color)", borderRadius: "12px" }}>
                {viewTrash ? "Trash bin is empty." : "No transactions logged yet."}
              </div>
            ) : (
              displayedTransactions.map((tx) => {
                const styleData = getCategoryStyles(tx.category);
                const isEditingThis = editingId === tx.id;
                
                return (
                  <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", backgroundColor: isEditingThis ? "rgba(0, 216, 246, 0.08)" : "var(--bg-card-inner)", border: "1px solid var(--border-color)", borderRadius: "12px", opacity: viewTrash && !tx.deleted_at ? 0.5 : 1 }}>
                    
                    {/* Left Side: Date and Category Badge */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
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
                          fontWeight: "bold",
                          width: "fit-content"
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: styleData.dot }}></span>
                        {tx.category}
                      </span>
                    </div>

                    {/* Right Side: Amount and Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                        ₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      
                      {/* Action Buttons */}
                      <div style={{ display: "flex", gap: "4px" }}>
                        {viewTrash ? (
                          <>
                            {/* Restore Button */}
                            <button
                              onClick={() => handleRestoreClick(tx.id)}
                              title="Restore"
                              style={{
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-secondary)",
                                transition: "color 0.2s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "4px",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#00d8f6"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2.5 2v6h6M21.5 22v-6h-6" />
                                <path d="M22 11.5A10 10 0 0 0 9.5 2.5M2 12.5a10 10 0 0 0 12.5 9" />
                              </svg>
                            </button>
                            
                            {/* Purge Button */}
                            <button
                              onClick={() => handlePurgeClick(tx.id)}
                              title="Delete Permanently"
                              style={{
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-secondary)",
                                transition: "color 0.2s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "4px",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#FF5252"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditClick(tx)}
                              title="Edit Expense"
                              style={{
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: isEditingThis ? "#00d8f6" : "var(--text-secondary)",
                                transition: "color 0.2s ease-in-out",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#00d8f6"}
                              onMouseLeave={(e) => e.currentTarget.style.color = isEditingThis ? "#00d8f6" : "var(--text-secondary)"}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            {/* Soft Delete Button */}
                            <button
                              onClick={() => handleDeleteClick(tx.id)}
                              title="Move to Trash"
                              style={{
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-secondary)",
                                transition: "color 0.2s ease-in-out",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#FF5252"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
                Cancel
              </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsView;
