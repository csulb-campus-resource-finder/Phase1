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
  // State hook for storing the student email input, initialized with a default CSULB student email.
  const [email, setEmail] = useState('nadhirah.michael-ho01@student.csulb.edu');
  // State hook for storing the student name input, initialized with a default student name.
  const [name, setName] = useState('Nadhirah Michael-Ho');
  // State hook tracking whether an SSO request is currently in progress (loading state).
  const [loading, setLoading] = useState<boolean>(false);
  // State hook for storing and displaying any authentication error messages.
  const [error, setError] = useState<string | null>(null);

  // Asynchronous handler function executed when the SSO login form is submitted.
  const handleSSOLogin = async (e: React.FormEvent) => {
    // Prevents the browser's default form submission behavior (page refresh).
    e.preventDefault();
    // Sets loading state to true to indicate the login request has started.
    setLoading(true);
    // Clears any previous error messages.
    setError(null);

    // Validates that the entered email string strictly ends with the official CSULB student domain.
    if (!email.endsWith('@student.csulb.edu')) {
      // Sets an error message if the email domain is invalid.
      setError('Access restricted to valid @student.csulb.edu accounts.');
      // Resets loading state to false.
      setLoading(false);
      // Exits the function early.
      return;
    }

    try {
      // Sends an HTTP POST request to the backend SSO authentication endpoint via Vite proxy (supports mobile local network testing)
      const response = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Serializes the email and name state variables into a JSON payload string.
        body: JSON.stringify({ email, name }),
      });

      // Parses the incoming JSON response from the server.
      const data = await response.json();

      // If the HTTP response status is not successful (not 2xx), throw an error.
      if (!response.ok) {
        throw new Error(data.error || 'SSO authentication failed.');
      }

      // Passes the entire response payload (handling MFA states or tokens) up to App.tsx via callback.
      onLoginSuccess(data);
    } catch (err: any) {
      // Catches any errors during fetch or parsing and stores the error message in state.
      setError(err.message);
    } finally {
      // Executes regardless of success or failure to reset the loading indicator.
      setLoading(false);
    }
  };

  // Renders the updated high-end login portal user interface JSX layout.
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
      {/* Main card container matching the mobile shell mockups */}
      <div style={{ 
        width: '100%', 
        maxWidth: '440px', 
        background: '#ffffff', 
        borderRadius: '2rem', 
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #E5E7EB'
      }}>
        {/* Top Hero Section with Walter Pyramid background & CSULB branding badge */}
        <div style={{
          position: 'relative',
          height: '360px',
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
          {/* Header Bar with Seal and App Title using logo.png */}
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

          {/* Hero Main Typography */}
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
            <h1 style={{ margin: '0 0 10px 0', fontSize: '38px', fontWeight: '900', lineHeight: '1.05', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Your campus.<br />
              <span style={{ color: '#ffffff' }}>Within reach.</span>
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#E5E7EB', fontWeight: '500' }}>
              Find your way. Find your people. Find your spot.
            </p>
          </div>
        </div>

        {/* Lower Content Body & Form Area */}
        <div style={{ padding: '32px 28px', backgroundColor: '#FAF9F6' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            One login. All of campus.
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}>
            Your shortcut to campus resources, student finds, easier parking, and a place to focus.
          </p>

          {/* Conditionally renders an error alert box if an error exists */}
          {error && (
            <div style={{ 
              background: '#FEE2E2', 
              color: '#991B1B', 
              padding: '14px 16px', 
              borderRadius: '0.75rem', 
              fontSize: '13px', 
              marginBottom: '20px',
              border: '1px solid #FCA5A5',
              fontWeight: '700'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Login form bound to the handleSSOLogin submission handler */}
          <form onSubmit={handleSSOLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Input field for Student Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>
                Student Full Name
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: '1.5px solid #D1D5DB', 
                  borderRadius: '0.75rem', 
                  fontSize: '15px', 
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontWeight: '600',
                  color: '#1F2937'
                }}
                required
              />
            </div>

            {/* Input field for CSULB Student Email */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>
                CSULB Student Email
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@student.csulb.edu"
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: '1.5px solid #D1D5DB', 
                  borderRadius: '0.75rem', 
                  fontSize: '15px', 
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  fontWeight: '600',
                  color: '#1F2937'
                }}
                required
              />
              <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', display: 'block', fontWeight: '500' }}>
                Must end with @student.csulb.edu
              </span>
            </div>

            {/* Vibrant CSULB Gold Action Button with Callout Arrow */}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '10px', 
                padding: '16px', 
                background: '#FFC72C', 
                color: '#002B49', 
                border: 'none', 
                borderRadius: '1rem', 
                fontSize: '16px', 
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
              <span>{loading ? 'Authenticating...' : 'Continue with CSULB SSO'}</span>
              <span style={{ fontSize: '18px', fontWeight: '900' }}>↗</span>
            </button>
          </form>

          {/* Footer Security Badges and Helper Links */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>
              <span>🛡️</span>
              <span>Secure sign-in with your BeachID</span>
            </div>

            <p style={{ marginTop: '12px', fontSize: '14px', color: '#4B5563', fontWeight: '600' }}>
              New to campus? <a href="#help" style={{ color: '#002B49', fontWeight: '800', textDecoration: 'underline' }}>Get sign-in help</a>
            </p>

            <p style={{ marginTop: '32px', fontSize: '11px', color: '#9CA3AF', lineHeight: '1.5', margin: '32px 0 0 0' }}>
              By continuing, you agree to our Terms of Use and Privacy Policy.<br />
              Built for the Long Beach student community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};