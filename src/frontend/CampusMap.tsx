// Imports the React library and hooks for state management.
import React, { useState } from 'react';

// Defines a TypeScript interface for campus map resources/locations.
interface CampusResource {
  id: string;
  name: string;
  category: 'study' | 'food' | 'services' | 'parking';
  status: string;
  walkTime: string;
  amenities: string;
  address: string;
  description: string;
  concept3dQuery: string;
  directionsQuery: string; // Internal Concept3D route query string
}

export const CampusMap: React.FC = () => {
  // State hook to track whether the map is currently displayed in fullscreen mode.
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  // State for search input query typed by the user
  const [searchQuery, setSearchQuery] = useState<string>('');
  // State for active category filter
  const [activeCategory, setActiveCategory] = useState<string>('all');
  // State controlling whether search results are visible after searching
  const [showResults, setShowResults] = useState<boolean>(false);
  // State tracking whether internal Concept3D routing mode is currently active
  const [isRoutingActive, setIsRoutingActive] = useState<boolean>(false);

  // Pre-populated database of CSULB locations with native Concept3D direction routes
  const initialResources: CampusResource[] = [
    { 
      id: 'g2', 
      name: 'G2 Parking Lot', 
      category: 'parking', 
      status: 'Student Permit Parking', 
      walkTime: '5 min walk', 
      amenities: 'General Student Parking • EV Chargers nearby', 
      address: 'G2 Parking Lot, CSULB', 
      description: 'G2 Parking Lot is a primary general student parking zone located on the north side of campus near the Walter Pyramid. It offers ample surface-level parking with accessible stalls and direct walkway access to lower campus facilities.',
      concept3dQuery: '1314#!ct/91383?sbc/&scale=0&z=18',
      directionsQuery: '1314#!ct/91383,91209?mc/33.7828,-118.1130?z=18'
    },
    { 
      id: 'lib', 
      name: 'University Library', 
      category: 'study', 
      status: 'Open until 11 PM', 
      walkTime: '4 min walk', 
      amenities: 'Wi-Fi • Quiet Study • Computer Labs', 
      address: 'University Library, CSULB', 
      description: 'The CSULB University Library is a 5-story academic center situated along Friendship Walk. It provides extensive study carrels, group study rooms, computer labs, printing stations, and the 24/7 Spidell Technology Center.',
      concept3dQuery: '1314#!ct/91209?sbc/&scale=0&z=19',
      directionsQuery: '1314#!ct/91209,91380?mc/33.7801,-118.1135?z=19'
    },
    { 
      id: 'usu', 
      name: 'University Student Union (USU)', 
      category: 'food', 
      status: 'Open until 9 PM', 
      walkTime: '7 min walk', 
      amenities: 'Food Court • Lounge • Games Room', 
      address: 'University Student Union, CSULB', 
      description: 'The University Student Union (USU) serves as the social center for Beach students. Spanning three floors, it features popular campus dining (Starbucks, Panda Express), student lounges, and the Beach Games Center.',
      concept3dQuery: '1314#!ct/91380?sbc/&scale=0&z=19',
      directionsQuery: '1314#!ct/91380,91209?mc/33.7812,-118.1120?z=19'
    },
    { 
      id: 'bookstore', 
      name: 'CSULB Bookstore', 
      category: 'services', 
      status: 'Open until 6 PM', 
      walkTime: '6 min walk', 
      amenities: 'Textbooks • Supplies • Beach Gear', 
      address: '49er Shops Bookstore, CSULB', 
      description: 'Operated by 49er Shops, the CSULB Bookstore is your official one-stop shop for required textbooks, tech gear, school supplies, and official Beach apparel.',
      concept3dQuery: '1314#!ct/91382?sbc/&scale=0&z=19',
      directionsQuery: '1314#!ct/91382,91209?mc/33.7818,-118.1128?z=19'
    },
    { 
      id: 'pyramid', 
      name: 'Walter Pyramid', 
      category: 'services', 
      status: 'Open Event Hours', 
      walkTime: '8 min walk', 
      amenities: 'Athletics • Fitness • Arena', 
      address: 'Walter Pyramid, CSULB', 
      description: 'Standing 18 stories tall, the iconic cobalt-blue Walter Pyramid is a 4,000-seat multi-purpose arena hosting Beach Athletics basketball and volleyball games.',
      concept3dQuery: '1314#!ct/91209?sbc/&scale=0&z=18',
      directionsQuery: '1314#!ct/91209,91383?mc/33.7860,-118.1140?z=18'
    },
  ];

  // State for resources list
  const [resources, setResources] = useState<CampusResource[]>(initialResources);

  // Currently selected resource card (defaults to University Library)
  const [selectedResource, setSelectedResource] = useState<CampusResource>(initialResources[1]);

  // Handle Search Form Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsRoutingActive(false); // Reset route overlay on new search
    const queryLower = searchQuery.toLowerCase().trim();

    const matched = resources.filter(res => 
      res.name.toLowerCase().includes(queryLower) || 
      res.category.toLowerCase().includes(queryLower) ||
      res.amenities.toLowerCase().includes(queryLower)
    );

    if (matched.length > 0) {
      setSelectedResource(matched[0]);
    } else {
      const formattedName = searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1);
      const customResource: CampusResource = {
        id: `custom-${Date.now()}`,
        name: formattedName,
        category: 'services',
        status: 'Campus Facility Located',
        walkTime: '5-8 min walk',
        amenities: 'CSULB Campus Location',
        address: `${searchQuery}, CSULB`,
        description: `${formattedName} is a designated location within the California State University, Long Beach campus perimeter with accessible pedestrian pathways.`,
        concept3dQuery: `1314#!s/${encodeURIComponent(searchQuery)}?scale=0&z=19`,
        directionsQuery: `1314#!s/${encodeURIComponent(searchQuery)}?scale=0&z=19`
      };

      setResources(prev => [customResource, ...prev]);
      setSelectedResource(customResource);
    }

    setShowResults(true);
  };

  // Handle selecting a resource from search results
  const handleSelectResource = (resource: CampusResource) => {
    setSelectedResource(resource);
    setIsRoutingActive(false);
    setShowResults(false);
  };

  // Filter resources based on category and query
  const filteredResources = resources.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.amenities.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle Live Concept3D Internal Routing
  const handleGetConcept3DDirections = () => {
    setIsRoutingActive(true);
  };

  // Cleanly construct Concept3D map URL with proper parameter separation
  const mapQuery = isRoutingActive ? selectedResource.directionsQuery : selectedResource.concept3dQuery;
  const getConcept3dUrl = (query: string, name: string) => {
    if (query.startsWith('1314')) {
      const cleanQuery = query.replace(/^1314/, '');
      return `https://map.concept3d.com/?id=1314${cleanQuery}`;
    }
    return `https://map.concept3d.com/?id=1314#!s/${encodeURIComponent(name)}?scale=0&z=19`;
  };
  const concept3dMapUrl = getConcept3dUrl(mapQuery, selectedResource.name);

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#1A1A1A', boxSizing: 'border-box' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            CAMPUS RESOURCE FINDER
          </span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: '#002B49', letterSpacing: '-0.5px' }}>
            Explore the Beach
          </h2>
        </div>
        <button 
          onClick={() => setIsFullScreen(!isFullScreen)}
          style={{ 
            padding: '10px 16px', 
            background: '#002B49', 
            color: '#FFC72C', 
            border: 'none', 
            borderRadius: '0.75rem', 
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '13px',
            boxShadow: '0 2px 4px rgba(0,43,73,0.2)'
          }}
        >
          {isFullScreen ? 'Exit Fullscreen' : '🗺️ Expand Fullscreen'}
        </button>
      </div>

      {/* Interactive Search Bar & Filter Pills Container */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#6B7280' }}>🔍</span>
            <input 
              type="text"
              placeholder="Search buildings, food, or resources (e.g. Lot G2, Pyramid)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              style={{
                width: '100%',
                padding: '14px 16px 14px 46px',
                borderRadius: '1rem',
                border: '1.5px solid #D1D5DB',
                fontSize: '15px',
                outline: 'none',
                background: '#FFFFFF',
                boxSizing: 'border-box',
                fontWeight: '600',
                color: '#1F2937',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>
          {/* Search Action Button */}
          <button 
            type="submit"
            style={{
              padding: '0 24px',
              background: '#002B49',
              color: '#FFC72C',
              border: 'none',
              borderRadius: '1rem',
              fontWeight: '900',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,43,73,0.2)'
            }}
          >
            Search
          </button>
        </div>

        {/* Filter Category Pills */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'all', label: 'All', icon: '☷' },
            { id: 'study', label: 'Study', icon: '📖' },
            { id: 'food', label: 'Food', icon: '🍽️' },
            { id: 'services', label: 'Services', icon: '🏢' },
            { id: 'parking', label: 'Parking', icon: '🅿️' },
          ].map(cat => (
            <button 
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setShowResults(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', borderRadius: '2rem', 
                border: activeCategory === cat.id ? 'none' : '1.5px solid #E5E7EB',
                background: activeCategory === cat.id ? '#002B49' : '#FFFFFF',
                color: activeCategory === cat.id ? '#FFC72C' : '#374151',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', whiteSpace: 'nowrap'
              }}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </form>

      {/* Search Results Dropdown List */}
      {showResults && (
        <div style={{ 
          background: '#FFFFFF', 
          borderRadius: '1rem', 
          border: '1.5px solid #E5E7EB', 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
          marginBottom: '20px', 
          padding: '16px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>
              Search Results ({filteredResources.length})
            </span>
            <button 
              onClick={() => setShowResults(false)}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
            >
              Close ✕
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredResources.map(res => (
              <div 
                key={res.id}
                onClick={() => handleSelectResource(res)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '0.75rem',
                  background: selectedResource.id === res.id ? '#FEF3C7' : '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '900', color: '#002B49', fontSize: '15px' }}>{res.name}</div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>{res.status} &nbsp;•&nbsp; {res.walkTime}</div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#002B49', background: '#FFC72C', padding: '4px 10px', borderRadius: '1rem' }}>
                  Zoom & Select 🔍
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embedded Concept3D Interactive Map Container - Automatically zooms in on selected building */}
      <div style={{ 
        width: '100%', 
        border: '1px solid #E5E7EB', 
        borderRadius: '1.25rem', 
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
        position: isFullScreen ? 'fixed' : 'relative',
        top: isFullScreen ? 0 : 'auto',
        left: isFullScreen ? 0 : 'auto',
        zIndex: isFullScreen ? 9999 : 1,
        background: '#ffffff',
        height: isFullScreen ? '100vh' : '520px',
        marginBottom: '20px'
      }}>
        {isFullScreen && (
          <button 
            onClick={() => setIsFullScreen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10000,
              background: '#DC2626',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontWeight: '900',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}
          >
            Close X
          </button>
        )}
        <iframe
          key={`${selectedResource.id}-${isRoutingActive}-${concept3dMapUrl}`}
          title="CSULB Concept3D Interactive Campus Map"
          src={concept3dMapUrl}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          allow="geolocation; accelerometer; gyroscope"
        />
      </div>

      {/* Selected Resource Card with Detailed Description & Concept3D Directions */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '1.5rem',
        padding: '24px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1px', textTransform: 'uppercase' }}>
              SELECTED LOCATION
            </span>
            <h3 style={{ margin: '4px 0 6px 0', fontSize: '24px', fontWeight: '900', color: '#002B49', letterSpacing: '-0.3px' }}>
              {selectedResource.name}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#047857', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              {selectedResource.status} &nbsp;•&nbsp; <span style={{ color: '#4B5563' }}>{selectedResource.walkTime}</span> &nbsp;•&nbsp; <span style={{ color: '#4B5563' }}>{selectedResource.amenities}</span>
            </p>
          </div>
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px' }}>
            🔖
          </button>
        </div>

        {/* Detailed Paragraph Description Section */}
        <div style={{
          backgroundColor: '#FAF9F5',
          borderRadius: '1rem',
          padding: '16px',
          border: '1px solid #E5E7EB',
          marginTop: '4px'
        }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '800', color: '#002B49', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📍 Location Details & Overview
          </h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.6', fontWeight: '500' }}>
            {selectedResource.description}
          </p>
        </div>

        {/* Active Routing Banner */}
        {isRoutingActive && (
          <div style={{ background: '#FEF3C7', color: '#92400E', padding: '10px 14px', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🧭 Concept3D routing mode active for {selectedResource.name}</span>
            <button 
              onClick={() => setIsRoutingActive(false)}
              style={{ background: 'none', border: 'none', color: '#92400E', fontWeight: '900', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
            >
              Reset View
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button 
            type="button"
            onClick={handleGetConcept3DDirections}
            style={{ 
              flex: 1, 
              background: '#FFC72C', 
              color: '#002B49', 
              border: 'none', 
              borderRadius: '1rem', 
              padding: '16px', 
              fontWeight: '900', 
              fontSize: '16px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(255, 199, 44, 0.35)'
            }}
          >
            <span>↗ Get directions in map</span>
          </button>

          <button 
            type="button"
            onClick={() => alert(`Details for ${selectedResource.name}:\nLocation: ${selectedResource.address}\nStatus: ${selectedResource.status}\nFacilities: ${selectedResource.amenities}`)}
            style={{ 
              padding: '16px 24px', 
              background: '#F3F4F6', 
              color: '#1F2937', 
              border: '1.5px solid #D1D5DB', 
              borderRadius: '1rem', 
              fontWeight: '800', 
              fontSize: '15px', 
              cursor: 'pointer' 
            }}
          >
            View details
          </button>
        </div>
      </div>
    </div>
  );
};