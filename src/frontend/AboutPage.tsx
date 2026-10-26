import React from 'react';

// Import local CSULB Walter Pyramid background image asset
import pyramidBkg from '../csulbbkg.jpg';

interface AboutPageProps {
  onBack?: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      minHeight: '100vh',
      backgroundColor: '#FAF9F5', // Warm off-white/cream background matching the Login screen
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '28px 24px 120px 24px',
      color: '#111827',
      boxSizing: 'border-box',
      textAlign: 'left'
    }}>
      {/* Top Navigation & Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            SETTINGS / YOUR CAMPUS DAY
          </span>
          <h1 style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '900', color: '#002B49', letterSpacing: '-0.5px' }}>
            About Campus Resource Finder
          </h1>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '10px 18px',
              borderRadius: '0.85rem',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #D1D5DB',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '800',
              color: '#002B49',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Hero Banner Card - Featuring the CSULB Walter Pyramid Image Asset with Overlay */}
      <div style={{
        position: 'relative',
        borderRadius: '1.75rem',
        padding: '32px 28px',
        color: '#FFFFFF',
        marginBottom: '28px',
        backgroundImage: `linear-gradient(to bottom, rgba(0, 43, 73, 0.45), rgba(0, 43, 73, 0.92)), url(${pyramidBkg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 12px 28px -5px rgba(0, 43, 73, 0.3)',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: '#FFC72C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          fontSize: '22px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
        }}>
          📻
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ width: '16px', height: '3px', backgroundColor: '#FFC72C', display: 'inline-block', borderRadius: '2px' }}></span>
          <span style={{
            color: '#FFC72C',
            fontSize: '11px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '1.5px'
          }}>
            CSULB CAMPUS RESOURCE FINDER
          </span>
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.3px', color: '#FFFFFF' }}>
          Your week, in one place.
        </h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#F3F4F6', lineHeight: '1.6', fontWeight: '500', maxWidth: '600px' }}>
          Bring in your classes to find campus resources around your day, avoid parking congestion, and discover safe student spots.
        </p>

        <button style={{
          width: '100%',
          backgroundColor: '#FFC72C',
          color: '#002B49',
          padding: '16px 20px',
          border: 'none',
          borderRadius: '1rem',
          fontSize: '15px',
          fontWeight: '900',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(255, 199, 44, 0.35)'
        }}>
          <span>Upload .ics or Sync MyCSULB Schedule</span>
          <span style={{ fontSize: '18px', fontWeight: '900' }}>⇡</span>
        </button>
      </div>

      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#002B49' }}>
          Core Features & Services
        </h3>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#6B7280' }}>
          Fall 2026 • 7 Modules
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px 0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>ℹ️</span> Integrated CSULB PWA Platform specifications
      </p>

      {/* Feature Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>

        {/* Feature 1 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '20px',
          border: '1px solid #E5E7EB',
          borderLeft: '6px solid #FFC72C',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#002B49' }}>
              CSULB SSO & Profile Sync
            </h4>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '800', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '6px' }}>Phase 1</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5', fontWeight: '500' }}>
            Authenticates identity via Shibboleth SSO with multi-factor authentication (TOTP/SMS) and session management.
          </p>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 <span>OAuth 2.0 / OpenID Connect Integration</span>
          </div>
        </div>

        {/* Feature 2 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '20px',
          border: '1px solid #E5E7EB',
          borderLeft: '6px solid #FFC72C',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#002B49' }}>
              Predictive Parking & Leave-By Alerts
            </h4>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '800', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '6px' }}>Phase 3</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5', fontWeight: '500' }}>
            Calculates drive times, search times, and highway traffic (I-405) to dispatch push alerts telling you exactly when to leave.
          </p>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 <span>Arrival-Time Forecasting Engine & GTFS Transit APIs</span>
          </div>
        </div>

        {/* Feature 3 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '20px',
          border: '1px solid #E5E7EB',
          borderLeft: '6px solid #FFC72C',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#002B49' }}>
              Peer-to-Peer Parking Spot Handoff
            </h4>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '800', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '6px' }}>Phase 3</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5', fontWeight: '500' }}>
            Allows departing students to broadcast spot availability to incoming drivers and earn perk points.
          </p>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 <span>WebSocket Real-Time Broadcast Network</span>
          </div>
        </div>

        {/* Feature 4 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '20px',
          border: '1px solid #E5E7EB',
          borderLeft: '6px solid #FFC72C',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#002B49' }}>
              Marketplace & Safe Meetup Zones
            </h4>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '800', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '6px' }}>Phase 4</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5', fontWeight: '500' }}>
            Buy and sell textbooks or supplies with verified student sellers at monitored campus exchange locations (e.g., University Police Lobby).
          </p>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 <span>Student Verification & Geospatial Pins</span>
          </div>
        </div>

        {/* Feature 5 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '20px',
          border: '1px solid #E5E7EB',
          borderLeft: '6px solid #FFC72C',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#002B49' }}>
              Study Spot Crowd Check
            </h4>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '800', backgroundColor: '#F3F4F6', padding: '4px 8px', borderRadius: '6px' }}>Phase 4</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4B5563', lineHeight: '1.5', fontWeight: '500' }}>
            Check real-time density levels (Low/Medium/High) at the University Library, Horn Center, and USU.
          </p>
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📍 <span>Telemetry Logs & Floor-by-Floor Telemetry</span>
          </div>
        </div>
      </div>

      {/* Info Callout Box */}
      <div style={{
        backgroundColor: '#FEF9C3',
        borderRadius: '1.25rem',
        padding: '18px 20px',
        border: '1.5px solid #FEF08A',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px' }}>🛡️</span>
          <strong style={{ fontSize: '15px', color: '#854D0E', fontWeight: '900' }}>Your schedule. Your control.</strong>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#A16207', lineHeight: '1.5', fontWeight: '600' }}>
          Data is protected under TLS 1.3 and stored securely in containerized PostgreSQL databases on NeonDB.
        </p>
      </div>

      {/* Project Team & Engineering Specs Section */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '1.25rem',
        padding: '24px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '900', color: '#002B49' }}>
          Engineering Team & Architecture
        </h3>

        <div style={{ marginBottom: '18px' }}>
          <strong style={{ fontSize: '14px', color: '#111827', display: 'block', marginBottom: '8px', fontWeight: '800' }}>
            CECS 491A Project Authors:
          </strong>
          <p style={{ margin: 0, fontSize: '14px', color: '#4B5563', lineHeight: '1.7', fontWeight: '500' }}>
            • Ashley Celis<br />
            • James Young<br />
            • Kyle Nguyen<br />
            • <strong style={{ color: '#002B49', fontWeight: '800' }}>Nadhirah Michael-Ho</strong><br />
            • Thien Phuc Tran<br />
            • Wardah Abuhadba
          </p>
        </div>

        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
          <strong style={{ fontSize: '14px', color: '#111827', display: 'block', marginBottom: '8px', fontWeight: '800' }}>
            Technical Stack:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4B5563', lineHeight: '1.7', fontWeight: '500' }}>
            <li><strong>Frontend:</strong> React, TypeScript, Vite, Progressive Web App (PWA)</li>
            <li><strong>Backend:</strong> Python 3.11 (FastAPI), Node.js, Docker Containers</li>
            <li><strong>Database:</strong> PostgreSQL (NeonDB) & Redis Pub/Sub Caching</li>
            <li><strong>Architecture:</strong> Model-View-Controller (MVC) with Singleton & Factory Patterns</li>
          </ul>
        </div>
      </div>
    </div>
  );
}