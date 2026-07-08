import { useState, useEffect } from "react";

function DashboardView({ email, user_id }) {
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const currentYear = new Date().getFullYear().toString(); // "2026"
  const currentMonthIdx = new Date().getMonth(); // 6 (July)
  const currentMonthName = monthsShort[currentMonthIdx]; // "Jul"

  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [analyticsData, setAnalyticsData] = useState({ total_spend: 0 });
  const [loading, setLoading] = useState(false);
  const [availableYears, setAvailableYears] = useState(["2026"]);

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
    }
  }, [selectedYear, displayedMonths]);

  const fetchAnalytics = async () => {
    if (!user_id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5001/api/expenses/analytics?user_id=${user_id}&month=${selectedMonth}&year=${selectedYear}`
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

  const fetchExpenses = async () => {
    if (!user_id) return;
    try {
      const response = await fetch(`http://localhost:5001/api/expenses?user_id=${user_id}`);
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

  const breakdownList = (() => {
    const rawBreakdown = analyticsData.spending_breakdown || {};
    const categories = Object.keys(rawBreakdown);
    
    let totalBreakdownSpend = 0;
    categories.forEach((cat) => {
      totalBreakdownSpend += parseFloat(rawBreakdown[cat]) || 0;
    });

    const colors = ["#00d8f6", "#7928CA", "#00E676", "#FF007A", "#FF9800", "#E91E63", "#9C27B0", "#00E5FF", "#4CAF50", "#FFEB3B"];
    
    let currentOffset = 0;
    return categories.map((cat, index) => {
      const amount = parseFloat(rawBreakdown[cat]) || 0;
      const percent = totalBreakdownSpend > 0 ? Math.round((amount / totalBreakdownSpend) * 100) : 0;
      const item = {
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        percent,
        offset: 100 - currentOffset,
        color: colors[index % colors.length]
      };
      currentOffset += percent;
      return item;
    });
  })();

  const formatCurrencySimple = (val) => {
    if (val >= 1000) {
      return `₱${(val / 1000).toFixed(1)}k`;
    }
    return `₱${val}`;
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
      <div style={{ marginBottom: "36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "left" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0" }}>
            Overview
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", margin: 0 }}>
            Your financial insights at a glance.
          </p>
        </div>

        {/* Filters Container */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
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
            onChange={(e) => setSelectedMonth(e.target.value)}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        
        {/* Total Monthly Spend Card (Dynamic from Python analytics) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px 24px", position: "relative", textAlign: "left" }}>
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
          <div style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)" }}>
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
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px 24px", position: "relative", textAlign: "left" }}>
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
            <span style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)" }}>{weeklyAveFormatted}</span>
            <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>/wk</span>
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
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px 24px", position: "relative", textAlign: "left" }}>
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
            <span style={{ fontSize: "36px", fontWeight: "800", color: "var(--text-primary)" }}>{dailyAveFormatted}</span>
            <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>/day</span>
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
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px 24px", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ color: "var(--text-secondary)", fontSize: "15px", fontWeight: "600" }}>Highest Category</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={highestCategory}>
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

      {/* Charts Section Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
        
        {/* Spending Breakdown Card (Mocked) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", textAlign: "left" }}>
              {breakdownList.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.color }}></span>
                  <span style={{ fontSize: "14px", color: item.percent > 0 ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: item.percent > 0 ? "bold" : "normal" }}>
                    {item.name} ({item.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Spend Trends Line Chart (Mocked) */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "28px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 10px 0", textAlign: "left" }}>
            {isDaily ? "Daily Spend Trends" : "Monthly Spend Trends"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 28px 0", textAlign: "left" }}>
            {isDaily ? `Overview of daily spending for ${selectedMonth}.` : "Overview of total spending across months."}
          </p>

          <div style={{ position: "relative", width: "100%", height: "140px", boxSizing: "border-box" }}>
            {/* SVG Line Chart */}
            <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="100" x2="300" y2="100" stroke="var(--bg-card-inner)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="var(--bg-card-inner)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="20" x2="300" y2="20" stroke="var(--bg-card-inner)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Gradient beneath the line */}
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d8f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00d8f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={trendGradientPath} fill="url(#lineGrad)" />

              {/* Main Line */}
              <path d={trendLinePath} fill="none" stroke="#00d8f6" strokeWidth="3" />

              {/* Line nodes */}
              {trendData.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="4" fill="var(--bg-card)" stroke="#00d8f6" strokeWidth="2.5" />
              ))}
            </svg>

            {/* Labels and values overlay */}
            {trendData.map((d, i) => {
              // Hide some labels if there are too many data points (e.g. daily data) to avoid overlapping
              const showLabel = trendData.length <= 15 || i % Math.ceil(trendData.length / 8) === 0 || i === trendData.length - 1;
              return (
                <div key={i} style={{ display: showLabel ? "block" : "none" }}>
                  <div style={{ position: "absolute", left: `${(d.x / 300) * 100}%`, top: `${(d.y / 120) * 100}%`, transform: "translate(-50%, -150%)", color: "#00d8f6", fontSize: "12px", fontWeight: "bold" }}>
                    {formatCurrencySimple(d.spend)}
                  </div>
                  <div style={{ position: "absolute", left: `${(d.x / 300) * 100}%`, bottom: "-15px", transform: "translateX(-50%)", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600" }}>
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Anomalies Dedicated Grid Row */}
      {analyticsData.detected_anomalies && analyticsData.detected_anomalies.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginTop: "24px" }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(255, 152, 0, 0.3)", borderRadius: "16px", padding: "28px", display: "flex", alignItems: "flex-start", gap: "20px", textAlign: "left" }}>
            <div style={{ backgroundColor: "rgba(255, 152, 0, 0.1)", color: "#FF9800", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: "bold", fontSize: "24px" }}>
              !
            </div>
            <div>
              <h2 style={{ margin: "0 0 10px 0", fontSize: "18px", color: "#FF9800", fontWeight: "700" }}>Unusual Spikes Flagged</h2>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                We detected <strong>{analyticsData.detected_anomalies.length}</strong> unusually high transaction{analyticsData.detected_anomalies.length > 1 ? 's' : ''} based on your typical spending patterns.
              </p>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {analyticsData.detected_anomalies.map((anomaly, idx) => (
                  <div key={idx} style={{ backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{anomaly.category}</span>
                    <span style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "bold" }}>{formatCurrencySimple(anomaly.amount)}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{anomaly.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DashboardView;
