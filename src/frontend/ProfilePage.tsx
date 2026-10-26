// Imports React and hooks for state management and side effects.
import React, { useState, useEffect } from 'react';

// Interface representing the enhanced user profile structure.
interface UserProfile {
  name: string;
  email: string;
  major: string;
  standing: string;
  bio: string;
  phoneNumber: string;
  profilePicture: string;
  githubUrl: string;
  linkedinUrl: string;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    major: 'Computer Science',
    standing: 'Undergraduate (Senior)',
    bio: 'CSULB student building tools for the Beach community.',
    phoneNumber: '',
    profilePicture: '',
    githubUrl: '',
    linkedinUrl: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('sso_token');
        const res = await fetch('/api/v1/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle standard input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle profile picture file selection and upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setUploadingAvatar(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('sso_token');
      const res = await fetch('/api/v1/profile/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(prev => ({ ...prev, profilePicture: data.profilePicture }));
        setMessage('Profile picture updated successfully!');
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload avatar.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile updates
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem('sso_token');
      const res = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });

      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#6B7280' }}>Loading profile...</div>;
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '1rem', padding: '28px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '750px', margin: '0 auto' }}>
      
      {/* Header & Avatar Preview Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', borderBottom: '2px solid #F3F4F6', paddingBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          {profile.profilePicture ? (
            <img 
              src={profile.profilePicture} 
              alt="Profile Avatar" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFC72C', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} 
            />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#002B49', color: '#FFC72C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900', border: '3px solid #FFC72C' }}>
              {profile.name ? profile.name.charAt(0) : 'S'}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: '#002B49', fontSize: '22px', fontWeight: '900' }}>Student Profile</h2>
          <p style={{ margin: '4px 0 12px', color: '#6B7280', fontSize: '14px', fontWeight: '600' }}>Manage your personal details, developer links, and avatar</p>
          
          <label style={{ display: 'inline-block', background: '#F3F4F6', color: '#1F2937', padding: '8px 14px', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '800', fontSize: '13px', border: '1px solid #D1D5DB' }}>
            {uploadingAvatar ? 'Uploading...' : '📷 Change Profile Picture'}
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {message && (
        <div style={{ background: '#ECFDF5', color: '#065F46', padding: '12px 16px', borderRadius: '0.75rem', fontSize: '14px', marginBottom: '20px', border: '1px solid #A7F3D0', fontWeight: '700' }}>
          ✅ {message}
        </div>
      )}

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: '0.75rem', fontSize: '14px', marginBottom: '20px', border: '1px solid #FCA5A5', fontWeight: '700' }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>Full Name</label>
          <input 
            type="text" 
            name="name" 
            value={profile.name} 
            onChange={handleChange} 
            required 
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>CSULB Student Email (Read-Only)</label>
          <input 
            type="email" 
            value={profile.email} 
            disabled 
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '0.75rem', fontSize: '15px', background: '#F3F4F6', boxSizing: 'border-box', color: '#9CA3AF', fontWeight: '600' }} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>Major / Program</label>
            <input 
              type="text" 
              name="major" 
              value={profile.major} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>Academic Standing</label>
            <input 
              type="text" 
              name="standing" 
              value={profile.standing} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937' }} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>GitHub Profile URL</label>
            <input 
              type="url" 
              name="githubUrl" 
              value={profile.githubUrl} 
              onChange={handleChange} 
              placeholder="https://github.com/username" 
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>LinkedIn Profile URL</label>
            <input 
              type="url" 
              name="linkedinUrl" 
              value={profile.linkedinUrl} 
              onChange={handleChange} 
              placeholder="https://linkedin.com/in/username" 
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937' }} 
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>Mobile Phone (for SMS 2FA)</label>
          <input 
            type="tel" 
            name="phoneNumber" 
            value={profile.phoneNumber} 
            onChange={handleChange} 
            placeholder="(555) 000-0000" 
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937' }} 
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#002B49', marginBottom: '6px' }}>Bio / About Me</label>
          <textarea 
            name="bio" 
            rows={3} 
            value={profile.bio} 
            onChange={handleChange} 
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #D1D5DB', borderRadius: '0.75rem', fontSize: '15px', background: '#F9FAFB', boxSizing: 'border-box', fontWeight: '600', color: '#1F2937', fontFamily: 'inherit' }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          style={{ background: '#002B49', color: '#FFC72C', padding: '14px 20px', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '900', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,43,73,0.2)', marginTop: '8px' }}
        >
          {saving ? 'Saving Profile...' : '💾 Save Profile Changes'}
        </button>
      </form>
    </div>
  );
}