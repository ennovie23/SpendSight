import React, { useState } from 'react';

const banksList = [
  { id: 'cash', name: 'Cash on Hand', type: 'Physical Cash', color: '#85bb65', logo: '💵' },
  { id: 'bdo', name: 'BDO Unibank', type: 'Checking', color: '#002C77', logo: '🏦' },
  { id: 'bpi', name: 'BPI', type: 'Savings', color: '#B01F24', logo: '💳' },
  { id: 'unionbank', name: 'UnionBank', type: 'Savings', color: '#F47920', logo: '🏛️' },
  { id: 'gcash', name: 'GCash', type: 'E-Wallet', color: '#005CEE', logo: '📱' },
  { id: 'maya', name: 'Maya', type: 'E-Wallet', color: '#00C853', logo: '💸' },
  { id: 'gotyme', name: 'GoTyme Bank', type: 'Savings', color: '#0055FF', logo: '🔵' }
];

export default function BankLinkModal({ isOpen, onClose, onLinkSuccess, user_id }) {
  const [step, setStep] = useState(1); // 1: Select Bank, 2: Enter Initial Balance, 3: Loading
  const [selectedBank, setSelectedBank] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSelectBank = (bank) => {
    setSelectedBank(bank);
    setStep(2);
    setError(null);
  };

  const handleLinkBank = async (e) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError('Please enter a valid balance');
      return;
    }

    setLoading(true);
    setStep(3);

    // Simulate connecting to the bank API
    await new Promise(r => setTimeout(r, 1500));

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
    
    try {
      const res = await fetch(`${API_URL}/api/banks/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bank_name: selectedBank.name,
          account_type: selectedBank.type,
          balance: numericAmount,
          user_id: user_id
        })
      });

      if (res.ok) {
        onLinkSuccess();
        setTimeout(() => {
          handleClose();
        }, 500);
      } else {
        throw new Error('Failed to link bank account');
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
      setStep(2);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedBank(null);
    setAmount('');
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      zIndex: 1000,
      padding: '24px',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        margin: 'auto'
      }}>
        <button onClick={handleClose} style={{
          position: 'absolute', top: '24px', right: '24px',
          background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px', zIndex: 10
        }}>✕</button>

        {step === 1 && (
          <>
            <div style={{ padding: '32px 32px 16px 32px', flexShrink: 0 }}>
              <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '24px' }}>Select Bank</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>Connect securely via Open Banking</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              padding: '0 32px 32px 32px',
              overflowY: 'auto'
            }}>
              {banksList.map(bank => (
                <div 
                  key={bank.id}
                  onClick={() => handleSelectBank(bank)}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = bank.color;
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', backgroundColor: bank.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {bank.logo}
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{bank.name}</span>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              End-to-End Encrypted via SpendSight Connect
            </div>
          </>
        )}

        {step === 2 && selectedBank && (
          <div style={{ padding: '32px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => setStep(1)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px' }}>{selectedBank.name}</h2>
            </div>

            <form onSubmit={handleLinkBank} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Current Balance (₱)</label>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  min="0"
                  step="1"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '18px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {error && <div style={{ color: '#FF5252', fontSize: '14px' }}>{error}</div>}

              <button 
                type="submit"
                style={{
                  width: '100%', padding: '16px', backgroundColor: '#00d8f6', color: '#080B11',
                  border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Connect Account
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', border: '4px solid rgba(0, 216, 246, 0.2)',
              borderTopColor: '#00d8f6', animation: 'spin 1s linear infinite', marginBottom: '24px'
            }} />
            <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Connecting to {selectedBank?.name}...</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Securing your connection</p>
            
            <style>
              {`
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255, 0); }
                }
              `}
            </style>
          </div>
        )}
      </div>
    </div>
  );
}
