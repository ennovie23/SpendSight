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
  const [selectedCategory, setSelectedCategory] = useState(() => localStorage.getItem("photosSelectedCategory") || "All");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      padding: isMobile ? "24px 16px 64px" : "0 16px 64px"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "28px", fontWeight: "700" }}>Receipt Photos</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>View and manage your scanned receipts</p>
        </div>
        
        {/* Category Filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", backgroundColor: "var(--bg-card)", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--border-color)", width: isMobile ? "100%" : "auto" }}>
          <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Filter:</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCategory(val);
              localStorage.setItem("photosSelectedCategory", val);
            }}
            style={{ backgroundColor: "transparent", border: "none", color: "var(--text-primary)", fontSize: "15px", fontWeight: "600", outline: "none", cursor: "pointer", textAlign: "right", paddingRight: "4px" }}
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
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(280px, 1fr))", 
          gap: isMobile ? "10px" : "24px" 
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
              <div style={{ width: "100%", height: isMobile ? "100px" : "200px", backgroundColor: "#000", position: "relative" }}>
                <img 
                  src={photo.receipt_url.startsWith('http') ? photo.receipt_url : `${import.meta.env.VITE_API_URL}${photo.receipt_url}`} 
                  alt="Receipt" 
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} 
                />
                {isMobile && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))", display: "flex", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#00d8f6" }}>
                      ₱{parseFloat(photo.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
              {!isMobile && (
              <div style={{ padding: isMobile ? "8px" : "16px", display: "flex", flexDirection: "column", gap: isMobile ? "6px" : "12px" }}>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-start", gap: isMobile ? "2px" : "0" }}>
                  <div style={{ width: "100%" }}>
                    <h3 style={{ margin: "0 0 2px 0", fontSize: isMobile ? "12px" : "16px", color: "var(--text-primary)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {photo.merchant || "Unknown"}
                    </h3>
                    <p style={{ margin: 0, fontSize: isMobile ? "10px" : "13px", color: "var(--text-secondary)" }}>
                      {new Date(photo.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ fontSize: isMobile ? "12px" : "16px", fontWeight: "700", color: "#00d8f6" }}>
                    ₱{parseFloat(photo.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: isMobile ? "2px" : "0" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: getCategoryStyles(photo.category).bg,
                    color: getCategoryStyles(photo.category).color,
                    padding: isMobile ? "2px 4px" : "4px 8px",
                    borderRadius: "12px",
                    fontSize: isMobile ? "9px" : "11px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: isMobile ? "80px" : "none"
                  }}>
                    <span style={{ width: isMobile ? "4px" : "6px", height: isMobile ? "4px" : "6px", borderRadius: "50%", backgroundColor: getCategoryStyles(photo.category).dot, flexShrink: 0 }}></span>
                    {photo.category}
                  </span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleShare(photo); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
                    title="Share"
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
                  >
                    <div style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                      <svg width={isMobile ? "12" : "16"} height={isMobile ? "12" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </div>
                  </button>
                </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full-screen interaction blocker - prevents clicking anything behind modals */}
      {selectedPhoto && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1999,
          pointerEvents: "all",
        }} />
      )}

      {/* Fullscreen Photo Viewer */}
      {selectedPhoto && photoFullscreen && (
        <div
          onClick={() => setPhotoFullscreen(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "#000",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setPhotoFullscreen(false)}
            style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", padding: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <img
            src={selectedPhoto.receipt_url.startsWith('http') ? selectedPhoto.receipt_url : `${import.meta.env.VITE_API_URL}${selectedPhoto.receipt_url}`}
            alt="Receipt"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
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
          zIndex: 2000,
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ 
            display: "flex", 
            flexDirection: window.innerWidth <= 768 ? "column" : "row", 
            maxWidth: window.innerWidth <= 768 ? "300px" : "900px", 
            width: "90%", 
            maxHeight: window.innerWidth <= 768 ? "70vh" : "90vh", 
            backgroundColor: "var(--bg-card)", 
            borderRadius: "16px", 
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)"
          }}>
            <button onClick={() => { setSelectedPhoto(null); setPhotoFullscreen(false); }} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div 
              style={{ flex: 1, backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", maxHeight: window.innerWidth <= 768 ? "25vh" : "none", minHeight: window.innerWidth <= 768 ? "120px" : "auto", cursor: isMobile ? "zoom-in" : "default" }}
              onClick={() => { if (isMobile) setPhotoFullscreen(true); }}
            >
              <img src={selectedPhoto.receipt_url.startsWith('http') ? selectedPhoto.receipt_url : `${import.meta.env.VITE_API_URL}${selectedPhoto.receipt_url}`} alt="Receipt" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: window.innerWidth <= 768 ? "8px" : "0" }} />
            </div>
            <div style={{ width: window.innerWidth <= 768 ? "100%" : "350px", padding: window.innerWidth <= 768 ? "16px" : "32px", display: "flex", flexDirection: "column", gap: window.innerWidth <= 768 ? "12px" : "24px", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: window.innerWidth <= 768 ? "16px" : "20px" }}>Transaction Details</h3>
                <button onClick={() => handleShare(selectedPhoto)} style={{ background: "rgba(0, 216, 246, 0.1)", border: "none", color: "#00d8f6", padding: window.innerWidth <= 768 ? "6px 10px" : "8px 12px", borderRadius: "8px", cursor: "pointer", fontSize: window.innerWidth <= 768 ? "12px" : "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: window.innerWidth <= 768 ? "10px" : "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>MERCHANT</div>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "13px" : "16px", color: "var(--text-primary)", fontWeight: "500" }}>{selectedPhoto.merchant || "Unknown"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>DATE</div>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "13px" : "16px", color: "var(--text-primary)", fontWeight: "500" }}>{new Date(selectedPhoto.date).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>CATEGORY</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: getCategoryStyles(selectedPhoto.category).bg, color: getCategoryStyles(selectedPhoto.category).color, padding: window.innerWidth <= 768 ? "2px 8px" : "4px 10px", borderRadius: "12px", fontSize: window.innerWidth <= 768 ? "10px" : "12px", fontWeight: "bold" }}>
                      <span style={{ width: window.innerWidth <= 768 ? "4px" : "6px", height: window.innerWidth <= 768 ? "4px" : "6px", borderRadius: "50%", backgroundColor: getCategoryStyles(selectedPhoto.category).dot }}></span>
                      {selectedPhoto.category}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>AMOUNT</div>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "18px" : "24px", color: "#00d8f6", fontWeight: "700" }}>₱{parseFloat(selectedPhoto.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
                
                {selectedPhoto.description && selectedPhoto.description !== selectedPhoto.merchant && (
                  <div>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "10px" : "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>NOTE</div>
                    <div style={{ fontSize: window.innerWidth <= 768 ? "12px" : "14px", color: "var(--text-primary)", lineHeight: "1.4" }}>{selectedPhoto.description}</div>
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
