// Imports the React library along with useState and useEffect hooks from 'react'.
import React, { useState, useEffect } from 'react';
// Imports the LoginPortal component used for handling user sign-in interfaces.
import { LoginPortal } from './LoginPortal';
// Imports the LoginWith2FA component for handling secure 2FA sign-in.
import { LoginWith2FA } from './LoginWith2FA';
// Imports the CampusMap component for rendering the interactive campus map.
import { CampusMap } from './CampusMap';
// Imports the IndoorNavigator component for level-by-level indoor building floor plans.
import { IndoorNavigator } from './IndoorNavigator';
// Imports the BasicNeedsDirectory component for essential resources and emergency contacts.
import { BasicNeedsDirectory } from './BasicNeedsDirectory';
// Imports the PersonalDashboard component for tracking perks, saved locations, and settings.
import { PersonalDashboard } from './PersonalDashboard';
// Imports the ScheduleViewer component to display student class schedules and active states.
import { ScheduleViewer } from './ScheduleViewer';
// Imports the ProfilePage component for managing student profile information.
import { ProfilePage } from './ProfilePage';
// Imports the MFASetup component for registering authenticator apps via QR code scanning.
import MFASetup from './MFASetup';
// Imports the AboutPage component for displaying the campus resource finder overview.
import { AboutPage } from './AboutPage';
// Imports the AuthAndProfileModal component for login, registration, and role management.
import { AuthAndProfileModal } from './AuthandProfileModal';

// Dynamically resolves and creates URL references to asset files.
const logoImage = new URL('../logo.png', import.meta.url).href;
const campusBgImage = new URL('../campus-bg.jpg', import.meta.url).href;

// Interface definitions for schedule parsers
interface ParsedClass {
  course_code: string;
  time_window: string;
  location: string;
}

interface ICSClassItem {
  course_code: string;
  start_time: string;
  end_time: string;
  day: string;
  location: string;
}

interface UserAccount {
  email: string;
  username: string;
  role: string;
}

// Sub-component for OCR Schedule Image Upload
function ScheduleUploader({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [classes, setClasses] = useState<ParsedClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('sso_token');
      const response = await fetch('/api/v1/schedule/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to process schedule image.');
      }

      const data: ParsedClass[] = await response.json();
      setClasses(data);
      alert('Schedule image processed and synced successfully!');
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#FFFFFF', padding: '1.75rem', borderRadius: '1.25rem', marginBottom: '24px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: '18px', fontWeight: '800' }}>📸 Upload Schedule Screenshot (OCR Sync)</h3>
      <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '16px', lineHeight: '1.5' }}>
        Upload a screenshot of your Student Center schedule to automatically extract and sync your classes.
      </p>

      <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
        style={{ display: 'block', width: '100%', fontSize: '14px', marginBottom: '16px', padding: '10px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '0.75rem' }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{ 
          background: '#FFC72C', 
          color: '#111827', 
          padding: '12px 20px', 
          border: 'none', 
          borderRadius: '0.85rem', 
          cursor: 'pointer', 
          fontWeight: '800',
          fontSize: '14px',
          opacity: (!file || loading) ? 0.5 : 1,
          boxShadow: '0 2px 4px rgba(255,199,44,0.3)'
        }}
      >
        {loading ? 'Processing OCR & Syncing...' : 'Upload & Sync Schedule Image'}
      </button>

      {error && <p style={{ marginTop: '12px', fontSize: '14px', color: '#DC2626', fontWeight: 'bold' }}>⚠️ {error}</p>}

      {classes.length > 0 && (
        <div style={{ marginTop: '18px', background: '#F0FDF4', padding: '12px', borderRadius: '0.75rem', border: '1px solid #BBF7D0' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#065F46', marginBottom: '8px' }}>Successfully Synced Classes:</h4>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
            {classes.map((cls, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: '#064E3B', marginBottom: '4px', fontWeight: '600' }}>
                <strong>{cls.course_code}</strong> — {cls.time_window} ({cls.location})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Sub-component for .ics Calendar File Upload
function ICSUploader({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [classes, setClasses] = useState<ICSClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('sso_token');
      const response = await fetch('/api/v1/schedule/upload-ics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to parse .ics file.');
      }

      const data: ICSClassItem[] = await response.json();
      setClasses(data);
      alert('Calendar file parsed and synced successfully!');
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#FFFFFF', padding: '1.75rem', borderRadius: '1.25rem', marginBottom: '24px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#111827', fontSize: '18px', fontWeight: '800' }}>📅 Upload Calendar File (.ics)</h3>
      <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '16px', lineHeight: '1.5' }}>
        Select your exported calendar file to instantly sync your class times and locations.
      </p>

      <input
        type="file"
        accept=".ics"
        onChange={handleFileChange}
        style={{ display: 'block', width: '100%', fontSize: '14px', marginBottom: '16px', padding: '10px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '0.75rem' }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{ 
          background: '#FFC72C', 
          color: '#111827', 
          padding: '12px 20px', 
          border: 'none', 
          borderRadius: '0.85rem', 
          cursor: 'pointer', 
          fontWeight: '800',
          fontSize: '14px',
          opacity: (!file || loading) ? 0.5 : 1,
          boxShadow: '0 2px 4px rgba(255,199,44,0.3)'
        }}
      >
        {loading ? 'Parsing .ics File...' : 'Upload & Sync .ics File'}
      </button>

      {error && <p style={{ marginTop: '12px', fontSize: '14px', color: '#DC2626', fontWeight: 'bold' }}>⚠️ {error}</p>}

      {classes.length > 0 && (
        <div style={{ marginTop: '18px', background: '#F0FDF4', padding: '12px', borderRadius: '0.75rem', border: '1px solid #BBF7D0' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#065F46', marginBottom: '8px' }}>Synced Classes from Calendar:</h4>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
            {classes.map((cls, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: '#064E3B', marginBottom: '4px', fontWeight: '600' }}>
                <strong>{cls.course_code}</strong> — {cls.day}: {cls.start_time} - {cls.end_time} ({cls.location})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Defines a functional React component that renders a form for students to add custom classes manually.
function ScheduleUploadForm({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [days, setDays] = useState('Mon,Wed');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:15');
  const [building, setBuilding] = useState('ECS');
  const [room, setRoom] = useState('100');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedDays = days.split(',').map(d => d.trim());
    
    const payload = {
      courses: [{
        code: courseCode,
        name: courseName,
        days: formattedDays,
        startTime,
        endTime,
        building,
        room
      }]
    };

    try {
      const token = localStorage.getItem('sso_token');
      const res = await fetch('/api/schedules/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert('Class added successfully!');
        setCourseCode('');
        setCourseName('');
        onUploadSuccess();
      } else {
        alert(data.error || 'Failed to add class.');
      }
    } catch (err) {
      console.error('Error adding course:', err);
      alert('Network error while adding class.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#FFFFFF', padding: '1.75rem', borderRadius: '1.25rem', marginBottom: '24px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#111827', fontSize: '18px', fontWeight: '800' }}>✏️ Add Custom Class to Schedule</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <input placeholder="Course Code (e.g. CECS 323)" value={courseCode} onChange={e => setCourseCode(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
        <input placeholder="Course Name (e.g. Database)" value={courseName} onChange={e => setCourseName(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
        <input placeholder="Days (Mon,Wed)" value={days} onChange={e => setDays(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
        <input placeholder="Start Time (09:30)" value={startTime} onChange={e => setStartTime(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
        <input placeholder="End Time (10:45)" value={endTime} onChange={e => setEndTime(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
        <input placeholder="Building (ECS)" value={building} onChange={e => setBuilding(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
        <input placeholder="Room (311)" value={room} onChange={e => setRoom(e.target.value)} required style={{ padding: '12px 14px', borderRadius: '0.75rem', border: '1.5px solid #D1D5DB', fontSize: '14px', background: '#F9FAFB' }} />
      </div>
      <button type="submit" style={{ background: '#FFC72C', color: '#111827', padding: '12px 20px', border: 'none', borderRadius: '0.85rem', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 2px 4px rgba(255,199,44,0.3)' }}>
        ➕ Save Class to Schedule
      </button>
    </form>
  );
}

// Defines and exports the primary root application component.
export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // MFA state hooks - Start with LoginPortal by setting requiresMfaChoice to false initially
  const [requiresMfaChoice, setRequiresMfaChoice] = useState(false);
  const [mfaChoiceChallenge, setMfaChoiceChallenge] = useState<string | null>('initial-app-challenge');
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [requiresMFASetup, setRequiresMFASetup] = useState(false);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaEmail, setMfaEmail] = useState(''); // Track email for MFA verification

  // Direct Email OTP flow states
  const [requiresEmailOtpInput, setRequiresEmailOtpInput] = useState(false);
  // Forgot Password flow states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Auth & Profile Modal Management
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(null);

  // Navigation & Form Toggle states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'map' | 'indoor' | 'directory' | 'profile' | 'about'>('dashboard');
  const [showManualForm, setShowManualForm] = useState(false);
  const [showOcrUploader, setShowOcrUploader] = useState(false);
  const [showIcsUploader, setShowIcsUploader] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  useEffect(() => {
    const storedToken = localStorage.getItem('sso_token');
    if (storedToken) {
      setToken(storedToken);
    }
    const storedUser = localStorage.getItem('sso_user');
    if (storedUser) {
      try { 
        const parsed = JSON.parse(storedUser);
        // Purge stale or placeholder "Updated Name" from localStorage
        if (!parsed.name || parsed.name === 'Updated Name') {
          parsed.name = parsed.username || parsed.email?.split('@')[0] || 'Student';
          localStorage.setItem('sso_user', JSON.stringify(parsed));
        }
        setUser(parsed);
        if (parsed.email && parsed.role) {
          setCurrentUserAccount({
            email: parsed.email,
            username: parsed.username || parsed.name || parsed.email.split('@')[0],
            role: parsed.role,
          });
        }
      } catch (e) {}
    }
  }, []);

  const syncAuthenticatedUser = (payload: any, fallbackEmail?: string) => {
    const tokenValue = payload?.token || payload?.accessToken;
    if (tokenValue) {
      localStorage.setItem('sso_token', tokenValue);
      setToken(tokenValue);
    }

    const rawUser = payload?.user || payload?.account || {};
    const email = (rawUser.email || payload?.email || fallbackEmail || '').trim().toLowerCase();
    const role = (rawUser.role || payload?.role || user?.role || currentUserAccount?.role || '').trim();
    const displayName =
      rawUser.name && rawUser.name !== 'Updated Name'
        ? rawUser.name
        : rawUser.username || (email ? email.split('@')[0] : 'Student');

    if (email) {
      const normalizedUser = {
        ...user,
        ...rawUser,
        email,
        ...(role ? { role } : {}),
        name: displayName,
        username: rawUser.username || displayName,
      };
      localStorage.setItem('sso_user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      if (role) {
        setCurrentUserAccount({
          email,
          username: normalizedUser.username,
          role,
        });
      }
    }
  };

  // Handles response when user logs in or registers
  const handleLoginResponse = (data: any) => {
    const resolvedEmail = data?.email || data?.user?.email || data?.account?.email;
    if (resolvedEmail) {
      setMfaEmail(resolvedEmail);
    }

    if (data.requiresMfaChoice || data.requires2FA || data.challenge) {
      setRequiresMfaChoice(true);
      setMfaChoiceChallenge(data.challenge || 'initial-app-challenge');
      return;
    }

    if (data.requiresMFA) {
      setRequiresMFA(true);
      setMfaChallenge(data.challenge);
      if (resolvedEmail) setMfaEmail(resolvedEmail);
      return;
    }

    const tokenValue = data?.token || data?.accessToken;
    if (tokenValue) {
      syncAuthenticatedUser(data, resolvedEmail);
      setRequiresMfaChoice(false);
      setRequiresMFA(false);
      setRequiresEmailOtpInput(false);
      if (data.requiresMFASetup) {
        setRequiresMFASetup(true);
      }
      return;
    }

    setRequiresMfaChoice(true);
  };

  const handleVerifyLoginMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');

    let targetEmail = mfaEmail;
    if (!targetEmail) {
      try {
        const storedUser = localStorage.getItem('sso_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.email) targetEmail = parsed.email;
        }
      } catch (err) {}
    }
    if (!targetEmail) {
      targetEmail = 'nadhirah.michael-ho01@student.csulb.edu';
    }

    try {
      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, challenge: mfaChallenge, code: mfaCodeInput })
      });
      const data = await res.json();

      if (res.ok) {
        syncAuthenticatedUser(data, targetEmail);
        setRequiresMFA(false);
        setRequiresMfaChoice(false);
        setRequiresEmailOtpInput(false);
      } else {
        setMfaError(data.error || 'Invalid authenticator code');
      }
    } catch (err) {
      setMfaError('Network error verifying MFA code.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sso_token');
    localStorage.removeItem('sso_user');
    setToken(null);
    setUser(null);
    setRequiresMfaChoice(false);
    setMfaChoiceChallenge('initial-app-challenge');
    setRequiresMFA(false);
    setMfaChallenge(null);
    setRequiresMFASetup(false);
    setRequiresEmailOtpInput(false);
    setMfaEmail('');
    setCurrentUserAccount(null);
    setShowAuthModal(false);
  };

  const handleSyncSuccess = () => {
    setScheduleRefreshKey(prev => prev + 1);
    setShowManualForm(false);
    setShowOcrUploader(false);
    setShowIcsUploader(false);
  };

  // Step 0: Render LoginPortal or Forgot Password View
  if (!token && !requiresMfaChoice && !requiresMFA && !requiresEmailOtpInput) {
    return (
      <div style={{ 
        backgroundImage: `linear-gradient(rgba(0, 43, 73, 0.65), rgba(0, 43, 73, 0.85)), url(${campusBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {!showForgotPassword ? (
          <>
            <LoginPortal onLoginSuccess={handleLoginResponse} />
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setResetStatus(null);
                setResetOtpSent(false);
              }}
              style={{
                marginTop: '14px',
                background: 'rgba(0, 43, 73, 0.85)',
                color: '#FFC72C',
                border: '1px solid rgba(255, 199, 44, 0.4)',
                padding: '10px 20px',
                borderRadius: '0.75rem',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.25)'
              }}
            >
              🔑 Forgot Password?
            </button>
          </>
        ) : (
          <div style={{ width: '100%', maxWidth: '420px', background: '#FFFFFF', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid #E5E7EB' }}>
            <h2 style={{ color: '#002B49', marginTop: 0, fontSize: '22px', fontWeight: '900' }}>Reset Your Password</h2>
            <p style={{ color: '#4B5563', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
              {!resetOtpSent
                ? 'Enter your CSULB student email to receive a 6-digit password reset code.'
                : `Enter the 6-digit code sent to ${resetEmail} and choose a new password.`}
            </p>

            {!resetOtpSent ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setResetLoading(true);
                  setResetStatus(null);
                  try {
                    const res = await fetch('/api/auth/forgot-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: resetEmail })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setResetOtpSent(true);
                      setResetStatus({ type: 'success', text: data.message });
                    } else {
                      setResetStatus({ type: 'error', text: data.error || 'Failed to send reset code.' });
                    }
                  } catch {
                    setResetStatus({ type: 'error', text: 'Network error connecting to server.' });
                  } finally {
                    setResetLoading(false);
                  }
                }}
              >
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="first.last01@student.csulb.edu"
                  required
                  style={{ width: '100%', padding: '12px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', background: '#F9FAFB' }}
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{ width: '100%', background: '#FFC72C', color: '#111827', padding: '13px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '15px', cursor: 'pointer', opacity: resetLoading ? 0.6 : 1 }}
                >
                  {resetLoading ? 'Sending Code...' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setResetLoading(true);
                  setResetStatus(null);
                  try {
                    const res = await fetch('/api/auth/reset-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword: resetNewPassword })
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setResetStatus({ type: 'success', text: data.message });
                      setTimeout(() => {
                        setShowForgotPassword(false);
                        setResetOtpSent(false);
                        setResetOtp('');
                        setResetNewPassword('');
                        setResetStatus(null);
                      }, 1500);
                    } else {
                      setResetStatus({ type: 'error', text: data.error || 'Failed to reset password.' });
                    }
                  } catch {
                    setResetStatus({ type: 'error', text: 'Network error resetting password.' });
                  } finally {
                    setResetLoading(false);
                  }
                }}
              >
                <input
                  type="text"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-Digit Verification Code"
                  maxLength={6}
                  required
                  style={{ width: '100%', padding: '12px 14px', fontSize: '16px', letterSpacing: '3px', textAlign: 'center', marginBottom: '12px', boxSizing: 'border-box', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', background: '#F9FAFB' }}
                />
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter New Password"
                  required
                  style={{ width: '100%', padding: '12px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', background: '#F9FAFB' }}
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{ width: '100%', background: '#002B49', color: '#FFC72C', padding: '13px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '15px', cursor: 'pointer', opacity: resetLoading ? 0.6 : 1 }}
                >
                  {resetLoading ? 'Updating Password...' : 'Confirm New Password'}
                </button>
              </form>
            )}

            {resetStatus && (
              <p style={{ marginTop: '14px', fontSize: '13px', fontWeight: '700', textAlign: 'center', color: resetStatus.type === 'error' ? '#DC2626' : '#059669' }}>
                {resetStatus.type === 'error' ? '⚠️ ' : '✅ '}
                {resetStatus.text}
              </p>
            )}

            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetStatus(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#002B49', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 1: Choose Verification Method View
  if (!token && requiresMfaChoice) {
    return (
      <div style={{ 
        backgroundImage: `linear-gradient(rgba(0, 43, 73, 0.65), rgba(0, 43, 73, 0.85)), url(${campusBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* University Logo & Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {logoImage && (
            <div 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundImage: `url(${logoImage})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center', 
                border: '3px solid #FFC72C',
                margin: '0 auto 12px auto',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }} 
            />
          )}
          <h1 style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: '900', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
            CSULB Campus Resource Finder
          </h1>
          <p style={{ color: '#FFC72C', fontSize: '15px', fontWeight: '700', margin: '6px 0 0' }}>
            Choose Verification Method
          </p>
        </div>

        {/* Choice Selection Card */}
        <div style={{ width: '100%', maxWidth: '420px', background: '#FFFFFF', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid #E5E7EB' }}>
          <p style={{ color: '#4B5563', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>Select how you would like to receive your verification code.</p>
          
          {/* Email Verification Code Option */}
          <button 
            onClick={() => {
              setRequiresMfaChoice(false);
              setRequiresEmailOtpInput(true);
            }}
            style={{ width: '100%', background: '#002B49', color: '#FFC72C', padding: '14px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            ✉️ Email Verification Code
          </button>

          {/* Authenticator App Option */}
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/auth/mfa/choose-method', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: mfaEmail, challenge: mfaChoiceChallenge, method: 'totp' })
                });
                const data = await res.json();
                if (res.ok && data.requiresMFA) {
                  setRequiresMfaChoice(false);
                  setRequiresMFA(true);
                  setMfaChallenge(data.challenge);
                } else {
                  alert(data.error || 'Failed to load authenticator flow.');
                }
              } catch (err) {
                alert('Network error connecting to server.');
              }
            }}
            style={{ width: '100%', background: '#F3F4F6', color: '#111827', padding: '14px', border: '1.5px solid #D1D5DB', borderRadius: '0.85rem', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
          >
            🔐 Use Authenticator App
          </button>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
            <button
              onClick={() => setRequiresMfaChoice(false)}
              style={{ width: '100%', background: 'transparent', color: '#002B49', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conditional Rendering Screen: Direct Email OTP Flow
  if (requiresEmailOtpInput) {
    return (
      <div style={{ 
        backgroundImage: `linear-gradient(rgba(0, 43, 73, 0.65), rgba(0, 43, 73, 0.85)), url(${campusBgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
          <button
            onClick={() => {
              setRequiresEmailOtpInput(false);
              setRequiresMfaChoice(true);
            }}
            style={{ background: 'transparent', border: 'none', color: '#FFC72C', fontWeight: '800', cursor: 'pointer', fontSize: '14px', marginBottom: '12px' }}
          >
            ← Back to Verification Methods
          </button>

          <LoginWith2FA 
            onLoginSuccess={(data) => {
              syncAuthenticatedUser(data, data?.user?.email || mfaEmail);
              setRequiresEmailOtpInput(false);
              setRequiresMfaChoice(false);
            }} 
          />
        </div>
      </div>
    );
  }

  // Conditional Rendering Screen: TOTP Authenticator Challenge Prompt View
  if (requiresMFA) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '2.5rem', background: '#FFFFFF', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', fontFamily: 'system-ui, sans-serif', border: '1px solid #E5E7EB' }}>
        <h2 style={{ color: '#111827', marginTop: 0, fontSize: '24px', fontWeight: '800' }}>Two-Factor Authentication</h2>
        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>Enter the 6-digit code from your authenticator app.</p>
        <form onSubmit={handleVerifyLoginMFA}>
          <input
            value={mfaCodeInput}
            onChange={e => setMfaCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            autoFocus
            style={{ width: '100%', padding: '14px', fontSize: '20px', textAlign: 'center', letterSpacing: '4px', marginBottom: '18px', boxSizing: 'border-box', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', background: '#F9FAFB' }}
          />
          <button type="submit" style={{ width: '100%', background: '#FFC72C', color: '#111827', padding: '14px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(255,199,44,0.3)' }}>
            Verify & Sign In
          </button>
        </form>
        {mfaError && <p style={{ color: '#DC2626', fontSize: '14px', marginTop: '12px', textAlign: 'center', fontWeight: 'bold' }}>⚠️ {mfaError}</p>}
      </div>
    );
  }

  // Conditional Rendering Screen: Initial MFA Setup (QR Code Scanning) View
  if (token && requiresMFASetup) {
    return (
      <MFASetup 
        token={token} 
        onSetupSuccess={(newToken) => {
          localStorage.setItem('sso_token', newToken);
          setToken(newToken);
          setRequiresMFASetup(false);
        }} 
      />
    );
  }

  // Conditional Rendering: Main Dashboard & Tab Views
  return (
    <div style={{ 
      backgroundImage: `linear-gradient(rgba(247, 247, 245, 0.40), rgba(247, 247, 245, 0.90)), url(${campusBgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh', 
      padding: '24px 20px 100px 20px', 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      color: '#111827', 
      boxSizing: 'border-box' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px', 
        borderBottom: '2px solid #E5E7EB', 
        paddingBottom: '18px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundImage: logoImage ? `url(${logoImage})` : undefined, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center', 
              border: '2.5px solid #FFC72C',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
            }} 
          />
          <div>
            <h1 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>CSULB Campus Resource Finder</h1>
            <p style={{ margin: '6px 0 0', color: '#4B5563', fontSize: '15px', fontWeight: '600' }}>
              Welcome, {user?.name || user?.username || 'Student'} ({user?.email || currentUserAccount?.email || 'student@student.csulb.edu'})
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowAuthModal(true)}
            style={{ padding: '10px 16px', background: '#334151', color: '#F8FAFC', border: '1px solid #475569', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            {currentUserAccount ? `👤 ${currentUserAccount.username} (${currentUserAccount.role})` : '🔐 Account & Profile'}
          </button>

          <button 
            onClick={() => { setShowOcrUploader(!showOcrUploader); setShowIcsUploader(false); setShowManualForm(false); }}
            style={{ padding: '10px 16px', background: '#141414', color: '#FFC72C', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            {showOcrUploader ? 'Close OCR' : '📷 OCR'}
          </button>

          <button 
            onClick={() => { setShowIcsUploader(!showIcsUploader); setShowOcrUploader(false); setShowManualForm(false); }}
            style={{ padding: '10px 16px', background: '#141414', color: '#FFC72C', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            {showIcsUploader ? 'Close .ics' : '📅 .ics'}
          </button>

          <button 
            onClick={() => { setShowManualForm(!showManualForm); setShowOcrUploader(false); setShowIcsUploader(false); }}
            style={{ padding: '10px 16px', background: '#374151', color: '#ffffff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            {showManualForm ? 'Close Form' : '✏️ Add'}
          </button>

          <button 
            onClick={handleLogout}
            style={{ padding: '10px 16px', background: '#DC2626', color: '#ffffff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800', fontSize: '13px', boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {showOcrUploader && <ScheduleUploader onUploadSuccess={handleSyncSuccess} />}
      {showIcsUploader && <ICSUploader onUploadSuccess={handleSyncSuccess} />}
      {showManualForm && <ScheduleUploadForm onUploadSuccess={handleSyncSuccess} />}

      {/* Navigation Tabs Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{ padding: '10px 18px', background: activeTab === 'dashboard' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'dashboard' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          📊 Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          style={{ padding: '10px 18px', background: activeTab === 'schedule' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'schedule' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          📅 Schedule
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          style={{ padding: '10px 18px', background: activeTab === 'map' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'map' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          🗺️ Campus Map
        </button>
        <button 
          onClick={() => setActiveTab('indoor')}
          style={{ padding: '10px 18px', background: activeTab === 'indoor' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'indoor' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          🏢 Indoor Navigator
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          style={{ padding: '10px 18px', background: activeTab === 'directory' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'directory' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          🤝 Basic Needs
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ padding: '10px 18px', background: activeTab === 'profile' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'profile' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          👤 Profile
        </button>
        <button 
          onClick={() => setActiveTab('about')}
          style={{ padding: '10px 18px', background: activeTab === 'about' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'about' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          ℹ️ About
        </button>
      </div>

      {/* Render Active Tab Content */}
      <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '1.25rem', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        {activeTab === 'dashboard' && <PersonalDashboard />}
        {activeTab === 'schedule' && <ScheduleViewer key={scheduleRefreshKey} />}
        {activeTab === 'map' && <CampusMap />}
        {activeTab === 'indoor' && <IndoorNavigator />}
        {activeTab === 'directory' && <BasicNeedsDirectory />}
        {activeTab === 'profile' && <ProfilePage onUpdate={(updated) => {
          setUser((prev: any) => {
            const updatedUser = { ...prev, name: updated.name };
            localStorage.setItem('sso_user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }} />}
        {activeTab === 'about' && <AboutPage />}
      </div>

      {/* Modal View for Auth & Profile Manager */}
      {showAuthModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <AuthAndProfileModal
            currentUser={currentUserAccount}
            onLoginSuccess={(account) => {
              syncAuthenticatedUser(
                {
                  account,
                  user: {
                    ...user,
                    email: account.email || user?.email || currentUserAccount?.email,
                    name: account.username,
                    username: account.username,
                    role: account.role,
                  },
                },
                user?.email || currentUserAccount?.email
              );
              setShowAuthModal(false);
            }}
            onLogout={() => {
              setCurrentUserAccount(null);
              setShowAuthModal(false);
            }}
            onBack={() => setShowAuthModal(false)}
          />
        </div>
      )}
    </div>
  );
}