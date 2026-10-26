// Imports the React library along with useState and useEffect hooks from 'react'.
import React, { useState, useEffect } from 'react';
// Imports the LoginPortal component used for handling user sign-in interfaces.
import { LoginPortal } from './LoginPortal';
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

  // MFA state hooks
  const [requiresMfaChoice, setRequiresMfaChoice] = useState(false);
  const [mfaChoiceChallenge, setMfaChoiceChallenge] = useState<string | null>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [requiresMFASetup, setRequiresMFASetup] = useState(false);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [mfaError, setMfaError] = useState('');

  const [requiresPhoneInput, setRequiresPhoneInput] = useState(false);
  const [phoneInputUserId, setPhoneInputUserId] = useState<string | null>(null);
  const [phoneNumberToSubmit, setPhoneNumberToSubmit] = useState('');
  const [phoneInputError, setPhoneInputError] = useState('');

  const [requiresSmsMfa, setRequiresSmsMfa] = useState(false);
  const [smsUserId, setSmsUserId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState('');
  const [smsCodeInput, setSmsCodeInput] = useState('');
  const [smsError, setSmsError] = useState('');

  // Navigation & Form Toggle states (added 'indoor', 'directory', 'dashboard' tabs)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'map' | 'indoor' | 'directory' | 'profile' | 'about'>('dashboard');
  const [showManualForm, setShowManualForm] = useState(false);
  const [showOcrUploader, setShowOcrUploader] = useState(false);
  const [showIcsUploader, setShowIcsUploader] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  useEffect(() => {
    const savedToken = localStorage.getItem('sso_token');
    const savedUser = localStorage.getItem('sso_user');
    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLoginResponse = (data: any) => {
    if (data.requiresMfaChoice) {
      setRequiresMfaChoice(true);
      setMfaChoiceChallenge(data.challenge || 'fallback-challenge');
    } else if (data.requiresPhoneInput) {
      setRequiresPhoneInput(true);
      setPhoneInputUserId(data.userId);
    } else if (data.requiresSmsMfa) {
      setRequiresSmsMfa(true);
      setSmsUserId(data.userId);
      setMaskedPhone(data.maskedPhone);
    } else if (data.requiresMFA) {
      setRequiresMFA(true);
      setMfaChallenge(data.challenge);
    } else if (data.requiresMFASetup) {
      setToken(data.token);
      setUser(data.user);
      setRequiresMFASetup(true);
    } else {
      localStorage.setItem('sso_token', data.token);
      localStorage.setItem('sso_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
  };

  const handleVerifyLoginMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    try {
      const res = await fetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: mfaChallenge, code: mfaCodeInput })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('sso_token', data.token);
        localStorage.setItem('sso_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setRequiresMFA(false);
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
    setMfaChoiceChallenge(null);
    setRequiresMFA(false);
    setMfaChallenge(null);
    setRequiresMFASetup(false);
    setRequiresPhoneInput(false);
    setRequiresSmsMfa(false);
  };

  const handleSyncSuccess = () => {
    setScheduleRefreshKey(prev => prev + 1);
    setShowManualForm(false);
    setShowOcrUploader(false);
    setShowIcsUploader(false);
  };

  // Conditional Rendering Screen 0: MFA Choice Selection View
  if (requiresMfaChoice) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '2.5rem', background: '#FFFFFF', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', fontFamily: 'system-ui, sans-serif', textAlign: 'center', border: '1px solid #E5E7EB' }}>
        <h2 style={{ color: '#111827', marginTop: 0, fontSize: '24px', fontWeight: '800' }}>Choose Verification Method</h2>
        <p style={{ color: '#4B5563', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>Select how you would like to receive your verification code.</p>
        
        <button 
          onClick={async () => {
            try {
              const res = await fetch('/api/auth/mfa/choose-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challenge: mfaChoiceChallenge, method: 'sms' })
              });
              const data = await res.json();
              if (res.ok && data.requiresSmsMfa) {
                setRequiresMfaChoice(false);
                setRequiresSmsMfa(true);
                setSmsUserId(data.userId);
                setMaskedPhone(data.maskedPhone || '••••');
              } else {
                alert(data.error || 'Failed to trigger SMS.');
              }
            } catch (err) {
              alert('Network error connecting to server.');
            }
          }}
          style={{ width: '100%', background: '#141414', color: '#FFC72C', padding: '14px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          📱 Send SMS Code
        </button>

        <button 
          onClick={async () => {
            try {
              const res = await fetch('/api/auth/mfa/choose-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challenge: mfaChoiceChallenge, method: 'totp' })
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
      </div>
    );
  }

  // Conditional Rendering Screen 1: Phone Number Entry Prompt View
  if (requiresPhoneInput) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '2.5rem', background: '#FFFFFF', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', fontFamily: 'system-ui, sans-serif', border: '1px solid #E5E7EB' }}>
        <h2 style={{ color: '#111827', marginTop: 0, fontSize: '24px', fontWeight: '800' }}>Enter Phone Number</h2>
        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>Please enter your mobile phone number to receive your SMS login verification code.</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setPhoneInputError('');
          try {
            const res = await fetch('/api/auth/mfa/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: phoneInputUserId, phoneNumber: phoneNumberToSubmit })
            });
            const result = await res.json();
            if (res.ok && result.requiresSmsMfa) {
              setRequiresPhoneInput(false);
              setRequiresSmsMfa(true);
              setSmsUserId(result.userId);
              setMaskedPhone(result.maskedPhone);
            } else {
              setPhoneInputError(result.error || 'Failed to send SMS verification code.');
            }
          } catch (err) {
            setPhoneInputError('Network error connecting to server.');
          }
        }}>
          <input
            type="tel"
            value={phoneNumberToSubmit}
            onChange={e => setPhoneNumberToSubmit(e.target.value)}
            placeholder="(555) 000-0000"
            required
            autoFocus
            style={{ width: '100%', padding: '14px', fontSize: '16px', marginBottom: '18px', boxSizing: 'border-box', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', background: '#F9FAFB' }}
          />
          <button type="submit" style={{ width: '100%', background: '#FFC72C', color: '#111827', padding: '14px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(255,199,44,0.3)' }}>
            Send Verification SMS
          </button>
        </form>
        {phoneInputError && <p style={{ color: '#DC2626', fontSize: '14px', marginTop: '12px', textAlign: 'center', fontWeight: 'bold' }}>⚠️ {phoneInputError}</p>}
      </div>
    );
  }

  // Conditional Rendering Screen 2: SMS Verification Code Entry View
  if (requiresSmsMfa) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '2.5rem', background: '#FFFFFF', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', fontFamily: 'system-ui, sans-serif', border: '1px solid #E5E7EB' }}>
        <h2 style={{ color: '#111827', marginTop: 0, fontSize: '24px', fontWeight: '800' }}>SMS Authentication</h2>
        <p style={{ color: '#4B5563', fontSize: '15px', lineHeight: '1.5', marginBottom: '20px' }}>We sent a 6-digit verification code to your phone ending in <b>{maskedPhone}</b>.</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setSmsError('');
          try {
            const res = await fetch('/api/auth/mfa/verify-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: smsUserId, code: smsCodeInput })
            });
            const result = await res.json();
            if (res.ok) {
              localStorage.setItem('sso_token', result.token);
              localStorage.setItem('sso_user', JSON.stringify(result.user));
              setToken(result.token);
              setUser(result.user);
              setRequiresSmsMfa(false);
            } else {
              setSmsError(result.error || 'Invalid code');
            }
          } catch (err) {
            setSmsError('Network error verifying code.');
          }
        }}>
          <input
            value={smsCodeInput}
            onChange={e => setSmsCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            autoFocus
            style={{ width: '100%', padding: '14px', fontSize: '20px', textAlign: 'center', letterSpacing: '4px', marginBottom: '18px', boxSizing: 'border-box', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', background: '#F9FAFB' }}
          />
          <button type="submit" style={{ width: '100%', background: '#FFC72C', color: '#111827', padding: '14px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(255,199,44,0.3)' }}>
            Verify & Sign In
          </button>
        </form>
        {smsError && <p style={{ color: '#DC2626', fontSize: '14px', marginTop: '12px', textAlign: 'center', fontWeight: 'bold' }}>⚠️ {smsError}</p>}
      </div>
    );
  }

  // Conditional Rendering Screen 3: TOTP Authenticator Challenge Prompt View
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

  // Conditional Rendering Screen 4: Initial MFA Setup (QR Code Scanning) View
  if (token && requiresMFASetup) {
    return (
      <MFASetup 
        token={token} 
        onSetupSuccess={(newToken) => {
          localStorage.setItem('sso_token', newToken);
          setRequiresMFASetup(false);
          window.location.reload();
        }} 
      />
    );
  }

  // Conditional Rendering Screen 5: Login Portal View
  if (!token) {
    return (
      <LoginPortal 
        onLoginSuccess={(data) => {
          handleLoginResponse(data);
        }} 
      />
    );
  }

  // Conditional Rendering Screen 6: Main Dashboard & Tab Views (Styled with Campus Background Image & Color Palette)
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
              Welcome, {user?.name || 'Student'} ({user?.email})
            </p>
          </div>
        </div>

        {/* Action buttons matching screenshot styling */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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

      {/* Conditional Uploaders / Forms */}
      {showOcrUploader && <ScheduleUploader onUploadSuccess={handleSyncSuccess} />}
      {showIcsUploader && <ICSUploader onUploadSuccess={handleSyncSuccess} />}
      {showManualForm && <ScheduleUploadForm onUploadSuccess={handleSyncSuccess} />}

      {/* Navigation Tabs Bar matching Screenshot pill buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{
            background: activeTab === 'dashboard' ? '#141414' : '#FFFFFF',
            color: activeTab === 'dashboard' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'dashboard' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          📊 Dashboard
        </button>

        <button 
          onClick={() => setActiveTab('schedule')}
          style={{
            background: activeTab === 'schedule' ? '#141414' : '#FFFFFF',
            color: activeTab === 'schedule' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'schedule' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          📅 Schedule
        </button>

        <button 
          onClick={() => setActiveTab('map')}
          style={{
            background: activeTab === 'map' ? '#141414' : '#FFFFFF',
            color: activeTab === 'map' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'map' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          🗺️ Campus Map
        </button>

        <button 
          onClick={() => setActiveTab('indoor')}
          style={{
            background: activeTab === 'indoor' ? '#141414' : '#FFFFFF',
            color: activeTab === 'indoor' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'indoor' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          🏢 Indoor Navigator
        </button>

        <button 
          onClick={() => setActiveTab('directory')}
          style={{
            background: activeTab === 'directory' ? '#141414' : '#FFFFFF',
            color: activeTab === 'directory' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'directory' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          🤝 Directory
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          style={{
            background: activeTab === 'profile' ? '#141414' : '#FFFFFF',
            color: activeTab === 'profile' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'profile' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          👤 Profile
        </button>

        <button 
          onClick={() => setActiveTab('about')}
          style={{
            background: activeTab === 'about' ? '#141414' : '#FFFFFF',
            color: activeTab === 'about' ? '#FFC72C' : '#111827',
            border: '2px solid #141414',
            padding: '10px 18px',
            borderRadius: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'about' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
          }}
        >
          ℹ️ About
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div>
        {activeTab === 'dashboard' && <PersonalDashboard />}
        {activeTab === 'schedule' && <ScheduleViewer key={scheduleRefreshKey} />}
        {activeTab === 'map' && <CampusMap />}
        {activeTab === 'indoor' && <IndoorNavigator />}
        {activeTab === 'directory' && <BasicNeedsDirectory />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'about' && <AboutPage />}
      </div>
    </div>
  );
}