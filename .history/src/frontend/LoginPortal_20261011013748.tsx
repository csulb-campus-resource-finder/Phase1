import React, { useState } from 'react';

interface LoginPortalProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('nadhirah.@student.csulb.edu');
  const [name, setName] = useState('Nadhirah Michael-Ho');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSSOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side domain validation check
    if (!email.endsWith('@student.csulb.edu')) {
      setError('Access restricted to valid @student.csulb.edu accounts.');
      setLoading(false);
      return;
    }

    try {
      // Fixed endpoint from /sso-login to /sso to match server.ts
      const response = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'SSO authentication failed.');
      }

      // Store JWT token and user info in localStorage
      localStorage.setItem('sso_token', data.token);
      localStorage.setItem('sso_user', JSON.stringify(data.user));

      // Pass token and user up to App component
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh', 
      fontFamily: 'Arial, sans-serif',
      background: '#f3f4f6'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '35px', 
        background: '#ffffff', 
        borderRadius: '12px', 
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Header / Branding */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ 
            display: 'inline-block', 
            background: '#e0e7ff', 
            color: '#4f46e5', 
            padding: '10px 14px', 
            borderRadius: '50%', 
            fontSize: '20px',
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            CS
          </div>
          <h2 style={{ margin: '0 0 6px', color: '#1f2937', fontSize: '22px' }}>CSULB SSO Portal</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Campus Resource Finder Authentication</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#b91c1c', 
            padding: '12px', 
            borderRadius: '6px', 
            fontSize: '13px', 
            marginBottom: '20px',
            border: '1px solid #f87171'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSSOLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>
              Student Full Name
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px', 
                fontSize: '14px', 
                boxSizing: 'border-box',
                outline: 'none'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '6px' }}>
              CSULB Student Email
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@student.csulb.edu"
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px', 
                fontSize: '14px', 
                boxSizing: 'border-box',
                outline: 'none'
              }}
              required
            />
            <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', display: 'block' }}>
              Must end with @student.csulb.edu
            </span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '8px',
              padding: '12px', 
              background: '#4f46e5', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '15px', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In with CSULB SSO'}
          </button>
        </form>
      </div>
    </div>
  );
};