import { useState, useEffect } from "react";
function DashboardView({ email, user_id }) {
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const currentYear = new Date().getFullYear().toString(); // "2026"
  const currentMonthIdx = new Date().getMonth(); // 6 (July)
  const currentMonthName = monthsShort[currentMonthIdx]; // "Jul"

  const [selectedMonth, setSelectedMonth] = useState(() => localStorage.getItem("globalSelectedMonth") || "All");
  const [selectedYear, setSelectedYear] = useState(() => localStorage.getItem("globalSelectedYear") || new Date().getFullYear().toString());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [analyticsData, setAnalyticsData] = useState({ total_spend: 0 });
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState(["2026"]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch actual calculated values from the Python analytics engine endpoint
  useEffect(() => {
    fetchAnalytics();
  }, [user_id, selectedMonth, selectedYear]);

  // Run initial sync to fetch transaction lists and discover available years
  useEffect(() => {
    fetchExpenses();
  }, [user_id]);

  // Determine which months to show in the dropdown based on selected year
  const displayedMonths = selectedYear === currentYear
    ? monthsShort.slice(0, currentMonthIdx + 1) // Only up to current month (Jan - Jul)
    : monthsShort; // All 12 months for previous years

  // Safely reset selected month if it's no longer present in the updated months list
  useEffect(() => {
    if (selectedMonth !== "All" && !displayedMonths.includes(selectedMonth)) {
      setSelectedMonth("All");
      localStorage.setItem("globalSelectedMonth", "All");
    }
  }, [selectedYear, displayedMonths]);

  const fetchAnalytics = async () => {
    if (!user_id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/expenses/analytics?user_id=${user_id}&month=${selectedMonth}&year=${selectedYear}`
      );
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics from Python server:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      if (!user_id) return;
      // Sum all linked accounts to get total balance
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/banks/accounts?user_id=${user_id}`);
      if (response.ok) {
        const accounts = await response.json();
        const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
        setWalletBalance(total);
      }
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
  }, [user_id]);

  const fetchExpenses = async () => {
    if (!user_id) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses?user_id=${user_id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Extract years that have database records
        const txYears = data.map((tx) => {
          if (!tx.date) return null;
          const d = new Date(tx.date);
          return d.getFullYear().toString();
        }).filter(Boolean);

        // Dynamic list of unique years in descending order
        const uniqueYears = Array.from(new Set(["2026", ...txYears])).sort((a, b) => b - a);
        setAvailableYears(uniqueYears);
      }
    } catch (err) {
      console.error("Failed to fetch transaction lists:", err);
    }
  };

  // Real total spend from Python analytics.py
  const totalSpendFormatted = `₱${parseFloat(analyticsData.total_spend || 0).toLocaleString("en-US", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;

  // Real averages from Python analytics.py
  const weeklyAveFormatted = `₱${parseFloat(analyticsData.weekly_average || 0).toLocaleString("en-US", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;

  const dailyAveFormatted = `₱${parseFloat(analyticsData.daily_average || 0).toLocaleString("en-US", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
  
  const highestCategory = analyticsData.highest_category?.name || "None";
  const highestPercent = analyticsData.highest_category?.percentage || 0;

  // ML Budget Health Processing
  const mlHealth = analyticsData.weekly_budget_health || {
    baseline_budget: 0,
    current_spend: 0,
    predicted_spend: 0,
    status: "On Track"
  };

  const mlBudgetLeft = Math.max(0, mlHealth.baseline_budget - mlHealth.current_spend);
  const mlBudgetProgress = mlHealth.baseline_budget > 0 
    ? Math.min((mlHealth.current_spend / mlHealth.baseline_budget) * 100, 100) 
    : 0;

  let mlHealthColor = "#00E676"; // On Track
  let mlHealthText = "Stamina remaining";
  if (mlHealth.status === "At Risk") {
    mlHealthColor = "#FFEB3B";
    mlHealthText = "Approaching limits";
  }
  if (mlHealth.status === "Over Budget") {
    mlHealthColor = "#FF5252";
    mlHealthText = "Projected to overspend";
  }



  // ML Monthly Forecast Processing
  const monthlyForecast = analyticsData.monthly_forecast || { history: [], forecast: [] };
  const historyData = monthlyForecast.history || [];
  const forecastData = monthlyForecast.forecast || [];
  
  let chartMaxY = 12000;
  let chartDays = 30;
  
  if (historyData.length > 0 || forecastData.length > 0) {
    const allSpends = [...historyData, ...forecastData].map(d => d.spend || 0);
    const maxSpend = Math.max(...allSpends, 0);
    chartMaxY = Math.ceil(maxSpend / 1000) * 1000;
    if (chartMaxY === 0) chartMaxY = 12000;
    
    const allDays = [...historyData, ...forecastData].map(d => d.day || 1);
    chartDays = Math.max(...allDays, 30);
  }
  
  const yLabels = [chartMaxY, chartMaxY * 0.75, chartMaxY * 0.50, chartMaxY * 0.25, 0]
    .map(val => val >= 1000 ? `₱${(val/1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `₱${val}`);

  const getChartX = (day) => (day / chartDays) * 300;
  const getChartY = (spend) => 120 - ((spend / chartMaxY) * 120);

  const generateChartPath = (data) => {
    if (!data || data.length === 0) return "";
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getChartX(d.day)} ${getChartY(d.spend)}`).join(" ");
  };

  const historyPath = generateChartPath(historyData);
  const forecastPath = generateChartPath(historyData.length > 0 && forecastData.length > 0 
    ? [historyData[historyData.length - 1], ...forecastData] 
    : forecastData);

  const breakdownList = (() => {
    const rawBreakdown = analyticsData.spending_breakdown || {};
    const categories = Object.keys(rawBreakdown);
    
    let totalBreakdownSpend = 0;
    categories.forEach((cat) => {
      totalBreakdownSpend += parseFloat(rawBreakdown[cat]) || 0;
    });

    const colors = ["#00d8f6", "#7928CA", "#00E676", "#FF007A", "#FF9800", "#E91E63", "#9C27B0", "#00E5FF", "#4CAF50", "#FFEB3B"];
    
    let currentOffset = 0;
    let runningExact = 0;
    let runningRounded = 0;

    // Sort categories by amount descending so largest slices are first
    categories.sort((a, b) => (parseFloat(rawBreakdown[b]) || 0) - (parseFloat(rawBreakdown[a]) || 0));

    return categories.map((cat, index) => {
      const amount = parseFloat(rawBreakdown[cat]) || 0;
      let percent = 0;
      if (totalBreakdownSpend > 0) {
        runningExact += (amount / totalBreakdownSpend) * 10000;
        const targetRounded = Math.round(runningExact);
        percent = (targetRounded - runningRounded) / 100;
        runningRounded = targetRounded;
      }

      const item = {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        percent,
        amount,
        offset: 100 - currentOffset,
        color: colors[index % colors.length]
      };
      currentOffset += percent;
      return item;
    });
  })();

  const formatCurrencySimple = (val) => {
    return `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Determine if we should show Daily or Monthly trends
  const isDaily = selectedMonth !== "All";
  const trendDataRaw = isDaily ? (analyticsData.daily_trends || {}) : (analyticsData.monthly_trends || {});
  
  let trendData = [];
  if (isDaily) {
    trendData = Object.keys(trendDataRaw)
      .map(key => ({
        keyName: key,
        label: key.split('-')[2], // Extract "DD" from "YYYY-MM-DD"
        spend: parseFloat(trendDataRaw[key]) || 0,
        sortKey: key
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  } else {
    const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    trendData = Object.keys(trendDataRaw)
      .map(key => ({
        keyName: key,
        label: key.substring(0, 3), // Extract "Jun" from "June"
        spend: parseFloat(trendDataRaw[key]) || 0,
        sortKey: monthNamesFull.indexOf(key)
      }))
      .filter(item => item.sortKey !== -1)
      .sort((a, b) => a.sortKey - b.sortKey);
  }

  // Fallback if not enough data points
  if (trendData.length === 0) {
    trendData = [
      { label: isDaily ? "1" : "Jun", spend: 0 },
      { label: isDaily ? "2" : "Jul", spend: 0 }
    ];
  } else if (trendData.length === 1) {
    // Duplicate the point to draw a flat line across the chart
    trendData.push({ ...trendData[0], label: "" });
  }

  // Calculate coordinates
  const maxTrendSpend = Math.max(...trendData.map(d => d.spend), 1000);
  
  // viewBox width is 300. X padding is 40.
  const paddingX = 40;
  const usableWidth = 300 - paddingX * 2;
  const stepX = trendData.length > 1 ? usableWidth / (trendData.length - 1) : usableWidth;

  trendData = trendData.map((d, i) => ({
    ...d,
    x: paddingX + i * stepX,
    y: 100 - (d.spend / maxTrendSpend) * 80
  }));

  // Construct SVG paths
  const trendLinePath = trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`).join(" ");
  const trendGradientPath = `${trendLinePath} L ${trendData[trendData.length - 1].x} 100 L ${trendData[0].x} 100 Z`;

  return (
    <div style={{ color: "var(--text-primary)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Title Header with Month & Year Selectors */}
      <div style={{ marginBottom: isMobile ? "24px" : "36px", display: "flex", flexDirection: isMobile ? "column" : "row", gap: "16px", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center" }}>
        <div style={{ textAlign: "left" }}>
          <h1 style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0" }}>
            Overview
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? "14px" : "16px", margin: 0 }}>
            Your financial insights at a glance.
          </p>
        </div>

        {/* Filters Container */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", width: isMobile ? "100%" : "auto" }}>
          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedYear(val);
              localStorage.setItem("globalSelectedYear", val);
            }}
            disabled={loading}
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "10px 16px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: "600",
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

          {/* Month Selector dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMonth(val);
              localStorage.setItem("globalSelectedMonth", val);
            }}
            disabled={loading}
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "10px 16px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: "600",
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
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        
        {/* Wallet Balance Card */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "16px 20px" : "28px 24px", position: "relative", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>Wallet Balance</span>
              </div>
            </div>
            <div style={{ fontSize: isMobile ? "24px" : "36px", fontWeight: "800", color: "var(--text-primary)" }}>
              {formatCurrencySimple(parseFloat(walletBalance))}
            </div>
          </div>

          <div style={{ position: "absolute", right: "24px", bottom: "24px", opacity: 0.15 }}>
            <svg width="60" height="40" viewBox="0 0 60 40" fill="none" stroke="#00E676" strokeWidth="2.5">
              <rect x="4" y="8" width="52" height="24" rx="4" />
              <circle cx="44" cy="20" r="4" />
            </svg>
          </div>
        </div>
        
        {/* Total Monthly Spend Card (Dynamic from Python analytics) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "16px 20px" : "28px 24px", position: "relative", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d8f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <span style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>Total Spend</span>
            </div>
            {loading && (
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Recalculating...</span>
            )}
          </div>
          <div style={{ fontSize: isMobile ? "24px" : "36px", fontWeight: "800", color: "var(--text-primary)" }}>
            {totalSpendFormatted}
          </div>
          {/* Subtle background pulse icon graphic */}
          <div style={{ position: "absolute", right: "24px", bottom: "24px", opacity: 0.15 }}>
            <svg width="60" height="40" viewBox="0 0 60 40" fill="none" stroke="#00d8f6" strokeWidth="2.5">
              <path d="M0 20 L20 20 L27 5 L37 35 L44 20 L60 20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Weekly Average Card (Dynamic from Python analytics) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "16px 20px" : "28px 24px", position: "relative", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>Weekly Average</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: isMobile ? "24px" : "36px", fontWeight: "800", color: "var(--text-primary)" }}>{weeklyAveFormatted}</span>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>/wk</span>
          </div>
          {/* Subtle calendar graphic */}
          <div style={{ position: "absolute", right: "24px", bottom: "24px", opacity: 0.15 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>

        {/* Daily Average Card (Dynamic from Python analytics) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "16px 20px" : "28px 24px", position: "relative", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3F51B5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>Daily Average</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: isMobile ? "24px" : "36px", fontWeight: "800", color: "var(--text-primary)" }}>{dailyAveFormatted}</span>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>/day</span>
          </div>
          {/* Trend arrow graphic */}
          <div style={{ position: "absolute", right: "24px", bottom: "24px", opacity: 0.15 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3F51B5" strokeWidth="2.5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>

        {/* Highest Category Card (Dynamic from Python analytics) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "16px 20px" : "28px 24px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>Highest Category</span>
          </div>
          <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={highestCategory}>
            {highestCategory}
          </div>
          {/* Progress bar container */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flexGrow: 1, height: "8px", backgroundColor: "var(--bg-card-inner)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${highestPercent}%`, height: "100%", backgroundColor: "#00d8f6", borderRadius: "4px" }}></div>
            </div>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "var(--text-secondary)" }}>{highestPercent}%</span>
          </div>
        </div>
      </div>

      {/* Weekly Budget Health Card */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", position: "relative", overflow: "hidden" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ backgroundColor: `${mlHealthColor}20`, borderRadius: "6px", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mlHealthColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                <line x1="22" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap" }}>Weekly Budget</h3>
                {/* AI Badge */}
                <div style={{ backgroundColor: 'rgba(0, 216, 246, 0.1)', color: '#00d8f6', padding: '2px 4px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                   <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                   AI
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", whiteSpace: "nowrap" }}>{mlHealthText}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", paddingLeft: "10px" }}>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "2px" }}>
              ₱{parseFloat(mlBudgetLeft).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              left of ₱{parseFloat(mlHealth.baseline_budget).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flexGrow: 1, height: "6px", backgroundColor: "var(--bg-card-inner)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: `${mlBudgetProgress}%`, height: "100%", backgroundColor: mlHealthColor, borderRadius: "3px", transition: "width 0.5s ease-out, background-color 0.5s ease-out" }}></div>
          </div>
        </div>
        
        <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "8px", textAlign: "right" }}>
           Projected: <strong style={{ color: "var(--text-primary)" }}>₱{parseFloat(mlHealth.predicted_spend).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
        </div>
      </div>

      {/* Charts Section Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        
        {/* Spending Breakdown Card (Mocked) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "20px" : "28px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 24px 0", textAlign: "left" }}>
            Spending Breakdown
          </h2>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: "20px", flexWrap: "wrap" }}>
            {/* SVG Donut Chart */}
            <div style={{ position: "relative", width: "160px", height: "160px" }}>
              <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                {/* Background circle */}
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--bg-card-inner)" strokeWidth="3" />
                {/* Dynamic Segments */}
                {breakdownList.map((item, idx) => (
                  <circle
                    key={idx}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="3"
                    strokeDasharray={`${item.percent} ${100 - item.percent}`}
                    strokeDashoffset={item.offset}
                  />
                ))}
              </svg>
              {/* Inner Label */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block" }}>Total</span>
                <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)" }}>{totalSpendFormatted}</span>
              </div>
            </div>

            {/* Color Legend */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px", textAlign: "left", width: "100%", marginTop: isMobile ? "12px" : "0" }}>
              {breakdownList.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }}></span>
                  <span style={{ fontSize: "11px", color: item.percent > 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: item.percent > 0 ? "bold" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name} ({item.percent === 0 && item.amount > 0 ? "<0.01" : item.percent.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Predictive Spending Forecast */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "20px" : "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <div style={{ backgroundColor: "rgba(121, 40, 202, 0.1)", borderRadius: "8px", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7928CA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: 0, textAlign: "left" }}>
              Predictive Spending Forecast
            </h2>
          </div>

          <div style={{ position: "relative", width: "100%", height: "240px", boxSizing: "border-box", paddingLeft: "40px", paddingBottom: "24px" }}>
            <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              {/* Grid Lines */}
              {[120, 90, 60, 30, 0].map((y, i) => (
                <line key={i} x1="0" y1={y} x2="300" y2={y} stroke="var(--bg-card-inner)" strokeWidth="1" strokeDasharray="4 4" />
              ))}
              
              {/* Solid Line (Past) */}
              {historyPath && <path d={historyPath} fill="none" stroke="#00d8f6" strokeWidth="2" />}
              
              {/* Dotted Line (Forecast) */}
              {forecastPath && <path d={forecastPath} fill="none" stroke="#7928CA" strokeWidth="2" strokeDasharray="4 4" />}

              {/* Data points for history */}
              {historyData.map((p, i) => (
                <circle key={`hist-${i}`} cx={getChartX(p.day)} cy={getChartY(p.spend)} r="2.5" fill="var(--bg-card)" stroke="#00d8f6" strokeWidth="2" />
              ))}
            </svg>

            {/* Y-axis labels */}
            <div style={{ position: "absolute", left: "0", top: "0", height: "calc(100% - 24px)", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "11px" }}>
              {yLabels.map((label, i) => (
                <span key={i} style={{ transform: "translateY(-50%)" }}>{label}</span>
              ))}
            </div>

            {/* X-axis labels */}
            <div style={{ position: "absolute", left: "40px", bottom: "0", width: "calc(100% - 40px)", display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "11px" }}>
              {[1, 5, 10, 15, 20, 25, chartDays].map((day, i) => (
                <span key={i} style={{ position: 'absolute', left: `${(day / chartDays) * 100}%`, transform: 'translateX(-50%)' }}>{day}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies Dedicated Grid Row */}
      {analyticsData.detected_anomalies && analyticsData.detected_anomalies.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          {/* Single unified container — same style as transactions list */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: isMobile ? "20px" : "28px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            
            {/* Header — same layout as transactions header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#FF9800", width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "bold", fontSize: "16px" }}>!</div>
                <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#FF9800", margin: 0 }}>Unusual Spikes Flagged</h2>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                We detected <strong>{analyticsData.detected_anomalies.length}</strong> unusually high transaction{analyticsData.detected_anomalies.length > 1 ? 's' : ''} based on your typical spending patterns.
              </p>
            </div>

            {/* Scrollable anomaly rows — same card style as mobile transaction rows */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              maxHeight: isMobile ? "calc(3 * 80px)" : "calc(5 * 80px)",
              overflowY: "auto",
            }}>
              {analyticsData.detected_anomalies.map((anomaly, idx) => {
                const catColors = (() => {
                  switch (anomaly.category) {
                    case "Food": return { color: "#00d8f6", bg: "rgba(0, 216, 246, 0.1)", dot: "#00d8f6" };
                    case "Transport": return { color: "#FF007A", bg: "rgba(255, 0, 122, 0.1)", dot: "#FF007A" };
                    case "Utilities": return { color: "#9F7AEA", bg: "rgba(121, 40, 202, 0.1)", dot: "#9F7AEA" };
                    case "Entertainment": return { color: "#00E676", bg: "rgba(0, 230, 118, 0.1)", dot: "#00E676" };
                    case "Savings": return { color: "#FFD700", bg: "rgba(255, 215, 0, 0.1)", dot: "#FFD700" };
                    default: {
                      let hash = 0;
                      for (let i = 0; i < anomaly.category.length; i++) hash = anomaly.category.charCodeAt(i) + ((hash << 5) - hash);
                      const hue = Math.abs(hash % 360);
                      const c = `hsl(${hue}, 85%, 60%)`;
                      return { color: c, bg: `hsla(${hue}, 85%, 60%, 0.12)`, dot: c };
                    }
                  }
                })();
                return (
                  <div key={idx} onClick={() => setSelectedAnomaly(anomaly)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-card-inner)"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)"}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{anomaly.date}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: catColors.bg, color: catColors.color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", width: "fit-content" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: catColors.dot }}></span>
                        {anomaly.category}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", letterSpacing: "0.5px" }}>
                        {formatCurrencySimple(anomaly.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Anomaly ReceiptPreview Style Modal */}
      {selectedAnomaly && (() => {
        const catColors = (() => {
          switch (selectedAnomaly.category) {
            case "Food": return { color: "#00d8f6", bg: "rgba(0, 216, 246, 0.1)", dot: "#00d8f6" };
            case "Transport": return { color: "#FF007A", bg: "rgba(255, 0, 122, 0.1)", dot: "#FF007A" };
            case "Utilities": return { color: "#9F7AEA", bg: "rgba(121, 40, 202, 0.1)", dot: "#9F7AEA" };
            case "Entertainment": return { color: "#00E676", bg: "rgba(0, 230, 118, 0.1)", dot: "#00E676" };
            case "Savings": return { color: "#FFD700", bg: "rgba(255, 215, 0, 0.1)", dot: "#FFD700" };
            default: {
              let hash = 0;
              for (let i = 0; i < selectedAnomaly.category.length; i++) hash = selectedAnomaly.category.charCodeAt(i) + ((hash << 5) - hash);
              const hue = Math.abs(hash % 360);
              const c = `hsl(${hue}, 85%, 60%)`;
              return { color: c, bg: `hsla(${hue}, 85%, 60%, 0.12)`, dot: c };
            }
          }
        })();

        return (
          <div style={{
            position: "fixed",
            top: isMobile ? "57px" : 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ 
              display: "flex", 
              flexDirection: isMobile ? "column" : "row", 
              maxWidth: isMobile ? "300px" : "900px", 
              width: "90%", 
              maxHeight: isMobile ? "70vh" : "90vh", 
              backgroundColor: "var(--bg-card)", 
              borderRadius: "16px", 
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)"
            }}>
              <button onClick={() => { setSelectedAnomaly(null); setPhotoFullscreen(false); }} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              
              <div 
                style={{ flex: 1, backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", maxHeight: isMobile ? "25vh" : "none", minHeight: isMobile ? "120px" : "auto", cursor: (isMobile && selectedAnomaly.receipt_url) ? "zoom-in" : "default" }}
                onClick={() => { if (isMobile && selectedAnomaly.receipt_url) setPhotoFullscreen(true); }}
              >
                {selectedAnomaly.receipt_url ? (
                  <img src={selectedAnomaly.receipt_url.startsWith('http') ? selectedAnomaly.receipt_url : `${import.meta.env.VITE_API_URL}${selectedAnomaly.receipt_url}`} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: isMobile ? "8px" : "0" }} />
                ) : (
                  <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No receipt image</div>
                )}
              </div>
              
              <div style={{ width: isMobile ? "100%" : "350px", padding: isMobile ? "16px" : "32px", display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "24px", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: isMobile ? "16px" : "20px" }}>Transaction Details</h3>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "10px" : "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: isMobile ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>MERCHANT</div>
                      <div style={{ fontSize: isMobile ? "13px" : "16px", color: "var(--text-primary)", fontWeight: "500" }}>{selectedAnomaly.merchant || "Unknown"}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: isMobile ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>DATE</div>
                      <div style={{ fontSize: isMobile ? "13px" : "16px", color: "var(--text-primary)", fontWeight: "500" }}>{new Date(selectedAnomaly.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: isMobile ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>CATEGORY</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: catColors.bg, color: catColors.color, padding: isMobile ? "2px 8px" : "4px 10px", borderRadius: "12px", fontSize: isMobile ? "10px" : "12px", fontWeight: "bold" }}>
                        <span style={{ width: isMobile ? "4px" : "6px", height: isMobile ? "4px" : "6px", borderRadius: "50%", backgroundColor: catColors.dot }}></span>
                        {selectedAnomaly.category}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: isMobile ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>AMOUNT</div>
                      <div style={{ fontSize: isMobile ? "14px" : "18px", color: "#00d8f6", fontWeight: "800" }}>{formatCurrencySimple(selectedAnomaly.amount)}</div>
                    </div>
                  </div>
                  
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: isMobile ? "10px" : "16px" }}>
                    <div style={{ fontSize: isMobile ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>NOTE</div>
                    <div style={{ fontSize: isMobile ? "12px" : "14px", color: "var(--text-primary)", lineHeight: "1.4" }}>{selectedAnomaly.notes || "No notes attached."}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Fullscreen Photo Viewer (Mobile Only) */}
            {isMobile && photoFullscreen && selectedAnomaly.receipt_url && (
              <div 
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000", zIndex: 3500, display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px" }}>
                  <button onClick={() => setPhotoFullscreen(false)} style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", border: "none", color: "#fff", padding: "8px", cursor: "pointer" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
                  <img src={selectedAnomaly.receipt_url.startsWith('http') ? selectedAnomaly.receipt_url : `${import.meta.env.VITE_API_URL}${selectedAnomaly.receipt_url}`} alt="Receipt Fullscreen" style={{ width: "100%", objectFit: "contain" }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}

export default DashboardView;
