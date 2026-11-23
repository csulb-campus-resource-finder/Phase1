import React, { useState, useEffect, useRef } from 'react';

interface LoginWith2FAProps {
  initialEmail?: string;
  autoSendOtp?: boolean;
  onLoginSuccess?: (data: { token: string; user: any }) => void;
}

export const LoginWith2FA: React.FC<LoginWith2FAProps> = ({
  initialEmail = '',
  autoSendOtp = false,
  onLoginSuccess,
}) => {
  const normalizedInitialEmail = initialEmail.trim().toLowerCase();
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState<'login' | 'verify'>(
    normalizedInitialEmail && autoSendOtp ? 'verify' : 'login'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState(normalizedInitialEmail);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const sentInitialCodeRef = useRef(false);

  // Helper fetch function using relative paths to work with Vite proxy
  const apiFetch = async (path: string, options: RequestInit) => {
    let res = await fetch(`/api/v1${path}`, options);
    if (res.status === 404) {
      res = await fetch(`/api${path}`, options);
    }
    return res;
  };

  const sendEmailOtp = async (targetEmail: string, showAlertOnError = true) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return false;

    try {
      let res = await apiFetch('/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (res.status === 404) {
        res = await apiFetch('/auth/send-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, method: 'email' }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatusMessage(data.message || `Verification code sent to ${cleanEmail}.`);
        return true;
      } else if (showAlertOnError) {
        alert(data.error || data.detail || 'Could not send verification code.');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      if (showAlertOnError) {
        alert('Failed to connect to the authentication server.');
      }
    }
    return false;
  };

  useEffect(() => {
    if (normalizedInitialEmail) {
      setEmail(normalizedInitialEmail);
    }
    if (normalizedInitialEmail && autoSendOtp && !sentInitialCodeRef.current) {
      sentInitialCodeRef.current = true;
      setStep('verify');
      sendEmailOtp(normalizedInitialEmail, false);
    }
  }, [normalizedInitialEmail, autoSendOtp]);

  // Handle Registration or Login submission to trigger OTP / session
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@student.csulb.edu')) {
      alert('Access restricted to valid @student.csulb.edu accounts.');
      setLoading(false);
      return;
    }

    try {
      const path = isRegistering ? '/auth/register' : '/auth/login';
      const payload = isRegistering
        ? { email: cleanEmail, username: name || cleanEmail.split('@')[0], password, role: 'Student Buyer' }
        : { email: cleanEmail, password };

      const res = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegistering) {
          alert('Registration successful! Please log in.');
          setIsRegistering(false);
          setPassword('');
        } else {
          setEmail(cleanEmail);
          setStep('verify');
        }
      } else {
        alert(data.error || data.detail || 'Authentication action failed.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert('Failed to connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit the 6-digit OTP code for final verification
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await apiFetch('/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('sso_token', data.token);
        localStorage.setItem('sso_user', JSON.stringify(data.user));

        if (onLoginSuccess) {
          onLoginSuccess(data);
        } else {
          window.location.reload();
        }
      } else {
        alert(data.error || 'Invalid verification code.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      alert('Failed to verify code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code handler
  const handleResendCode = async () => {
    await sendEmailOtp(email, true);
  };

  return (
    <div
      style={{
        maxWidth: '420px',
        margin: '60px auto',
        background: '#FFF',
        padding: '32px',
        borderRadius: '16px',
        border: '1.5px solid #E5E7EB',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {step === 'login' ? (
        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ color: '#002B49', fontWeight: '900', margin: '0 0 4px 0' }}>
            {isRegistering ? 'Create Account' : 'Sign In'}
          </h2>
          <p style={{ color: '#4B5563', fontSize: '14px', margin: '0 0 12px 0' }}>
            {isRegistering ? 'Register with your CSULB student email.' : 'Access your CSULB Campus Resource account.'}
          </p>

          {isRegistering && (
            <div>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#374151' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nadhirah Michael-Ho"
                required
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: '800', color: '#374151' }}>CSULB Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@student.csulb.edu"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '800', color: '#374151' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Processing...' : isRegistering ? 'Register Account' : 'Continue to Verification'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setPassword('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#002B49',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: '13px',
                textDecoration: 'underline',
              }}
            >
              {isRegistering ? 'Already have an account? Sign In' : 'New student? Register an account'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ color: '#002B49', fontWeight: '900', margin: '0 0 4px 0' }}>Two-Factor Authentication</h2>
          <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 8px 0' }}>
            We’ve sent a 6-digit verification code to <strong>{email}</strong>. This code expires in 5 minutes.
          </p>
          {statusMessage && (
            <p style={{ fontSize: '12px', color: '#059669', fontWeight: 700, margin: '0 0 8px 0' }}>
              {statusMessage}
            </p>
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: '800', color: '#374151' }}>Enter 6-Digit Code</label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoFocus
              required
              style={{ ...inputStyle, letterSpacing: '6px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Verifying Code...' : 'Verify and Sign In'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setStep('login')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#4B5563',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ← Change email
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#002B49',
                fontWeight: '900',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #D1D5DB',
  background: '#F9FAFB',
  fontSize: '14px',
  marginTop: '6px',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  background: '#FFC72C',
  color: '#002B49',
  border: 'none',
  borderRadius: '12px',
  padding: '14px',
  fontWeight: '900',
  fontSize: '15px',
  cursor: 'pointer',
  marginTop: '8px',
  transition: 'background 0.2s',
};