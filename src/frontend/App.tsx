import React, { useState, useEffect } from 'react';
import { LoginPortal } from './LoginPortal';
import { CampusMap } from './CampusMap';
import { ScheduleViewer } from './ScheduleViewer';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

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

  // If not authenticated, ONLY show the Login Portal
  if (!token) {
    return (
      <LoginPortal 
        onLoginSuccess={(newToken, newUser) => { 
          setToken(newToken); 
          setUser(newUser); 
        }} 
      />
    );
  }

  // Once authenticated, show the dashboard header, schedule, and map
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
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

      {/* Student Schedule & Live Status Tracker */}
      <ScheduleViewer />

      {/* Interactive Concept3D Map */}
      <CampusMap />
    </div>
  );
}