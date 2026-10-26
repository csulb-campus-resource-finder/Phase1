// Imports the React library and the useState hook for local state management.
import React, { useState } from 'react';

// Defines a TypeScript interface for the props accepted by the MFASetup component.
interface MFASetupProps {
  token: string;                          // JWT authentication token passed from the parent component
  onSetupSuccess: (newToken: string) => void; // Callback function triggered upon successful MFA setup
}

// Defines and exports the default MFASetup functional React component.
export default function MFASetup({ token, onSetupSuccess }: MFASetupProps) {
  // State hook for storing the generated base64 QR code image data URL string.
  const [qrCode, setQrCode] = useState('');
  // State hook for storing the 6-digit verification code entered by the user.
  const [code, setCode] = useState('');
  // State hook for storing status or error messages displayed to the user.
  const [message, setMessage] = useState('');
  // State hook tracking whether an asynchronous network request is currently loading.
  const [loading, setLoading] = useState(false);

  // Asynchronous function to initialize the MFA setup process and fetch the QR code.
  async function startSetup() {
    // Sets loading state to true while the request is in flight.
    setLoading(true);
    try {
      // Sends a POST request to the backend MFA setup endpoint with the Bearer token.
      const response = await fetch('http://localhost:3001/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Parses the JSON response data from the server.
      const data = await response.json();
      // If the response status is not successful, display an error message and exit.
      if (!response.ok) {
        setMessage(data.error || 'Could not start setup');
        return;
      }

      // Stores the received QR code image URL in state.
      setQrCode(data.qrCode);
      // Updates the status message instructing the user to scan the QR code.
      setMessage('Scan the QR code with Google Authenticator or Authy.');
    } catch (err) {
      // Catches and logs network errors, displaying an error message to the user.
      setMessage('Network error starting MFA setup.');
    } finally {
      // Resets the loading indicator state once the operation completes.
      setLoading(false);
    }
  }

  // Asynchronous function to verify the entered 6-digit code and finalize MFA activation.
  async function verifySetup() {
    // Validates that the input code consists of exactly 6 digits.
    if (code.length !== 6) {
      setMessage('Please enter a valid 6-digit code.');
      return;
    }

    // Sets loading state to true during verification.
    setLoading(true);
    try {
      // Sends a POST request to verify the code against the pending MFA secret.
      const response = await fetch('http://localhost:3001/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      // Parses the server response JSON data.
      const data = await response.json();
      // If verification succeeds...
      if (response.ok) {
        setMessage('Two-factor authentication enabled successfully!');
        // ...and a new token is returned, pass it up to the parent via callback.
        if (data.token) {
          onSetupSuccess(data.token);
        }
      } else {
        // Displays an error message if verification fails.
        setMessage(data.error || 'Invalid verification code');
      }
    } catch (err) {
      // Catches network errors and updates the error message.
      setMessage('Network error verifying code.');
    } finally {
      // Resets loading state.
      setLoading(false);
    }
  }

  // Renders the component layout JSX.
  return (
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', maxWidth: '400px', margin: '40px auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#002b49', marginTop: 0 }}>Set up Two-Factor Authentication</h2>
      
      {/* Conditionally renders either the generate button or the QR code scanning interface */}
      {!qrCode ? (
        <button 
          onClick={startSetup} 
          disabled={loading}
          style={{ background: '#002b49', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
        >
          {loading ? 'Generating...' : 'Generate Setup QR Code'}
        </button>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#4b5563' }}>Scan this QR code with your authenticator app.</p>
          {/* Displays the QR code image */}
          <img src={qrCode} alt="Authenticator setup QR code" style={{ margin: '15px 0', border: '1px solid #e5e7eb', borderRadius: '4px' }} />

          <div style={{ marginBottom: '15px', textAlign: 'left' }}>
            <label htmlFor="mfa-code" style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#374151' }}>
              Six-Digit Verification Code
            </label>
            {/* Input field restricting entry to 6 digits with numeric keyboard support */}
            <input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px', letterSpacing: '2px', textAlign: 'center' }}
            />
          </div>

          {/* Button to submit and verify the entered 6-digit code */}
          <button 
            onClick={verifySetup}
            disabled={loading || code.length !== 6}
            style={{ background: '#2563eb', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
          >
            {loading ? 'Verifying...' : 'Verify and Enable MFA'}
          </button>
        </div>
      )}

      {/* Conditionally displays success or error status messages */}
      {message && <p role="status" style={{ marginTop: '15px', fontSize: '14px', color: message.includes('successfully') ? '#10b981' : '#dc2626', textAlign: 'center' }}>{message}</p>}
    </div>
  );
}