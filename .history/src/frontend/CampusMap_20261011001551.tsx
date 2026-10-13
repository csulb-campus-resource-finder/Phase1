import React, { useState } from 'react';
import 'leaflet/dist/leaflet.css';
export const CampusMap: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Official CSULB Concept3D Map URL provided
  const concept3dMapUrl = "https://map.concept3d.com/?id=1314#!ct/91209,91380,91382,91383?sbc/";

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>CSULB Official Interactive Concept3D Map</h2>
        <button 
          onClick={() => setIsFullScreen(!isFullScreen)}
          style={{ 
            padding: '8px 14px', 
            background: '#4f46e5', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isFullScreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
        </button>
      </div>

      {/* Embedded Concept3D Interactive Map Container */}
      <div style={{ 
        flex: 1, 
        width: '100%', 
        border: '1px solid #ccc', 
        borderRadius: '8px', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        position: isFullScreen ? 'fixed' : 'relative',
        top: isFullScreen ? 0 : 'auto',
        left: isFullScreen ? 0 : 'auto',
        zIndex: isFullScreen ? 9999 : 1,
        background: '#fff',
        height: isFullScreen ? '100vh' : '650px'
      }}>
        {isFullScreen && (
          <button 
            onClick={() => setIsFullScreen(false)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              zIndex: 10000,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Close X
          </button>
        )}
        <iframe
          title="CSULB Concept3D Interactive Campus Map"
          src={concept3dMapUrl}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          allow="geolocation; accelerometer; gyroscope"
        />
      </div>
    </div>
  );
};
