import React from 'react';

interface ExternalResource {
  title: string;
  url: string;
  description: string;
}

const CSULB_RESOURCES: ExternalResource[] = [
  { title: 'MyCSULB Student Center', url: 'https://my.csulb.edu', description: 'Access course enrollment, grades, and financial aid.' },
  { title: 'Canvas LMS', url: 'https://csulb.instructure.com', description: 'Course materials, assignments, and announcements.' },
  { title: 'Beach Pantry Services', url: 'https://www.asicsulb.org/beachpantry', description: 'Schedule visits and check pantry operating hours.' },
  { title: 'University Police & Safety', url: 'https://www.csulb.edu/university-police', description: 'Emergency services and safety escort requests.' }
];

export const ExternalLinks: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Official CSULB Portal Links</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {CSULB_RESOURCES.map((res, idx) => (
          <div key={idx} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '6px' }}>
            <h3>{res.title}</h3>
            <p>{res.description}</p>
            <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0056b3', fontWeight: 'bold' }}>
              Launch Resource Portal →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
