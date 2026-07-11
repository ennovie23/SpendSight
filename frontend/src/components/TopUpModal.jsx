import { useState } from 'react';

export default function TopUpModal({ isOpen, onClose, onTopUpSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      setError('Minimum top-up amount is ₱100');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: numericAmount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Top-up request failed');
      }

      // Redirect to PayMongo Checkout URL
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error('Top-up Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      zIndex: 3000,
      backdropFilter: 'blur(5px)',
      padding: '24px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      zIndex: 3000,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        padding: '32px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        position: 'relative',
        margin: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '8px'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h2 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '24px', fontSize: '24px' }}>Top Up Wallet</h2>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
          Top up your SpendSight wallet securely via PayMongo. You can choose to pay using GCash, Maya, QRPh, or any supported Bank/Card on the next screen.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Amount (₱)</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              min="100"
              step="1"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && <div style={{ color: '#FF5252', fontSize: '14px' }}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !amount}
            style={{
              padding: '14px',
              backgroundColor: '#00d8f6',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: (loading || !amount) ? 'not-allowed' : 'pointer',
              opacity: (loading || !amount) ? 0.7 : 1,
              marginTop: '8px'
            }}
          >
            {loading ? 'Processing...' : `Top Up ₱${amount || '0'}`}
          </button>

        </form>
      </div>
    </div>
  );
}
