import React, { useState } from 'react';

interface FloorLevel {
  level: number;
  name: string;
  description: string;
  amenities: string[];
  imageUrl?: string; // 👈 Added image property for each floor
}

interface BuildingIndoorData {
  buildingId: string;
  buildingName: string;
  tourEmbedUrl: string;
  isClosed?: boolean;
  closureNote?: string;
  floors: FloorLevel[];
}

const campusBuildings: BuildingIndoorData[] = [
  {
    buildingId: 'ecs',
    buildingName: 'Engineering & Computer Science (ECS)',
    tourEmbedUrl: 'https://map.concept3d.com/?id=1314&embedded=true#!ct/33215,33216?s/ECS',
    floors: [
      {
        level: 1,
        name: 'First Floor - CECS Labs & Robotics Arena',
        description: 'Home to main computer science student labs, robotics workspace, and department advising.',
        amenities: ['CECS Open Lab', 'Robotics Arena', 'Department Advising', 'Project Workshop'],
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 2,
        name: 'Second Floor - Lecture Halls & Faculty Offices',
        description: 'Large auditorium-style classrooms (ECS-125, ECS-128) and CECS faculty office suites.',
        amenities: ['Lecture Hall ECS-125', 'Lecture Hall ECS-128', 'Faculty Offices', 'Study Atrium'],
        imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 3,
        name: 'Third Floor - Senior Design & Advanced AI/Systems Labs',
        description: 'Dedicated capstone project workspace, hardware labs, and advanced computing workstations.',
        amenities: ['Senior Capstone Studio', 'Hardware Integration Lab', 'AI Research Corner'],
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80'
      }
    ]
  },
  {
    buildingId: 'hsci',
    buildingName: 'Hall of Science (HSCI)',
    tourEmbedUrl: 'https://map.concept3d.com/?id=1314&embedded=true#!ct/33215,33216?s/HSCI',
    floors: [
      {
        level: 1,
        name: 'First Floor - Science Atrium & Lecture Halls',
        description: 'Large-capacity lecture halls, introductory biology labs, and the Science Success Center.',
        amenities: ['Science Success Center', 'Lecture Hall HSCI-100', 'Intro Bio Labs'],
        imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 2,
        name: 'Second Floor - Chemistry & Biochemistry Labs',
        description: 'Wet chemistry teaching laboratories, instrumentation rooms, and stockroom.',
        amenities: ['Organic Chem Lab', 'Biochem Prep Room', 'Instrumentation Suite'],
        imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 3,
        name: 'Third Floor - Physics & Astronomy Research',
        description: 'Advanced physics labs, faculty research offices, and rooftop observatory access corridor.',
        amenities: ['Physics Labs', 'Optics Suite', 'Observatory Access'],
        imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1000&q=80'
      }
    ]
  },
  {
    buildingId: 'lib',
    buildingName: 'University Library',
    tourEmbedUrl: 'https://map.concept3d.com/?id=1314&embedded=true#!ct/33215,33216?s/Library',
    floors: [
      {
        level: 1,
        name: 'First Floor - Spidell Tech Center & Collaborative Hub',
        description: 'Features 24/7 computer labs, printing stations, tech support desk, and collaborative group study areas.',
        amenities: ['Computer Lab', 'Printing Stations', 'Tech Help Desk', 'Group Study Tables'],
        imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 2,
        name: 'Second Floor - Reference & Research Services',
        description: 'Main service desk, research help, periodicals, and open seating carrels.',
        amenities: ['Research Assistance Desk', 'Current Periodicals', 'Quiet Carrels'],
        imageUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 3,
        name: 'Third Floor - General Stacks & Quiet Study',
        description: 'General book collection (Call numbers H–P), individual study carrels, and power outlets.',
        amenities: ['Book Stacks H-P', 'Individual Carrels', 'Power Stations'],
        imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 4,
        name: 'Fourth Floor - Silent Study & Special Collections',
        description: 'Strict quiet study zone, archives, and special collections reading room.',
        amenities: ['Silent Study Zone', 'Special Collections', 'Microfilm Readers'],
        imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 5,
        name: 'Fifth Floor - Panoramic Study Lounge & Faculty Carrels',
        description: 'Scenic views of campus and Long Beach, graduate study rooms, and faculty research carrels.',
        amenities: ['Graduate Study Rooms', 'Panoramic Lounge', 'Faculty Carrels'],
        imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1000&q=80'
      }
    ]
  },
  {
    buildingId: 'usu',
    buildingName: 'University Student Union (USU)',
    tourEmbedUrl: 'https://map.concept3d.com/?id=1314&embedded=true#!ct/33215,33216?s/USU',
    isClosed: true,
    closureNote: 'Closed for Future U Renovation through Summer 2028. Relocated services are active in Peterson Hall 1 (PH1).',
    floors: [
      {
        level: 1,
        name: 'USU Building - Active Construction Area',
        description: 'The main union is undergoing redevelopment. Explore PH1 for temporary service locations.',
        amenities: ['Relocated Services in PH1', 'Temporary Student Lounges'],
        imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f1f1d?auto=format&fit=crop&w=1000&q=80'
      }
    ]
  },
  {
    buildingId: 'psy',
    buildingName: 'Psychology / Public Affairs (PSY)',
    tourEmbedUrl: 'https://map.concept3d.com/?id=1314&embedded=true#!ct/33215,33216?s/PSY',
    floors: [
      {
        level: 1,
        name: 'First Floor - Lecture Halls & Clinic Entrance',
        description: 'Large lecture spaces (PSY-150), departmental advising, and community counseling clinic reception.',
        amenities: ['Lecture Hall PSY-150', 'Advising Office', 'Clinic Reception'],
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 2,
        name: 'Second Floor - Behavioral Research & Computer Labs',
        description: 'Psychology research suites, behavioral observation rooms, and statistical computing labs.',
        amenities: ['Behavioral Lab', 'SPSS Computing Room', 'Faculty Offices'],
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80'
      }
    ]
  },
  {
    buildingId: 'la',
    buildingName: 'Language Arts (LA)',
    tourEmbedUrl: 'https://map.concept3d.com/?id=1314&embedded=true#!ct/33215,33216?s/LA',
    floors: [
      {
        level: 1,
        name: 'First Floor - Writing Center & Classrooms',
        description: 'Home to the campus Writing Center, collaborative seminar rooms, and open courtyards.',
        amenities: ['CSULB Writing Center', 'Seminar Rooms', 'Courtyard Seating'],
        imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 2,
        name: 'Second Floor - Humanities & Department Offices',
        description: 'Comparative literature, linguistics, and modern languages department suites.',
        amenities: ['Department of Linguistics', 'Faculty Offices', 'Discussion Labs'],
        imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80'
      },
      {
        level: 3,
        name: 'Third Floor - Upper-Division Classrooms & Study Nooks',
        description: 'Advanced language seminar rooms and quiet hallway study alcoves.',
        amenities: ['Language Seminar Rooms', 'Study Alcoves', 'PC Workstations'],
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80'
      }
    ]
  }
];

export const IndoorNavigator: React.FC = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingIndoorData>(campusBuildings[0]);
  const [selectedFloorLevel, setSelectedFloorLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'details' | 'tour'>('details');

  const currentFloor = selectedBuilding.floors.find(f => f.level === selectedFloorLevel) || selectedBuilding.floors[0];

  return (
    <div style={{ padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#1A1A1A' }}>
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          CAMPUS RESOURCE FINDER
        </span>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '28px', fontWeight: '900', color: '#002B49' }}>
          Indoor & Interactive Tour Navigator
        </h2>
      </div>

      {/* Building Selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {campusBuildings.map(b => (
          <button
            key={b.buildingId}
            onClick={() => {
              setSelectedBuilding(b);
              setSelectedFloorLevel(1);
              setViewMode('details');
            }}
            style={{
              padding: '12px 18px',
              borderRadius: '1rem',
              border: selectedBuilding.buildingId === b.buildingId ? 'none' : '1.5px solid #D1D5DB',
              background: selectedBuilding.buildingId === b.buildingId ? '#002B49' : '#FFFFFF',
              color: selectedBuilding.buildingId === b.buildingId ? '#FFC72C' : '#374151',
              fontWeight: '900',
              cursor: 'pointer',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            🏢 {b.buildingName} {b.isClosed ? ' (Closed)' : ''}
          </button>
        ))}
      </div>

      {/* Construction Notice Banner */}
      {selectedBuilding.isClosed && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid #F87171', borderRadius: '1rem', padding: '16px 20px', marginBottom: '20px', color: '#991B1B', fontWeight: '700', fontSize: '14px' }}>
          🚧 <b>Campus Construction Notice:</b> {selectedBuilding.closureNote}
        </div>
      )}

      {/* Floor Selector Tabs */}
      {!selectedBuilding.isClosed && viewMode === 'details' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {selectedBuilding.floors.map(floor => (
            <button
              key={floor.level}
              onClick={() => setSelectedFloorLevel(floor.level)}
              style={{
                padding: '10px 18px',
                borderRadius: '2rem',
                border: selectedFloorLevel === floor.level ? 'none' : '1.5px solid #E5E7EB',
                background: selectedFloorLevel === floor.level ? '#FFC72C' : '#FFFFFF',
                color: selectedFloorLevel === floor.level ? '#002B49' : '#4B5563',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Floor {floor.level}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Card */}
      <div style={{ background: '#FFFFFF', borderRadius: '1.5rem', padding: '24px', border: '1.5px solid #E5E7EB', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '900', color: '#002B49' }}>
              {selectedBuilding.buildingName}
            </h3>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B7280' }}>
              {viewMode === 'details' ? currentFloor.name : '🌐 360° Immersive Virtual Tour View'}
            </span>
          </div>

          {!selectedBuilding.isClosed && (
            <button
              onClick={() => setViewMode(viewMode === 'details' ? 'tour' : 'details')}
              style={{
                background: viewMode === 'details' ? '#002B49' : '#FFC72C',
                color: viewMode === 'details' ? '#FFC72C' : '#002B49',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '0.75rem',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              {viewMode === 'details' ? '🌐 Open 360° Virtual Tour' : '📋 View Floor Details'}
            </button>
          )}
        </div>

        {viewMode === 'details' ? (
          <>
            <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#4B5563', lineHeight: '1.5' }}>
              {currentFloor.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {currentFloor.amenities.map((amenity, idx) => (
                <span key={idx} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '6px 12px', borderRadius: '0.75rem', fontSize: '13px', fontWeight: '800' }}>
                  ✓ {amenity}
                </span>
              ))}
            </div>

            {/* Floor Image Display */}
            <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1.5px solid #CBD5E1', height: '320px', width: '100%', background: '#F8FAFC', position: 'relative' }}>
              {currentFloor.imageUrl ? (
                <img
                  src={currentFloor.imageUrl}
                  alt={currentFloor.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '20px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#475569' }}>
                    🗺️ [Floor {currentFloor.level} Schematic Layout: {currentFloor.name}]
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1.5px solid #CBD5E1', height: '520px', width: '100%', position: 'relative' }}>
            <iframe
              key={selectedBuilding.buildingId}
              title={`CSULB Virtual Tour - ${selectedBuilding.buildingName}`}
              src={selectedBuilding.tourEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              allow="geolocation; fullscreen"
            />
          </div>
        )}
      </div>
    </div>
  );
};