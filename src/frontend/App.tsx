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
// Phase 2 feature imports
import { SellerChatModal } from '../SellerChatModal.js';
import { EventsAndClubsService, CampusEvent, StudentClub } from '../events/eventsService.js';
// At top of App.tsx with your other imports:
import {
  LiveEventsService,
  CSULBEvent,
  CSULBOrganization,
  CSULB_ENGAGE_EVENTS_URL,
  CSULB_ENGAGE_ORGS_URL,
} from '../events/liveEventsService.js';
import { getActiveMarketplaceSession, buildMarketplaceHeaders } from '../utils/marketplaceAuth.js';

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

// Phase 2 interfaces & RewardsEngine
interface Listing {
  id: number;
  seller_email: string;
  title: string;
  description: string;
  price: number;
  image_data: string | null;
  created_at: string;
}

export interface UserGamificationProfile {
  userId: string;
  points: number;
  badges: string[];
}

export interface RedeemableBadge {
  id: string;
  name: string;
  cost: number;
  icon: string;
  description: string;
  category: 'Badge' | 'Reward' | 'Physical Award';
}

export class RewardsEngine {
  private profiles: Map<string, UserGamificationProfile> = new Map();

  private catalog: RedeemableBadge[] = [
    { id: 'b1', name: 'Campus VIP', cost: 150, icon: '🌟', description: 'Exclusive badge highlighting top community contributors.', category: 'Badge' },
    { id: 'b2', name: 'Night Owl Coder', cost: 200, icon: '💻', description: 'Awarded for late-night commits and repository updates.', category: 'Badge' },
    { id: 'b3', name: 'Beach Legend', cost: 350, icon: '🌴', description: 'Ultimate CSULB student status badge with priority perk multipliers.', category: 'Badge' },
    { id: 'b4', name: 'Hackathon Champion', cost: 250, icon: '⚡', description: 'Unlocked by building top-tier campus projects and winning hackathons.', category: 'Badge' },
    { id: 'b5', name: 'Open Source Contributor', cost: 180, icon: '🌐', description: 'Recognizes active participation in student developer organizations and public repositories.', category: 'Badge' },
    { id: 'b6', name: "Dean's List Achiever", cost: 300, icon: '🎓', description: 'Showcases academic excellence and high cumulative GPA status.', category: 'Badge' },
    { id: 'b7', name: 'Peer Mentor', cost: 220, icon: '🤝', description: 'Awarded to tutors and mentors supporting fellow classmates.', category: 'Badge' },
    { id: 'r1', name: '$10 Campus Bookstore Gift Card', cost: 300, icon: '📚', description: 'Valid for textbooks, stationery, and CSULB merch.', category: 'Reward' },
    { id: 'r2', name: 'Free Coffee Pass at USU', cost: 100, icon: '☕', description: 'Enjoy a free artisan drink at the University Student Union.', category: 'Reward' },
    { id: 'p1', name: 'CSULB Branded Lanyard & ID Holder', cost: 120, icon: '🔑', description: 'Physical award pickup at the USU Information Desk.', category: 'Physical Award' },
    { id: 'p2', name: 'Stainless Steel Beach Water Bottle', cost: 250, icon: '🍼', description: 'Insulated campus water bottle to keep drinks cold all day.', category: 'Physical Award' },
    { id: 'p3', name: 'Official CSULB Embroidered Hoodie', cost: 600, icon: '🧥', description: 'Cozy gold & black campus hoodie for chilly lecture halls.', category: 'Physical Award' },
  ];

  private storageKey(userId: string): string {
    return `csulb_perk_points_${(userId || 'guest').trim().toLowerCase()}`;
  }

  public awardPoints(userId: string, points: number, _reason: string): UserGamificationProfile {
    const profile = this.getProfile(userId);
    profile.points += points;

    if (profile.points >= 400 && !profile.badges.includes('Community Pillar')) {
      profile.badges.push('Community Pillar');
    }
    if (profile.points >= 500 && !profile.badges.includes('Beach Legend')) {
      profile.badges.push('Beach Legend');
    }

    this.profiles.set(userId, profile);
    try {
      localStorage.setItem(this.storageKey(userId), String(profile.points));
    } catch {}
    return profile;
  }

  public getProfile(userId: string): UserGamificationProfile {
    const existing = this.profiles.get(userId);
    let points = existing ? existing.points : 345;
    try {
      const saved = localStorage.getItem(this.storageKey(userId));
      if (saved !== null && !Number.isNaN(Number(saved))) {
        points = Number(saved);
      }
    } catch {}
    const profile: UserGamificationProfile = existing
      ? { ...existing, points }
      : { userId, points, badges: ['New Student', 'Campus Helper'] };
    this.profiles.set(userId, profile);
    return profile;
  }

  public getCatalog(): RedeemableBadge[] {
    return this.catalog;
  }

  public purchaseItem(userId: string, itemId: string): { success: boolean; message: string; profile: UserGamificationProfile } {
    const profile = this.getProfile(userId);
    const item = this.catalog.find((i) => i.id === itemId);

    if (!item) {
      return { success: false, message: 'Item not found in catalog.', profile };
    }

    if (profile.points < item.cost) {
      return { success: false, message: `Insufficient points! You need ${item.cost} PTS but only have ${profile.points} PTS.`, profile };
    }

    profile.points -= item.cost;

    if (item.category === 'Badge' && !profile.badges.includes(item.name)) {
      profile.badges.push(item.name);
    }

    this.profiles.set(userId, profile);
    try {
      localStorage.setItem(this.storageKey(userId), String(profile.points));
    } catch {}
    return {
      success: true,
      message: `Successfully checked out "${item.name}"! Check your email for pickup/redemption instructions.`,
      profile,
    };
  }
}

const eventsService = new EventsAndClubsService();
const liveEventsService = new LiveEventsService();
const rewardsEngine = new RewardsEngine();

function CreateListingFormWithPhoto({
  defaultSellerEmail,
  currentUserRole,
  onBack,
  onPostSuccess,
}: {
  defaultSellerEmail: string;
  currentUserRole: string;
  onBack: () => void;
  onPostSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sellerEmail, setSellerEmail] = useState(defaultSellerEmail);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmail = (sellerEmail || defaultSellerEmail || getActiveMarketplaceSession()?.email || '')
      .trim()
      .toLowerCase();
    const effectiveRole = (currentUserRole || getActiveMarketplaceSession()?.role || '').trim();

    if (!effectiveEmail || !effectiveRole) {
      alert('You must be signed in with both an email address and a role to publish a listing.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const headers = buildMarketplaceHeaders(false);
      headers['x-user-email'] = effectiveEmail;
      headers['x-user-role'] = effectiveRole;

      const res = await fetch('/api/v1/marketplace/listings', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        rewardsEngine.awardPoints(effectiveEmail, 25, 'Published a marketplace listing with photo');
        alert('Listing published successfully with photo (+25 reward points earned)!');
        onPostSuccess();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to publish listing.');
      }
    } catch {
      alert('Network error publishing listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#FFFFFF', padding: '1.75rem', borderRadius: '1.25rem', marginBottom: '24px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '18px', fontWeight: '800' }}>🛍️ Create Marketplace Listing</h3>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#6B7280' }}>✕ Cancel</button>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>Seller Email Address</label>
        <input
          type="email"
          value={sellerEmail}
          onChange={(e) => setSellerEmail(e.target.value)}
          placeholder="seller@student.csulb.edu"
          required
          style={{ width: '100%', padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', boxSizing: 'border-box', background: '#F9FAFB' }}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>Item Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CSULB Textbook - CECS 323" required style={{ width: '100%', padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>Price ($)</label>
        <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45.00" required style={{ width: '100%', padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, pickup location on campus..." rows={3} style={{ width: '100%', padding: '10px', borderRadius: '0.5rem', border: '1px solid #D1D5DB', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#374151' }}>Upload Listing Photo</label>
        <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: '14px', width: '100%', padding: '8px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '0.5rem' }} />
        {imagePreview && (
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', height: '140px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }} />
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} style={{ width: '100%', background: '#FFC72C', color: '#111827', padding: '12px', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>
        {loading ? 'Publishing to NeonDB...' : 'Publish Listing'}
      </button>
    </form>
  );
}

function RewardsShopView({ profile, onCheckout }: { profile: UserGamificationProfile; onCheckout: (itemId: string) => void }) {
  const catalog = rewardsEngine.getCatalog();

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #002B49 0%, #004b7a 100%)', borderRadius: '1rem', padding: '2rem', color: '#FFFFFF', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <span style={{ background: '#FFC72C', color: '#002B49', padding: '4px 10px', borderRadius: '1rem', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}>
          Campus Rewards & Unlockable Badges
        </span>
        <h2 style={{ margin: '12px 0 6px 0', fontSize: '28px', fontWeight: '900' }}>Perk Points Store & Badges</h2>
        <p style={{ margin: 0, color: '#E0F2FE', fontSize: '15px' }}>Spend your points to unlock achievement badges, gift cards, and physical campus awards!</p>

        <div style={{ display: 'flex', gap: '30px', marginTop: '20px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '13px', color: '#93C5FD', display: 'block' }}>Your Balance</span>
            <span style={{ fontSize: '36px', fontWeight: '900', color: '#FFC72C' }}>{profile.points} PTS</span>
          </div>
          <div>
            <span style={{ fontSize: '13px', color: '#93C5FD', display: 'block' }}>Active Badges</span>
            <span style={{ fontSize: '24px', fontWeight: '800' }}>{profile.badges.length} Unlocked</span>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '14px' }}>🏅 Your Unlocked Badges</h3>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {profile.badges.map((badge, idx) => (
          <div key={idx} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>✨</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#111827' }}>{badge}</h4>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>Equipped Profile Badge</span>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '14px' }}>🛍️ Catalog & Checkout Store</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {catalog.map((item) => {
          const canAfford = profile.points >= item.cost;
          const alreadyOwned = item.category === 'Badge' && profile.badges.includes(item.name);

          let badgeBg = '#F3E8FF';
          let badgeColor = '#7C3AED';
          if (item.category === 'Reward') {
            badgeBg = '#E0F2FE';
            badgeColor = '#0369A1';
          } else if (item.category === 'Physical Award') {
            badgeBg = '#FEF3C7';
            badgeColor = '#D97706';
          }

          return (
            <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '32px' }}>{item.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '0.5rem', background: badgeBg, color: badgeColor }}>
                    {item.category}
                  </span>
                </div>
                <h4 style={{ margin: '12px 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#111827' }}>{item.name}</h4>
                <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '12px' }}>{item.description}</p>
                <p style={{ fontSize: '15px', fontWeight: '900', color: '#059669', margin: 0 }}>Price: {item.cost} PTS</p>
              </div>

              <button
                onClick={() => onCheckout(item.id)}
                disabled={!canAfford || alreadyOwned}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  background: alreadyOwned ? '#10B981' : canAfford ? '#002B49' : '#E5E7EB',
                  color: alreadyOwned ? '#FFFFFF' : canAfford ? '#FFC72C' : '#9CA3AF',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '0.75rem',
                  fontWeight: '800',
                  cursor: canAfford && !alreadyOwned ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                }}
              >
                {alreadyOwned ? '✓ Owned & Unlocked' : canAfford ? '🛒 Checkout & Redeem' : 'Need More Points'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CampusEventsAndClubsView({
  currentUserEmail,
  onRsvpSuccess,
}: {
  currentUserEmail: string;
  onRsvpSuccess: () => void;
}) {
  const [events, setEvents] = useState<CampusEvent[]>(eventsService.getEvents());
  const [clubs] = useState<StudentClub[]>(eventsService.getClubs());
  const [liveEvents, setLiveEvents] = useState<CSULBEvent[]>([]);
  const [liveOrgs, setLiveOrgs] = useState<CSULBOrganization[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    Promise.all([
      liveEventsService.fetchLiveEvents(),
      liveEventsService.fetchLiveOrganizations(),
    ])
      .then(([eventItems, orgItems]) => {
        setLiveEvents(eventItems);
        setLiveOrgs(orgItems);
      })
      .catch((err) => console.error('Failed to fetch live CSULB Engage data', err))
      .finally(() => setLoadingLive(false));
  }, []);

  const handleRSVP = async (ev: CampusEvent) => {
    const success = eventsService.rsvpEvent(ev.id, currentUserEmail);
    if (success) {
      rewardsEngine.awardPoints(currentUserEmail, 20, 'RSVPed for campus event');
      setEvents([...eventsService.getEvents()]);
      onRsvpSuccess();

      // Trigger backend RSVP confirmation email
      try {
        let res = await fetch('/api/v1/events/rsvp-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: currentUserEmail,
            eventId: ev.id,
            eventTitle: ev.title,
            eventDate: ev.date,
            eventLocation: ev.location,
            organization: ev.organization,
          }),
        });

        if (res.status === 404) {
          res = await fetch('/api/events/rsvp-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: currentUserEmail,
              eventId: ev.id,
              eventTitle: ev.title,
              eventDate: ev.date,
              eventLocation: ev.location,
              organization: ev.organization,
            }),
          });
        }

        if (res.ok) {
          alert(`Successfully RSVPed for ${ev.title}! (+20 reward points earned) A confirmation email has been sent to ${currentUserEmail}.`);
        } else {
          alert(`Successfully RSVPed for ${ev.title}! (+20 reward points earned)`);
        }
      } catch (err) {
        console.error('RSVP confirmation email error:', err);
        alert(`Successfully RSVPed for ${ev.title}! (+20 reward points earned)`);
      }
    } else {
      alert('You have already RSVPed for this event.');
    }
  };
  return (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
        🎉 Campus Events & RSVP
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {events.map((ev) => {
          const isRsvped = ev.attendees?.includes(currentUserEmail);
          return (
            <div key={ev.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#002B49', background: '#E0F2FE', padding: '3px 8px', borderRadius: '0.5rem' }}>{ev.organization}</span>
                <h4 style={{ margin: '10px 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#111827' }}>{ev.title}</h4>
                <p style={{ fontSize: '13px', color: '#4B5563', margin: '4px 0' }}>📅 {ev.date}</p>
                <p style={{ fontSize: '13px', color: '#4B5563', margin: '4px 0' }}>📍 {ev.location}</p>
                <p style={{ fontSize: '12px', color: '#059669', fontWeight: '700', marginTop: '8px' }}>
                  👥 {ev.attendees?.length || 0} Students Attending
                </p>
              </div>
              <button
                onClick={() => handleRSVP(ev)}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  background: isRsvped ? '#10B981' : '#002B49',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {isRsvped ? '✓ RSVP Confirmed' : '🎟️ RSVP for Event'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Live CSULB Engage Events */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>
          📡 Live CSULB Engage Events
        </h3>
        <a
          href={CSULB_ENGAGE_EVENTS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '13px', fontWeight: '800', color: '#002B49', textDecoration: 'underline' }}
        >
          View All on BeachSync Events ↗
        </a>
      </div>

      {loadingLive ? (
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '32px' }}>Loading live CSULB Engage events...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {liveEvents.slice(0, 6).map((item) => (
            <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {item.organization && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#002B49', background: '#FEF3C7', padding: '3px 8px', borderRadius: '0.5rem' }}>
                    {item.organization}
                  </span>
                )}
                <h4 style={{ margin: '10px 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#111827' }}>{item.title}</h4>
                <p style={{ fontSize: '12px', color: '#4B5563', margin: '4px 0' }}>📅 {item.date}</p>
                <p style={{ fontSize: '12px', color: '#4B5563', margin: '4px 0' }}>📍 {item.location}</p>
              </div>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: '16px',
                  display: 'block',
                  textAlign: 'center',
                  background: '#002B49',
                  color: '#FFC72C',
                  textDecoration: 'none',
                  padding: '8px',
                  borderRadius: '0.75rem',
                  fontWeight: '800',
                  fontSize: '12px',
                }}
              >
                🔗 View Event on Engage
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Live CSULB Engage Organizations */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>
          🏛️ CSULB Student Organizations (Engage)
        </h3>
        <a
          href={CSULB_ENGAGE_ORGS_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '13px', fontWeight: '800', color: '#002B49', textDecoration: 'underline' }}
        >
          Explore All Organizations ↗
        </a>
      </div>

      {!loadingLive && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {liveOrgs.slice(0, 6).map((org) => (
            <div key={org.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369A1', background: '#E0F2FE', padding: '3px 8px', borderRadius: '0.5rem' }}>
                  {org.category}
                </span>
                <h4 style={{ margin: '10px 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#111827' }}>{org.name}</h4>
                <p style={{ fontSize: '12px', color: '#4B5563', margin: '4px 0', lineHeight: '1.4' }}>{org.summary}</p>
              </div>
              <a
                href={org.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: '16px',
                  display: 'block',
                  textAlign: 'center',
                  background: '#FFC72C',
                  color: '#002B49',
                  textDecoration: 'none',
                  padding: '8px',
                  borderRadius: '0.75rem',
                  fontWeight: '800',
                  fontSize: '12px',
                }}
              >
                🌐 View Organization
              </a>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
        🤝 Student Clubs & Discord Links
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {clubs.map((club) => (
          <div key={club.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1rem', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', background: '#F3E8FF', padding: '3px 8px', borderRadius: '0.5rem' }}>{club.category}</span>
              <h4 style={{ margin: '10px 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#111827' }}>{club.name}</h4>
              <p style={{ fontSize: '13px', color: '#4B5563', margin: '4px 0' }}>🕒 {club.meetingTime}</p>
              <p style={{ fontSize: '13px', color: '#4B5563', margin: '4px 0' }}>📍 {club.location}</p>
            </div>
            <a
              href={club.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: '16px',
                display: 'block',
                textAlign: 'center',
                background: '#5865F2',
                color: '#FFFFFF',
                textDecoration: 'none',
                padding: '10px',
                borderRadius: '0.75rem',
                fontWeight: '800',
                fontSize: '13px',
              }}
            >
              💬 Join Discord Community
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostgresMarketplaceFeed({ refreshKey, onOpenChat }: { refreshKey: number; onOpenChat: (listing: Listing) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/marketplace/listings')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setListings(data);
      })
      .catch((err) => console.error('Failed to fetch marketplace listings', err))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading marketplace listings from NeonDB...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>🛍️ CSULB Campus Marketplace Feed</h3>
      </div>

      {listings.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '40px' }}>No marketplace listings found. Post the first one above!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {listings.map((item) => (
            <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ height: '160px', background: '#F3F4F6' }}>
                  {item.image_data ? (
                    <img src={item.image_data} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: '13px' }}>
                      No Photo Available
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#111827' }}>{item.title}</h4>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>
                      {Number(item.price) === 0 ? 'FREE' : `$${Number(item.price).toFixed(2)}`}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '12px' }}>{item.description}</p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>Seller: {item.seller_email}</p>
                </div>
              </div>
              <div style={{ padding: '0 16px 16px 16px' }}>
                <button
                  onClick={() => onOpenChat(item)}
                  style={{ width: '100%', background: '#002B49', color: '#FFC72C', border: 'none', padding: '10px', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}
                >
                  💬 Contact Seller
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [mfaEmail, setMfaEmail] = useState('');

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'map' | 'indoor' | 'directory' | 'marketplace' | 'events' | 'rewards' | 'profile' | 'about'>('dashboard');
  const [showManualForm, setShowManualForm] = useState(false);
  const [showOcrUploader, setShowOcrUploader] = useState(false);
  const [showIcsUploader, setShowIcsUploader] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  // Phase 2 state
  const [showCreateListingForm, setShowCreateListingForm] = useState(false);
  const [marketplaceRefreshKey, setMarketplaceRefreshKey] = useState(0);
  const [activeChatListing, setActiveChatListing] = useState<Listing | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('sso_token');
    const storedUser = localStorage.getItem('sso_user');

    if (!storedToken || !storedUser) {
      localStorage.removeItem('sso_token');
      localStorage.removeItem('token');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed?.email) {
        localStorage.removeItem('sso_token');
        localStorage.removeItem('token');
        localStorage.removeItem('sso_user');
        return;
      }

      if (!parsed.name || parsed.name === 'Updated Name') {
        parsed.name = parsed.username || parsed.email.split('@')[0] || 'Student';
        localStorage.setItem('sso_user', JSON.stringify(parsed));
      }

      setToken(storedToken);
      setUser(parsed);
      if (parsed.email && parsed.role) {
        setCurrentUserAccount({
          email: parsed.email,
          username: parsed.username || parsed.name || parsed.email.split('@')[0],
          role: parsed.role,
        });
      }
    } catch {
      localStorage.removeItem('sso_token');
      localStorage.removeItem('token');
      localStorage.removeItem('sso_user');
    }
  }, []);

  const activeSession = getActiveMarketplaceSession();
  const effectiveEmail = (user?.email || currentUserAccount?.email || activeSession?.email || '').trim().toLowerCase();
  const effectiveRole = (user?.role || currentUserAccount?.role || activeSession?.role || '').trim();
  const [userProfile, setUserProfile] = useState<UserGamificationProfile>(
    rewardsEngine.getProfile(effectiveEmail || 'guest')
  );

  useEffect(() => {
    const refreshPoints = () => {
      if (effectiveEmail) {
        setUserProfile({ ...rewardsEngine.getProfile(effectiveEmail) });
      }
    };
    refreshPoints();
    window.addEventListener('csulb:points-updated', refreshPoints);
    return () => window.removeEventListener('csulb:points-updated', refreshPoints);
  }, [effectiveEmail]);

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
    localStorage.removeItem('token');
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
    setActiveChatListing(null);
  };

  const handleSyncSuccess = () => {
    setScheduleRefreshKey(prev => prev + 1);
    setShowManualForm(false);
    setShowOcrUploader(false);
    setShowIcsUploader(false);
  };

  const handleOpenChat = (listing: Listing) => {
    if (!effectiveEmail || !effectiveRole) {
      alert('Both an email address and a role are required to access Marketplace Chat.');
      return;
    }
    setActiveChatListing(listing);
  };

  const handleListingCreated = () => {
    setShowCreateListingForm(false);
    setMarketplaceRefreshKey((prev) => prev + 1);
    if (effectiveEmail) {
      setUserProfile({ ...rewardsEngine.getProfile(effectiveEmail) });
    }
  };

  const handleRsvpUpdated = () => {
    if (effectiveEmail) {
      setUserProfile({ ...rewardsEngine.getProfile(effectiveEmail) });
    }
  };

  const handleCheckoutItem = (itemId: string) => {
    if (!effectiveEmail || !effectiveRole) {
      alert('Please sign in with both an email address and an assigned role to redeem rewards.');
      return;
    }
    const res = rewardsEngine.purchaseItem(effectiveEmail, itemId);
    setUserProfile({ ...res.profile });
    alert(res.message);
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

        <div style={{ width: '100%', maxWidth: '420px', background: '#FFFFFF', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid #E5E7EB' }}>
          <p style={{ color: '#4B5563', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>Select how you would like to receive your verification code.</p>
          
          <button 
            onClick={() => {
              setRequiresMfaChoice(false);
              setRequiresEmailOtpInput(true);
            }}
            style={{ width: '100%', background: '#002B49', color: '#FFC72C', padding: '14px', border: 'none', borderRadius: '0.85rem', fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          >
            ✉️ Email Verification Code
          </button>

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
            initialEmail={mfaEmail}
            autoSendOtp={Boolean(mfaEmail)}
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

  // Active Seller Chat Modal View
  if (activeChatListing) {
    if (!effectiveEmail || !effectiveRole) {
      return (
        <div style={{ maxWidth: '520px', margin: '48px auto', background: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E5E7EB', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#002B49' }}>Sign In Required (Email + Role)</h3>
          <p style={{ color: '#4B5563', fontSize: '14px' }}>
            Both an email address and a role are required to access Marketplace Chat.
          </p>
          <button
            onClick={() => setActiveChatListing(null)}
            style={{ background: '#002B49', color: '#FFC72C', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
          >
            ← Back
          </button>
        </div>
      );
    }

    return (
      <SellerChatModal
        listing={activeChatListing}
        currentUserEmail={effectiveEmail}
        currentUserRole={effectiveRole}
        onBack={() => setActiveChatListing(null)}
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
              Welcome, {user?.name || user?.username || 'Student'} ({effectiveEmail || 'student@student.csulb.edu'})
            </p>
          </div>
        </div>

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

          {activeTab === 'marketplace' && (
            <button
              onClick={() => {
                if (!effectiveEmail || !effectiveRole) {
                  alert('Please sign in with both an email address and a role to create a listing.');
                  return;
                }
                setShowCreateListingForm((prev) => !prev);
              }}
              style={{ padding: '10px 16px', background: '#FFC72C', color: '#002B49', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '900', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            >
              {showCreateListingForm ? 'Close Listing Form' : '➕ Create Listing'}
            </button>
          )}

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
          onClick={() => setActiveTab('marketplace')}
          style={{ padding: '10px 18px', background: activeTab === 'marketplace' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'marketplace' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          🛍️ Marketplace
        </button>
        <button 
          onClick={() => setActiveTab('events')}
          style={{ padding: '10px 18px', background: activeTab === 'events' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'events' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          🎉 Events & Clubs
        </button>
        <button 
          onClick={() => setActiveTab('rewards')}
          style={{ padding: '10px 18px', background: activeTab === 'rewards' ? '#FFC72C' : '#FFFFFF', color: activeTab === 'rewards' ? '#111827' : '#4B5563', border: '1px solid #D1D5DB', borderRadius: '0.75rem', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
        >
          🏆 Rewards ({userProfile.points} PTS)
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
        {activeTab === 'marketplace' && (
          <>
            {showCreateListingForm && effectiveEmail && effectiveRole && (
              <CreateListingFormWithPhoto
                defaultSellerEmail={effectiveEmail}
                currentUserRole={effectiveRole}
                onBack={() => setShowCreateListingForm(false)}
                onPostSuccess={handleListingCreated}
              />
            )}
            <PostgresMarketplaceFeed refreshKey={marketplaceRefreshKey} onOpenChat={handleOpenChat} />
          </>
        )}
        {activeTab === 'events' && (
          <CampusEventsAndClubsView
            currentUserEmail={effectiveEmail || 'guest@student.csulb.edu'}
            onRsvpSuccess={handleRsvpUpdated}
          />
        )}
        {activeTab === 'rewards' && (
          <RewardsShopView profile={userProfile} onCheckout={handleCheckoutItem} />
        )}
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