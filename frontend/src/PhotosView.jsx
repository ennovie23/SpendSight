import React, { useState, useEffect } from "react";

const getCategoryStyles = (cat) => {
  switch (cat) {
    case "Food": return { bg: "rgba(255, 107, 107, 0.1)", color: "#ff6b6b", dot: "#ff6b6b" };
    case "Transport": return { bg: "rgba(78, 205, 196, 0.1)", color: "#4ecdc4", dot: "#4ecdc4" };
    case "Utilities": return { bg: "rgba(255, 209, 102, 0.1)", color: "#ffd166", dot: "#ffd166" };
    case "Entertainment": return { bg: "rgba(160, 104, 206, 0.1)", color: "#a068ce", dot: "#a068ce" };
    case "Shopping": return { bg: "rgba(255, 159, 28, 0.1)", color: "#ff9f1c", dot: "#ff9f1c" };
    case "Healthcare": return { bg: "rgba(239, 71, 111, 0.1)", color: "#ef476f", dot: "#ef476f" };
    default: return { bg: "rgba(255, 255, 255, 0.1)", color: "#a0a0a0", dot: "#a0a0a0" };
  }
};

function PhotosView({ user_id }) {
  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user_id) fetchPhotos();
  }, [user_id]);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredPhotos(photos);
    } else {
      setFilteredPhotos(photos.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, photos]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/expenses?user_id=${user_id}`);
      if (response.ok) {
        const data = await response.json();
        // filter only transactions with receipts
        const withReceipts = data.filter(tx => tx.receipt_url);
        setPhotos(withReceipts);
      }
    } catch (err) {
      console.error("Error fetching photos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (photo) => {
    const imageUrl = photo.receipt_url.startsWith('http') ? photo.receipt_url : `${import.meta.env.VITE_API_URL}${photo.receipt_url}`;
    const shareData = {
      title: 'SpendSight Receipt',
      text: `Receipt for ${photo.merchant || photo.category} (₱${parseFloat(photo.amount).toFixed(2)})`,
      url: imageUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(imageUrl);
        alert("Image link copied to clipboard!");
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const categories = ["All", ...Array.from(new Set(photos.map(p => p.category)))];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "32px",
      maxWidth: "1200px",
      margin: "0 auto",
      width: "100%",
      padding: "0 16px 64px"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "28px", fontWeight: "700" }}>Receipt Photos</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>View and manage your scanned receipts</p>
        </div>
        
        {/* Category Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "var(--bg-card)", padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Filter:</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ backgroundColor: "transparent", border: "none", color: "var(--text-primary)", fontSize: "15px", fontWeight: "600", outline: "none", cursor: "pointer" }}
          >
            {categories.map(cat => <option key={cat} value={cat} style={{ backgroundColor: "var(--bg-card)" }}>{cat}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "64px", color: "var(--text-secondary)" }}>Loading photos...</div>
      ) : filteredPhotos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px", color: "var(--text-secondary)", backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
          No receipts found. Upload one via the Snap & Log AI!
        </div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
          gap: "24px" 
        }}>
          {filteredPhotos.map((photo) => (
            <div 
              key={photo.id}
              style={{
                backgroundColor: "var(--bg-card)",
                borderRadius: "16px",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
              }}
              onClick={() => setSelectedPhoto(photo)}
            >
              <div style={{ width: "100%", height: "200px", backgroundColor: "#000" }}>
                <img 
                  src={photo.receipt_url.startsWith('http') ? photo.receipt_url : `${import.meta.env.VITE_API_URL}${photo.receipt_url}`} 
                  alt="Receipt" 
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} 
                />
              </div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "var(--text-primary)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
                      {photo.merchant || "Unknown Merchant"}
                    </h3>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                      {new Date(photo.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "#00d8f6" }}>
                    ₱{parseFloat(photo.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: getCategoryStyles(photo.category).bg,
                    color: getCategoryStyles(photo.category).color,
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "bold"
                  }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: getCategoryStyles(photo.category).dot }}></span>
                    {photo.category}
                  </span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleShare(photo); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
                    title="Share"
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
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
            <button onClick={() => setSelectedPhoto(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "8px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: window.innerWidth <= 768 ? "column" : "row", maxWidth: "900px", width: "90%", maxHeight: "90vh", backgroundColor: "var(--bg-card)", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ flex: 1, backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={selectedPhoto.receipt_url.startsWith('http') ? selectedPhoto.receipt_url : `${import.meta.env.VITE_API_URL}${selectedPhoto.receipt_url}`} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ width: window.innerWidth <= 768 ? "100%" : "350px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "20px" }}>Transaction Details</h3>
                <button onClick={() => handleShare(selectedPhoto)} style={{ background: "rgba(0, 216, 246, 0.1)", border: "none", color: "#00d8f6", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>MERCHANT</div>
                  <div style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "500" }}>{selectedPhoto.merchant || "Unknown"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>DATE</div>
                  <div style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "500" }}>{new Date(selectedPhoto.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>CATEGORY</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: getCategoryStyles(selectedPhoto.category).bg, color: getCategoryStyles(selectedPhoto.category).color, padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: getCategoryStyles(selectedPhoto.category).dot }}></span>
                    {selectedPhoto.category}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>AMOUNT</div>
                  <div style={{ fontSize: "24px", color: "#00d8f6", fontWeight: "700" }}>₱{parseFloat(selectedPhoto.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                {selectedPhoto.description && selectedPhoto.description !== selectedPhoto.merchant && (
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>NOTE</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: "1.5" }}>{selectedPhoto.description}</div>
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

export default PhotosView;
