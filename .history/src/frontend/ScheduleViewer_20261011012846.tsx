import React, { useEffect, useState } from 'react';

interface Course {
  code: string;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  building: string;
  room: string;
  isCurrentlyActive?: boolean;
}

interface ScheduleData {
  studentId: string;
  studentName?: string;
  semester: string;
  catalogSource: string;
  courses: Course[];
}

export const ScheduleViewer: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve the JWT token stored during SSO login
    const token = localStorage.getItem('sso_token');

    if (!token) {
      setError('No authorization token found. Please sign in.');
      setLoading(false);
      return;
    }

    // Fetches from Express backend via Vite proxy with Authorization header
    fetch('/api/my-schedule', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to synchronize with schedule endpoint.');
        }
        return res.json();
      })
      .then((data: ScheduleData) => {
        setSchedule(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading class schedule...</div>;
  if (error) return <div style={{ padding: '20px', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>CSULB Enrolled Classes ({schedule?.semester})</h3>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>Student ID: {schedule?.studentId}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {schedule?.courses && schedule.courses.length > 0 ? (
          schedule.courses.map((course, index) => (
            <div 
              key={index}
              style={{
                padding: '14px',
                background: course.isCurrentlyActive ? '#ecfdf5' : '#ffffff',
                border: '1px solid',
                borderColor: course.isCurrentlyActive ? '#10b981' : '#e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '16px', color: '#1f2937' }}>{course.code}: {course.name}</strong>
                  {course.isCurrentlyActive && (
                    <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                      Happening Now
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: '#4b5563' }}>
                  📅 {course.days.join(', ')} | ⏰ {course.startTime} - {course.endTime}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#374151', background: '#f3f4f6', padding: '6px 10px', borderRadius: '4px' }}>
                📍 {course.building} {course.room}
              </div>
            </div>
          ))
        ) : (
          <p>No courses found for this student.</p>
        )}
      </div>
    </div>
  );
};