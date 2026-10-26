// Imports React and hooks for state management and side effects.
import React, { useState, useEffect } from 'react';
// Imports the LoginPortal component for authentication.
import { LoginPortal } from './LoginPortal';
// Imports the CampusMap component for the interactive Concept3D map.
import { CampusMap } from './CampusMap';
// Imports the ScheduleViewer component to display student class timetables.
import { ScheduleViewer } from './ScheduleViewer';

// Defines an interface for parsed OCR classes.
interface ParsedClass {
  course_code: string;
  time_window: string;
  location: string;
}

// Defines a sub-component for automatically uploading schedule images via OCR.
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
    <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>Upload Schedule Screenshot (OCR Sync)</h3>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
        Upload a screenshot of your Student Center schedule to automatically extract and sync your classes.
      </p>

      <input
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
        style={{ display: 'block', width: '100%', fontSize: '14px', marginBottom: '12px' }}
      />

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{ 
          background: '#002b49', 
          color: '#fff', 
          padding: '10px 16px', 
          border: 'none', 
          borderRadius: '6px', 
          cursor: 'pointer', 
          fontWeight: 'bold',
          opacity: (!file || loading) ? 0.5 : 1 
        }}
      >
        {loading ? 'Processing OCR & Syncing...' : '📸 Upload & Sync Schedule'}
      </button>

      {error && <p style={{ marginTop: '10px', fontSize: '14px', color: '#ef4444', fontWeight: 'bold' }}>{error}</p>}

      {classes.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>Successfully Synced Classes:</h4>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
            {classes.map((cls, idx) => (
              <li key={idx} style={{ fontSize: '13px', color: '#4b5563', marginBottom: '4px' }}>
                <strong>{cls.course_code}</strong> — {cls.time_window} ({cls.location})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Defines a sub-component for manually adding custom classes to the student schedule.
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
      // Updated to relative path for phone/local network compatibility through Vite proxy
      const res = await fetch('/api/schedules/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Class added successfully!');
        setCourseCode('');
        setCourseName('');
        onUploadSuccess();
      } else {
        alert('Failed to add class.');
      }
    } catch (err) {
      console.error('Error adding course:', err);
      alert('Network error while adding class.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>Add Custom Class to Schedule</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <input placeholder="Course Code (e.g. CECS 323)" value={courseCode} onChange={e => setCourseCode(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input placeholder="Course Name (e.g. Database)" value={courseName} onChange={e => setCourseName(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input placeholder="Days (Mon,Wed,Tue,Thu)" value={days} onChange={e => setDays(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input placeholder="Start Time (09:30)" value={startTime} onChange={e => setStartTime(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input placeholder="End Time (10:45)" value={endTime} onChange={e => setEndTime(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input placeholder="Building (ECS)" value={building} onChange={e => setBuilding(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input placeholder="Room (311)" value={room} onChange={e => setRoom(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
      </div>
      <button type="submit" style={{ background: '#002b49', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
        ➕ Save Class to Schedule
      </button>
    </form>
  );
}

// Defines and exports the root App functional component.
export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('sso_token');
    const savedUser = localStorage.getItem('sso_user');
    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sso_token');
    localStorage.removeItem('sso_user');
    setToken(null);
    setUser(null);
  };

  const handleSyncSuccess = () => {
    alert('Schedule update complete! Refreshing...');
    window.location.reload();
  };

  if (!token) {
    return (
      <LoginPortal 
        onLoginSuccess={(data) => { 
          setToken(data.token); 
          setUser(data.user); 
          localStorage.setItem('sso_token', data.token);
          localStorage.setItem('sso_user', JSON.stringify(data.user));
        }} 
      />
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Dashboard header section containing app title, user greeting, and action buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        borderBottom: '1px solid #e5e7eb', 
        paddingBottom: '15px' 
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#1f2937' }}>CSULB Campus Resource Finder</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Welcome, {user?.name || 'Student'} ({user?.email})
          </p>
        </div>

        {/* Navigation and action buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowUploader(!showUploader)}
            style={{ 
              padding: '8px 14px', 
              background: '#2563eb', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            {showUploader ? 'Close OCR Uploader' : '📷 Upload Schedule Image'}
          </button>

          <button 
            onClick={() => setShowManualForm(!showManualForm)}
            style={{ 
              padding: '8px 14px', 
              background: '#4b5563', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            {showManualForm ? 'Close Add Form' : '✏️ Add Class Manually'}
          </button>

          <button 
            onClick={handleLogout}
            style={{ 
              padding: '8px 14px', 
              background: '#ef4444', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Conditionally renders the OCR Schedule Uploader */}
      {showUploader && <ScheduleUploader onUploadSuccess={handleSyncSuccess} />}

      {/* Conditionally renders the manual class form */}
      {showManualForm && <ScheduleUploadForm onUploadSuccess={handleSyncSuccess} />}

      {/* Student schedule and live status tracker component */}
      <ScheduleViewer />

      {/* Interactive Concept3D campus map component */}
      <CampusMap />
    </div>
  );
}