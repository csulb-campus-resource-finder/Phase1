import React, { useState } from 'react';

interface ResourceItem {
  id: string;
  title: string;
  category: 'basic-needs' | 'emergency';
  description: string;
  contact: string;
  phoneNumber?: string;
  location: string;
  hours: string;
  actionLabel: string;
  actionUrl: string;
  isExternalLink: boolean;
}

const directoryData: ResourceItem[] = [
  {
    id: 'pantry',
    title: 'Beach Pantry (Basic Needs Program)',
    category: 'basic-needs',
    description: 'Provides emergency food assistance, fresh produce, and hygiene items free of charge to currently enrolled CSULB students experiencing food insecurity.',
    contact: '(562) 985-2038',
    location: 'USU-214 (University Student Union)',
    hours: 'Mon–Thu: 10 AM – 6 PM, Fri: 10 AM – 3 PM',
    actionLabel: 'Visit Pantry Portal',
    actionUrl: 'https://www.csulb.edu/student-affairs/basic-needs/food',
    isExternalLink: true
  },
  {
    id: 'housing',
    title: 'Emergency Student Housing Support',
    category: 'basic-needs',
    description: 'Short-term emergency shelter grants, temporary hotel vouchers, and housing stability resources administered through the Dean of Students office.',
    contact: '(562) 985-6726',
    location: 'Brotman Hall (BH-181)',
    hours: 'Mon–Fri: 8 AM – 5 PM',
    actionLabel: 'Request Housing Support',
    actionUrl: 'https://www.csulb.edu/student-affairs/basic-needs/housing',
    isExternalLink: true
  },
  {
    id: 'financial',
    title: 'Emergency Financial Support',
    category: 'basic-needs',
    description: 'Emergency financial grants and emergency funding assistance for students experiencing unforeseen economic hardships.',
    contact: '(562) 985-6726',
    location: 'Brotman Hall (BH-181)',
    hours: 'Mon–Fri: 8 AM – 5 PM',
    actionLabel: 'Request Financial Aid',
    actionUrl: 'https://www.csulb.edu/student-affairs/basic-needs/financial',
    isExternalLink: true
  },
  {
    id: 'legal',
    title: 'Associated Students Legal Clinic',
    category: 'basic-needs',
    description: 'Free, confidential legal consultations for enrolled CSULB students covering tenant rights, landlord disputes, traffic infractions, and consumer protection.',
    contact: '(562) 985-5736',
    location: 'USU-311',
    hours: 'By Appointment (Mon–Fri)',
    actionLabel: 'Book Consultation',
    actionUrl: 'https://asicsulb.org/',
    isExternalLink: true
  },
  {
    id: 'upd',
    title: 'University Police Department (UPD) - Emergency Dispatch',
    category: 'emergency',
    description: '24/7 on-campus emergency response, safety escorts, blue-light phone coordination, and immediate campus hazard reporting.',
    contact: '911 or (562) 985-4101',
    phoneNumber: '5629854101',
    location: 'Campus Police Station (Near Lot G1)',
    hours: '24 Hours / 7 Days a Week',
    actionLabel: 'Call Emergency Dispatch',
    actionUrl: 'tel:5629854101',
    isExternalLink: false
  },
  {
    id: 'health',
    title: 'Student Health Services (SHS) Nurse Line',
    category: 'emergency',
    description: 'Immediate confidential medical advice, urgent care triage, and mental health crisis support protocols.',
    contact: '(562) 985-4771',
    phoneNumber: '5629854771',
    location: 'Student Health Services Building',
    hours: 'Mon–Fri: 8 AM – 4:30 PM (24/7 Nurse Advice Line)',
    actionLabel: 'Call Nurse Line',
    actionUrl: 'tel:5629854771',
    isExternalLink: false
  },
  {
    id: 'crisis',
    title: 'Counseling and Psychological Services (CAPS) Crisis Support',
    category: 'emergency',
    description: 'Immediate mental health support and crisis intervention counseling for enrolled students.',
    contact: '(562) 985-4001 (Press 2 after hours)',
    phoneNumber: '5629854001',
    location: 'SSCAN Building / Brotman Hall',
    hours: '24/7 Crisis Phone Access',
    actionLabel: 'Connect with Counselor',
    actionUrl: 'tel:5629854001',
    isExternalLink: false
  }
];

export const BasicNeedsDirectory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'basic-needs' | 'emergency'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredResources = directoryData.filter(item => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleActionClick = (res: ResourceItem, e: React.MouseEvent) => {
    if (!res.isExternalLink) {
      e.preventDefault(); // Stop default browser navigation
      
      // Detect if user is on a mobile device
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        // Trigger phone dialer on mobile
        window.location.href = res.actionUrl;
      } else {
        // Show clean contact info alert on desktop instead of a blank page
        alert(`🚨 Emergency Contact\n\n${res.title}\nDirect Line: ${res.contact}`);
      }
    }
  };

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#1A1A1A' }}>
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          CAMPUS RESOURCE FINDER
        </span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: '#002B49' }}>
          Basic Needs & Emergency Directory
        </h2>
      </div>

      {/* Search & Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <input 
          type="text"
          placeholder="Search basic needs resources, food pantry, legal aid, or emergency contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '14px 16px', borderRadius: '1rem', border: '1.5px solid #D1D5DB', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { id: 'all', label: 'All Resources' },
            { id: 'basic-needs', label: 'Basic Needs & Support' },
            { id: 'emergency', label: 'Offline Emergency Contacts' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 18px',
                borderRadius: '2rem',
                border: activeTab === tab.id ? 'none' : '1.5px solid #E5E7EB',
                background: activeTab === tab.id ? '#002B49' : '#FFFFFF',
                color: activeTab === tab.id ? '#FFC72C' : '#374151',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
        {filteredResources.map(res => (
          <div key={res.id} style={{ background: '#FFFFFF', borderRadius: '1.25rem', padding: '20px', border: '1.5px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px', background: res.category === 'emergency' ? '#FEE2E2' : '#E0E7FF', color: res.category === 'emergency' ? '#991B1B' : '#1E40AF' }}>
                  {res.category === 'emergency' ? '🚨 Emergency Contact' : '🤝 Basic Needs'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '900', color: '#002B49' }}>{res.title}</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5' }}>{res.description}</p>
              
              <div style={{ fontSize: '13px', color: '#1F2937', fontWeight: '700', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>📞 <b>Contact:</b> {res.contact}</div>
                <div>📍 <b>Location:</b> {res.location}</div>
                <div>⏰ <b>Hours:</b> {res.hours}</div>
              </div>
            </div>

            <a 
              href={res.actionUrl}
              target={res.isExternalLink ? '_blank' : '_self'}
              rel={res.isExternalLink ? 'noopener noreferrer' : undefined}
              onClick={(e) => handleActionClick(res, e)}
              style={{
                display: 'block',
                textAlign: 'center',
                textDecoration: 'none',
                width: '100%',
                background: res.category === 'emergency' ? '#DC2626' : '#FFC72C',
                color: res.category === 'emergency' ? '#FFFFFF' : '#002B49',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '12px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              {res.actionLabel}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};