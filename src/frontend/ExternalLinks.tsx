// Imports the React library.
import React from 'react';

// Defines a TypeScript interface representing the structure of an external resource item.
interface ExternalResource {
  title: string;        // Title of the campus resource
  url: string;          // External link URL
  description: string;  // Short description of the resource's purpose
}

// Declares a constant array of official CSULB external resource objects.
const CSULB_RESOURCES: ExternalResource[] = [
  { title: 'MyCSULB Student Center', url: 'https://my.csulb.edu', description: 'Access course enrollment, grades, and financial aid.' },
  { title: 'Canvas LMS', url: 'https://csulb.instructure.com', description: 'Course materials, assignments, and announcements.' },
  { title: 'Beach Pantry Services', url: 'https://www.asicsulb.org/beachpantry', description: 'Schedule visits and check pantry operating hours.' },
  { title: 'University Police & Safety', url: 'https://www.csulb.edu/university-police', description: 'Emergency services and safety escort requests.' }
];

// Defines and exports the ExternalLinks functional React component.
export const ExternalLinks: React.FC = () => {
  return (
    // Outer container div with padding and font styling.
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Official CSULB Portal Links</h2>
      {/* Grid container to arrange resource cards in a two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {/* Iterates through each resource in the array to render individual cards */}
        {CSULB_RESOURCES.map((res, idx) => (
          <div key={idx} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '6px' }}>
            <h3>{res.title}</h3>
            <p>{res.description}</p>
            {/* External hyperlink opening in a new tab securely using rel="noopener noreferrer" */}
            <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0056b3', fontWeight: 'bold' }}>
              Launch Resource Portal →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};