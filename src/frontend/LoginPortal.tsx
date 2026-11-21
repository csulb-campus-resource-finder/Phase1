// Imports the React library and the useState hook for state management.
import React, { useState } from 'react';

// Imports the official CSULB logo image asset from the parent src folder
const logoImage = new URL('../logo.png', import.meta.url).href;

// Defines a TypeScript interface for the props accepted by the LoginPortal component.
interface LoginPortalProps {
  // Callback function triggered on successful login, passing the server response data (including MFA states).
  onLoginSuccess: (data: any) => void;
}

// Defines and exports the LoginPortal functional React component using TypeScript props.
export const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess }) => {
  // Toggles between SSO login and account registration view
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  // State hook for storing the chosen username during registration
  const [username, setUsername] = useState<string>('');
  // State hook for storing the student full name / display name input
  const [name, setName] = useState<string>('Nadhirah Michael-Ho');
  // State hook for storing the student email input
  const [email, setEmail] = useState<string>('nadhirah.michael-ho01@student.csulb.edu');
  // State hook for storing the password input
  const [password, setPassword] = useState<string>('');
  // State hook for role selection when registering a new account
  const [role, setRole] = useState<string>('Campus Seller');
  // State hook tracking whether a request is currently in progress (loading state).
  const [loading, setLoading] = useState<boolean>(false);
  // State hook for storing and displaying any authentication error or status messages.
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleToggleMode = () => {
    const nextMode = !isRegisterMode;
    setIsRegisterMode(nextMode);
    setError(null);
    setStatusMessage(null);
    if (nextMode) {
      setUsername('');
      setEmail('');
      setPassword('');
    } else {
      setEmail('nadhirah.michael-ho01@student.csulb.edu');
      setName('Nadhirah Michael-Ho');
      setPassword('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const chosenUsername = username.trim() || name.trim();

    if (!cleanEmail.endsWith('@student.csulb.edu')) {
      setError('Access restricted to valid @student.csulb.edu accounts.');
      setLoading(false);
      return;
    }

    if (!chosenUsername || !password) {
      setError('Please enter a username and password.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          username: chosenUsername,
          password,
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Account registration failed.');
      }

      setName(chosenUsername);
      setStatusMessage(`Account created for "${chosenUsername}"! Sign in now to view your dashboard.`);
      setIsRegisterMode(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Asynchronous handler function executed when the SSO login form is submitted.
  const handleSSOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail.endsWith('@student.csulb.edu')) {
      setError('Access restricted to valid @student.csulb.edu accounts.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: cleanName, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'SSO authentication failed.');
      }

      const tokenValue = data.token || data.accessToken;
      if (tokenValue) {
        localStorage.setItem('token', tokenValue);
        localStorage.setItem('sso_token', tokenValue);
      }

      onLoginSuccess({
        ...data,
        email: data.email || cleanEmail,
      });
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
      minHeight: '100vh', 
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#F8F9FA',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '440px', 
        background: '#ffffff', 
        borderRadius: '2rem', 
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E5E7EB'
      }}>
        {/* Top Hero Section */}
        <div style={{
          position: 'relative',
          height: '320px',
          backgroundImage: 'linear-gradient(to bottom, rgba(0, 43, 73, 0.35), rgba(0, 43, 73, 0.92)), url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '28px 24px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundImage: logoImage ? `url(${logoImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '2px solid #FFC72C',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px', color: '#ffffff' }}>CSULB</h2>
              <p style={{ margin: 0, fontSize: '11px', color: '#E5E7EB', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: '700' }}>CAMPUS RESOURCE FINDER</p>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '16px', height: '3px', backgroundColor: '#FFC72C', display: 'inline-block', borderRadius: '2px' }}></span>
              <span style={{
                color: '#FFC72C',
                fontSize: '11px',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '1.5px'
              }}>
                MADE FOR THE BEACH
              </span>
            </div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '34px', fontWeight: '900', lineHeight: '1.05', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Your campus.<br />
              <span style={{ color: '#ffffff' }}>Within reach.</span>
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#E5E7EB', fontWeight: '500' }}>
              Find your way. Find your people. Find your spot.
            </p>
          </div>
        </div>

        {/* Lower Content Body & Form Area */}
        <div style={{ padding: '28px 28px', backgroundColor: '#FAF9F6' }}>
          <h2 style={{ margin: '0 0 6px 0', color: '#111827', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            {isRegisterMode ? 'Create your account.' : 'One login. All of campus.'}
          </h2>
          <p style={{ margin: '0 0 20px 0', color: '#6B7280', fontSize: '13px', lineHeight: '1.4', fontWeight: '500' }}>
            {isRegisterMode
              ? 'Choose a username and register with your @student.csulb.edu email.'
              : 'Your shortcut to campus resources, student finds, and easier parking.'}
          </p>

          {statusMessage && (
            <div style={{
              background: '#DCFCE7',
              color: '#166534',
              padding: '12px 14px',
              borderRadius: '0.75rem',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid #86EFAC',
              fontWeight: '700'
            }}>
              ✅ {statusMessage}
            </div>
          )}

          {error && (
            <div style={{ 
              background: '#FEE2E2', 
              color: '#991B1B', 
              padding: '12px 14px', 
              borderRadius: '0.75rem', 
              fontSize: '13px', 
              marginBottom: '16px',
              border: '1px solid #FCA5A5',
              fontWeight: '700'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={isRegisterMode ? handleRegister : handleSSOLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegisterMode ? (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#002B49', marginBottom: '4px' }}>
                  Username
                </label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username (e.g., test)"
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    border: '1.5px solid #D1D5DB', 
                    borderRadius: '0.75rem', 
                    fontSize: '14px', 
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    fontWeight: '600',
                    color: '#1F2937'
                  }} 
                  required
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#002B49', marginBottom: '4px' }}>
                  Student Full Name
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{ 
                    width: '100%', 
                    padding: '12px 14px', 
                    border: '1.5px solid #D1D5DB', 
                    borderRadius: '0.75rem', 
                    fontSize: '14px', 
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    fontWeight: '600',
                    color: '#1F2937'
                  }} 
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#002B49', marginBottom: '4px' }}>
                CSULB Student Email
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@student.csulb.edu"
                style={{ 
                  width: '100%', 
                  padding: '12px 14px', 
                  border: '1.5px solid #D1D5DB', 
                  borderRadius: '0.75rem', 
                  fontSize: '14px', 
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontWeight: '600',
                  color: '#1F2937'
                }} 
                required
              />
              <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                Must end with @student.csulb.edu
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#002B49', marginBottom: '4px' }}>
                Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ 
                  width: '100%', 
                  padding: '12px 14px', 
                  border: '1.5px solid #D1D5DB', 
                  borderRadius: '0.75rem', 
                  fontSize: '14px', 
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontWeight: '600',
                  color: '#1F2937'
                }} 
                required
              />
            </div>

            {isRegisterMode && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#002B49', marginBottom: '4px' }}>
                  Account Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid #D1D5DB',
                    borderRadius: '0.75rem',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    fontWeight: '600',
                    color: '#1F2937'
                  }}
                >
                  <option value="Student Buyer">Student Buyer</option>
                  <option value="Campus Seller">Campus Seller</option>
                  <option value="student">Student</option>
                </select>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '6px', 
                padding: '14px', 
                background: '#FFC72C', 
                color: '#002B49', 
                border: 'none', 
                borderRadius: '1rem', 
                fontSize: '15px', 
                fontWeight: '900', 
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(255, 199, 44, 0.35)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <span>
                {loading
                  ? (isRegisterMode ? 'Registering...' : 'Authenticating...')
                  : (isRegisterMode ? 'Register Account' : 'Continue with CSULB SSO')}
              </span>
              <span style={{ fontSize: '16px', fontWeight: '900' }}>↗</span>
            </button>
          </form>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleToggleMode}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#002B49',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isRegisterMode ? 'Already have an account? Sign in with SSO' : 'Need an account? Register Account'}
            </button>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#6B7280', fontSize: '11px', fontWeight: '600' }}>
              <span>🛡️</span>
              <span>Secure sign-in with your BeachID</span>
            </div>

            <p style={{ marginTop: '10px', fontSize: '13px', color: '#4B5563', fontWeight: '600' }}>
              New to campus? <a href="#help" style={{ color: '#002B49', fontWeight: '800', textDecoration: 'underline' }}>Get sign-in help</a>
            </p>

            <p style={{ marginTop: '24px', fontSize: '11px', color: '#9CA3AF', lineHeight: '1.4', margin: '24px 0 0 0' }}>
              By continuing, you agree to our Terms of Use and Privacy Policy.<br />
              Built for the Long Beach student community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};