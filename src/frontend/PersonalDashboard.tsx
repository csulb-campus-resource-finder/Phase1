import React, { useState } from 'react';

interface SavedLocation {
  id: string;
  name: string;
  category: string;
  note: string;
}

export const PersonalDashboard: React.FC = () => {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([
    { id: 'lib', name: 'University Library', category: 'Study', note: 'Level 3 quiet study carrel near power outlet' },
    { id: 'g2', name: 'G2 Parking Lot', category: 'Parking', note: 'Best permit parking spot close to Walter Pyramid' },
    { id: 'usu', name: 'University Student Union', category: 'Food', note: 'Quick Starbucks pickup between classes' }
  ]);

  const [perkPoints, setPerkPoints] = useState<number>(340);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [accessibilityHighContrast, setAccessibilityHighContrast] = useState<boolean>(false);

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#1A1A1A' }}>
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          CAMPUS RESOURCE FINDER
        </span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: '#002B49' }}>
          Personalized Dashboard
        </h2>
      </div>

      {/* Profile & Perks Overview Banner */}
      <div style={{ background: 'linear-gradient(135deg, #002B49 0%, #004070 100%)', borderRadius: '1.5rem', padding: '24px', color: '#FFFFFF', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0,43,73,0.3)' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#FFC72C', textTransform: 'uppercase', letterSpacing: '1px' }}>CSULB Student Account</span>
          <h3 style={{ margin: '6px 0 4px 0', fontSize: '24px', fontWeight: '900' }}>Nadhirah Michael-Ho</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#E5E7EB' }}>Bachelor of Science in Computer Science (Expected Grad: May 2027)</p>
        </div>
        <div style={{ background: 'rgba(255, 199, 44, 0.155)', border: '2px solid #FFC72C', borderRadius: '1rem', padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#FFC72C', textTransform: 'uppercase' }}>Beach Perks Balance</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFC72C' }}>{perkPoints} pts</div>
        </div>
      </div>

      {/* Grid Layout for Saved Locations & Preferences */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Saved Locations Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '1.5rem', padding: '24px', border: '1.5px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '900', color: '#002B49' }}>
            📌 Saved Locations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {savedLocations.map(loc => (
              <div key={loc.id} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '900', color: '#002B49', fontSize: '15px' }}>{loc.name}</div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>{loc.note}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '1rem' }}>
                  {loc.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Preferences & Settings Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '1.5rem', padding: '24px', border: '1.5px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '900', color: '#002B49' }}>
              ⚙️ Preferences & Settings
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '15px', color: '#374151' }}>
                <span>🔔 Real-Time Parking & Crowd Alerts</span>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled} 
                  onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                  style={{ width: '20px', height: '20px', accentColor: '#002B49', cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '15px', color: '#374151' }}>
                <span>♿ High Contrast Accessibility Mode</span>
                <input 
                  type="checkbox" 
                  checked={accessibilityHighContrast} 
                  onChange={() => setAccessibilityHighContrast(!accessibilityHighContrast)}
                  style={{ width: '20px', height: '20px', accentColor: '#002B49', cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>

          <button 
            onClick={() => alert('Preferences successfully updated!')}
            style={{
              marginTop: '24px',
              width: '100%',
              background: '#002B49',
              color: '#FFC72C',
              border: 'none',
              borderRadius: '1rem',
              padding: '14px',
              fontWeight: '900',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  );
};