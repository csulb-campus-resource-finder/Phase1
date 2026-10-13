import React, { useState } from 'react';

export interface CampusLocation {
  id: string;
  name: string;
  category: 'building' | 'parking' | 'food';
  coords: [number, number];
  description: string;
}

const CAMPUS_LOCATIONS: CampusLocation[] = [
  { id: '1', name: 'University Library', category: 'building', coords: [33.7771, -118.1145], description: 'Main study hub and research desk.' },
  { id: '2', name: 'Palo Verde Structure', category: 'parking', coords: [33.7812, -118.1180], description: 'Multi-level parking structure near ECS.' },
  { id: '3', name: 'Beach Pantry (USU)', category: 'food', coords: [33.7800, -118.1130], description: 'Free food resource for CSULB students.' },
  { id: '4', name: 'Horn Center', category: 'building', coords: [33.7830, -118.1150], description: 'Computer labs and collaborative spaces.' },
  { id: '5', name: 'Lot E1 Parking', category: 'parking', coords: [33.7750, -118.1160], description: 'General parking lot on south campus.' }
];

export const CampusMap: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [selectedLoc, setSelectedLoc] = useState<CampusLocation | null>(null);

  const filteredLocations = filter === 'all'
    ? CAMPUS_LOCATIONS
    : CAMPUS_LOCATIONS.filter(loc => loc.category === filter);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>CSULB Interactive Campus Map</h2>
      <div style={{ marginBottom: '15px' }}>
        <button onClick={() => setFilter('all')} style={{ marginRight: '5px' }}>All</button>
        <button onClick={() => setFilter('building')} style={{ marginRight: '5px' }}>Buildings</button>
        <button onClick={() => setFilter('parking')} style={{ marginRight: '5px' }}>Parking Structures</button>
        <button onClick={() => setFilter('food')}>Food & Services</button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <ul style={{ listStyleType: 'none', padding: 0, flex: 1 }}>
          {filteredLocations.map(loc => (
            <li
              key={loc.id}
              onClick={() => setSelectedLoc(loc)}
              style={{
                padding: '10px',
                border: '1px solid #ccc',
                marginBottom: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selectedLoc?.id === loc.id ? '#e2f0fe' : '#fff'
              }}
            >
              <strong>{loc.name}</strong> ({loc.category})
            </li>
          ))}
        </ul>

        <div style={{ flex: 1, padding: '15px', border: '1px solid #aaa', borderRadius: '4px' }}>
          <h3>Location Inspector</h3>
          {selectedLoc ? (
            <div>
              <h4>{selectedLoc.name}</h4>
              <p><strong>Category:</strong> {selectedLoc.category}</p>
              <p><strong>Coordinates:</strong> {selectedLoc.coords.join(', ')}</p>
              <p>{selectedLoc.description}</p>
            </div>
          ) : (
            <p>Select a location on the left to inspect details.</p>
          )}
        </div>
      </div>
    </div>
  );
};

