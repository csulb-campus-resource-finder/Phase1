// src/frontend/App.tsx
import React from 'react';
import { CampusMap } from './CampusMap';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>CSULB Campus Resource Finder</h1>
      <CampusMap />
    </div>
  );
}