import React, { useState, useEffect } from 'react';

interface UserAccount {
  email: string;
  username: string;
  role: string;
}

interface AuthAndProfileProps {
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  onLogout: () => void;
  onBack: () => void;
}

export const AuthAndProfileModal: React.FC<AuthAndProfileProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  onBack,
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student Buyer');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Profile edit local state to avoid direct prop mutation
  const [usernameInput, setUsernameInput] = useState(currentUser?.username || '');
  const [roleInput, setRoleInput] = useState(currentUser?.role || 'Student Buyer');

  useEffect(() => {
    if (currentUser) {
      setUsernameInput(currentUser.username || '');
      setRoleInput(currentUser.role || 'Student Buyer');
    }
  }, [currentUser]);

  const normalizeAndValidateAccount = (
    rawSource: any,
    fallbackEmail: string,
    fallbackUsername: string,
    fallbackRole: string
  ): UserAccount | null => {
    const cleanEmail = fallbackEmail.trim().toLowerCase();
    const resolvedEmail = (rawSource?.email || cleanEmail || '').toString().trim().toLowerCase();
    const resolvedUsername = (
      rawSource?.username ||
      rawSource?.name ||
      fallbackUsername ||
      (resolvedEmail ? resolvedEmail.split('@')[0] : '')
    )
      .toString()
      .trim();
    const resolvedRole = (rawSource?.role || fallbackRole || '').toString().trim();

    if (!resolvedEmail || !resolvedRole) {
      setErrorMsg('Both email and role are required.');
      return null;
    }

    const accountData: UserAccount = {
      email: resolvedEmail,
      username: resolvedUsername || resolvedEmail.split('@')[0],
      role: resolvedRole,
    };

    try {
      const existingRaw = localStorage.getItem('sso_user');
      const existingParsed = existingRaw ? JSON.parse(existingRaw) : {};
      localStorage.setItem(
        'sso_user',
        JSON.stringify({
          ...existingParsed,
          email: accountData.email,
          username: accountData.username,
          name: accountData.username,
          role: accountData.role,
        })
      );
    } catch {
      // Ignore storage errors in restricted browser contexts
    }

    return accountData;
  };

  // Handle Login / Registration submission
  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || (isRegistering && !role.trim())) {
      setErrorMsg(isRegistering ? 'Both email and role are required.' : 'Email is required.');
      setLoading(false);
      return;
    }

    const endpoint = isRegistering ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const payload = isRegistering
      ? { email: cleanEmail, username: username.trim(), password, role: role.trim() }
      : { email: cleanEmail, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.token) {
          localStorage.setItem('sso_token', data.token);
        }

        const rawSource = data.account || data.user || {};
        const accountData = normalizeAndValidateAccount(
          rawSource,
          cleanEmail,
          username,
          rawSource.role || role
        );

        if (accountData) {
          onLoginSuccess(accountData);
        }
      } else {
        setErrorMsg(data.error || 'Authentication failed.');
      }
    } catch (err) {
      setErrorMsg('Network error connecting to NeonDB server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setErrorMsg('');

    const cleanCurrentEmail = (currentUser.email || '').trim().toLowerCase();
    const cleanRole = (roleInput || '').trim();
    const cleanUsername = (usernameInput || '').trim();

    if (!cleanCurrentEmail || !cleanRole) {
      setErrorMsg('Both email and role are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanCurrentEmail,
          username: cleanUsername,
          role: cleanRole,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const rawSource = data.account || data.user || {};
        const updatedAccount = normalizeAndValidateAccount(
          rawSource,
          cleanCurrentEmail,
          cleanUsername || currentUser.username,
          cleanRole
        );

        if (updatedAccount) {
          onLoginSuccess(updatedAccount);
          alert('Profile and role updated successfully!');
        }
      } else {
        setErrorMsg(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '40px auto',
        background: '#FFFFFF',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0F172A' }}>
          {currentUser
            ? '👤 User Profile & Role Manager'
            : isRegistering
            ? '📝 Campus Account Registration'
            : '🔐 Campus SSO Login'}
        </h2>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#64748B',
          }}
        >
          ✕
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #F87171',
            color: '#991B1B',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: '600',
          }}
        >
          {errorMsg}
        </div>
      )}

      {currentUser ? (
        /* Profile Management View */
        <form onSubmit={handleUpdateProfile}>
          <div
            style={{
              background: '#F8FAFC',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '20px',
              border: '1px solid #E2E8F0',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748B' }}>
              Logged in Email (Read-Only):
            </p>
            <strong style={{ fontSize: '15px', color: '#0F172A' }}>{currentUser.email}</strong>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334151',
                marginBottom: '6px',
              }}
            >
              Display Username
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334151',
                marginBottom: '6px',
              }}
            >
              Select Account Role
            </label>
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                boxSizing: 'border-box',
                background: '#FFF',
              }}
            >
              <option value="Student Buyer">Student Buyer</option>
              <option value="Campus Seller">Campus Seller</option>
              <option value="Faculty / Admin">Faculty / Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                background: '#059669',
                color: '#FFF',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              style={{
                background: '#EF4444',
                color: '#FFF',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </form>
      ) : (
        /* Login & Registration View */
        <form onSubmit={handleSubmitAuth}>
          {isRegistering && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#334151',
                  marginBottom: '6px',
                }}
              >
                Username
              </label>
              <input
                type="text"
                placeholder="Nadhirah M."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334151',
                marginBottom: '6px',
              }}
            >
              CSULB Email
            </label>
            <input
              type="email"
              placeholder="student@student.csulb.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: '#334151',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {isRegistering && (
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#334151',
                  marginBottom: '6px',
                }}
              >
                Initial Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  boxSizing: 'border-box',
                  background: '#FFF',
                }}
              >
                <option value="Student Buyer">Student Buyer</option>
                <option value="Campus Seller">Campus Seller</option>
                <option value="Faculty / Admin">Faculty / Admin</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#002B49',
              color: '#FFC72C',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: '900',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            {loading ? 'Processing...' : isRegistering ? 'Register Account' : 'Login'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {isRegistering ? 'Login here' : 'Register now'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};