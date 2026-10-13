import React from 'react';
import { CampusMap } from './CampusMap';
import { ScheduleViewer } from './ScheduleViewer';
import LoginPortal from './LoginPortal';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>CSULB Campus Resource Finder</h1>
      
      {/* Student Schedule & Live Status Tracker */}
      <ScheduleViewer />

      {/* Interactive Concept3D Map */}
      <CampusMap />
    </div>
  );
}