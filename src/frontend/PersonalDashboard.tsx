import React, { useState, useEffect } from 'react';

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

  // Profile name and details state
  const [studentName, setStudentName] = useState<string>('Nadhirah Michael-Ho');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('Nadhirah Michael-Ho');

  const [perkPoints, setPerkPoints] = useState<number>(340);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [accessibilityHighContrast, setAccessibilityHighContrast] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New location form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Study');
  const [newNote, setNewNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Load user name and session data on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('sso_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.name) {
          setStudentName(parsed.name);
          setTempName(parsed.name);
        }
      }
    } catch (e) {
      console.error('Failed to load user profile from storage', e);
    }
  }, []);

  // Handle saving updated student name
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;

    setStudentName(tempName);
    setIsEditingName(false);

    // Update localStorage sso_user to sync across app header and views
    try {
      const storedUser = localStorage.getItem('sso_user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};
      const updatedUser = { ...parsedUser, name: tempName };
      localStorage.setItem('sso_user', JSON.stringify(updatedUser));
    } catch (e) {}

    setStatusMessage('✅ Student name updated successfully!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle adding a location
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newLoc: SavedLocation = {
      id: Date.now().toString(),
      name: newName,
      category: newCategory,
      note: newNote || 'No additional notes'
    };

    setSavedLocations([...savedLocations, newLoc]);
    setNewName('');
    setNewNote('');
    setShowAddForm(false);
    setStatusMessage('✅ Location successfully added!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle deleting a location
  const handleDeleteLocation = (id: string) => {
    setSavedLocations(savedLocations.filter(loc => loc.id !== id));
    setStatusMessage('🗑️ Location removed.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle redeeming perk points
  const handleRedeemPoints = () => {
    if (perkPoints < 100) {
      alert('You need at least 100 Beach Perks points to redeem a reward!');
      return;
    }
    setPerkPoints(prev => prev - 100);
    setStatusMessage('🎉 Successfully redeemed 100 Beach Perks points for a campus reward voucher!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handle saving preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('⚙️ Preferences and accessibility settings saved successfully!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Dynamic theme variables based on high contrast mode
  const cardBg = accessibilityHighContrast ? '#121212' : '#FFFFFF';
  const textColor = accessibilityHighContrast ? '#FFFFFF' : '#1A1A1A';
  const borderColor = accessibilityHighContrast ? '#FFFFFF' : '#E5E7EB';

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto', color: textColor, background: accessibilityHighContrast ? '#000000' : 'transparent', minHeight: '100vh', transition: 'all 0.3s ease' }}>
      
      {/* Top Banner / Notification Feedback */}
      {statusMessage && (
        <div style={{ background: '#ECFDF5', color: '#065F46', padding: '12px 18px', borderRadius: '1rem', fontSize: '14px', marginBottom: '20px', border: '1px solid #A7F3D0', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '900', color: '#065F46' }}>✕</button>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          CAMPUS RESOURCE FINDER
        </span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: accessibilityHighContrast ? '#FFC72C' : '#002B49' }}>
          Personalized Dashboard
        </h2>
      </div>

      {/* Profile & Perks Overview Banner */}
      <div style={{ background: 'linear-gradient(135deg, #002B49 0%, #004070 100%)', borderRadius: '1.5rem', padding: '24px', color: '#FFFFFF', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0,43,73,0.3)', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#FFC72C', textTransform: 'uppercase', letterSpacing: '1px' }}>CSULB Student Account</span>
          
          {!isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>{studentName}</h3>
              <button 
                onClick={() => setIsEditingName(true)} 
                style={{ background: 'rgba(255,255,255,0.15)', color: '#FFC72C', border: '1px solid rgba(255,199,44,0.4)', borderRadius: '0.5rem', padding: '4px 10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                title="Edit Name"
              >
                ✏️ Edit Name
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveName} style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '6px', alignItems: 'center' }}>
              <input 
                type="text" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)} 
                style={{ padding: '6px 12px', borderRadius: '0.5rem', border: '1px solid #FFC72C', fontSize: '16px', fontWeight: '700', background: '#FFFFFF', color: '#111827' }}
                autoFocus
                required
              />
              <button type="submit" style={{ background: '#FFC72C', color: '#002B49', border: 'none', borderRadius: '0.5rem', padding: '7px 12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>
                Save
              </button>
              <button type="button" onClick={() => { setIsEditingName(false); setTempName(studentName); }} style={{ background: 'transparent', color: '#E5E7EB', border: '1px solid #9CA3AF', borderRadius: '0.5rem', padding: '7px 10px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
            </form>
          )}

          <p style={{ margin: 0, fontSize: '14px', color: '#E5E7EB' }}>Bachelor of Science in Computer Science (Expected Grad: May 2027)</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 199, 44, 0.155)', border: '2px solid #FFC72C', borderRadius: '1rem', padding: '16px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#FFC72C', textTransform: 'uppercase' }}>Beach Perks Balance</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFC72C' }}>{perkPoints} pts</div>
          </div>
          <button 
            onClick={handleRedeemPoints}
            style={{ background: '#FFC72C', color: '#002B49', border: 'none', borderRadius: '1rem', padding: '16px 20px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
            title="Redeem 100 points for campus rewards"
          >
            🎁 Redeem Perks
          </button>
        </div>
      </div>

      {/* Grid Layout for Saved Locations & Preferences */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Saved Locations Card */}
        <div style={{ background: cardBg, borderRadius: '1.5rem', padding: '24px', border: `1.5px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: accessibilityHighContrast ? '#FFFFFF' : '#002B49' }}>
              📌 Saved Locations
            </h3>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ background: '#002B49', color: '#FFC72C', border: 'none', borderRadius: '0.75rem', padding: '6px 12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
            >
              {showAddForm ? 'Cancel' : '+ Add Location'}
            </button>
          </div>

          {/* Add Location Form Toggle */}
          {showAddForm && (
            <form onSubmit={handleAddLocation} style={{ background: '#F3F4F6', padding: '16px', borderRadius: '1rem', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Location Name (e.g., ECS 302)" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                required 
                style={{ padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', fontSize: '14px', background: '#FFFFFF' }}
              >
                <option value="Study">Study</option>
                <option value="Parking">Parking</option>
                <option value="Food">Food</option>
                <option value="Emergency">Emergency</option>
              </select>
              <input 
                type="text" 
                placeholder="Note (e.g., Near power outlet)" 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)} 
                style={{ padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
              <button 
                type="submit" 
                style={{ background: '#002B49', color: '#FFC72C', border: 'none', borderRadius: '0.5rem', padding: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                Save Location
              </button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
            {savedLocations.length === 0 ? (
              <p style={{ color: '#6B7280', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No saved locations yet. Add one above!</p>
            ) : (
              savedLocations.map(loc => (
                <div key={loc.id} style={{ background: accessibilityHighContrast ? '#1F2937' : '#F9FAFB', border: `1px solid ${borderColor}`, borderRadius: '1rem', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ paddingRight: '10px' }}>
                    <div style={{ fontWeight: '900', color: accessibilityHighContrast ? '#FFFFFF' : '#002B49', fontSize: '15px' }}>{loc.name}</div>
                    <div style={{ fontSize: '12px', color: accessibilityHighContrast ? '#D1D5DB' : '#4B5563', marginTop: '2px' }}>{loc.note}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '1rem' }}>
                      {loc.category}
                    </span>
                    <button 
                      onClick={() => handleDeleteLocation(loc.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', fontWeight: '900', cursor: 'pointer', fontSize: '16px' }}
                      title="Delete location"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Preferences & Settings Card */}
        <form onSubmit={handleSavePreferences} style={{ background: cardBg, borderRadius: '1.5rem', padding: '24px', border: `1.5px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '900', color: accessibilityHighContrast ? '#FFFFFF' : '#002B49' }}>
              ⚙️ Preferences & Settings
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '15px', color: accessibilityHighContrast ? '#E5E7EB' : '#374151' }}>
                <span>🔔 Real-Time Parking & Crowd Alerts</span>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled} 
                  onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                  style={{ width: '22px', height: '22px', accentColor: '#002B49', cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '15px', color: accessibilityHighContrast ? '#E5E7EB' : '#374151' }}>
                <span>♿ High Contrast Accessibility Mode</span>
                <input 
                  type="checkbox" 
                  checked={accessibilityHighContrast} 
                  onChange={() => setAccessibilityHighContrast(!accessibilityHighContrast)}
                  style={{ width: '22px', height: '22px', accentColor: '#002B49', cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>

          <button 
            type="submit"
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
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            Save Preferences
          </button>
        </form>

      </div>
    </div>
  );
};