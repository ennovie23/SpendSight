import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('Connecting to backend engine...');

  useEffect(() => {
    // Fetching data from our backend port
    fetch('http://localhost:5001/')
      .then((res) => res.text())
      .then((data) => setMessage(data))
      .catch((err) => {
        console.error(err);
        setMessage('Failed to connect to backend engine.');
      });
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px' }}>
      <h1 style={{ color: '#1a73e8' }}>Finly Workspace</h1>
      <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>Frontend Status: Active Layer</p>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        backgroundColor: '#f1f3f4', 
        borderRadius: '8px',
        borderLeft: '5px solid #34a853'
      }}>
        <strong style={{ display: 'block', marginBottom: '5px' }}>Backend Response:</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}

export default App;