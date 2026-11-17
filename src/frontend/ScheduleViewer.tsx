// Imports React and hooks for managing state and side effects.
import React, { useEffect, useState } from 'react';

// Defines a TypeScript interface representing the structure of a course object.
interface Course {
  code: string;               // Course code (e.g., CECS 323)
  name: string;               // Course title / name
  days: string[] | string;    // Days of the week the class meets
  startTime: string;          // Class start time (e.g., 10:00)
  endTime: string;            // Class end time (e.g., 11:15)
  building: string;           // Building location (e.g., ECS)
  room: string;               // Room number (e.g., 100)
  isCurrentlyActive?: boolean;// Optional flag indicating if the class is currently in session
}

// Defines and exports the ScheduleViewer functional React component.
export function ScheduleViewer() {
  // State hook for storing the list of enrolled courses.
  const [courses, setCourses] = useState<Course[]>([]);
  // State hook tracking whether the schedule is currently being fetched (loading state).
  const [loading, setLoading] = useState<boolean>(true);
  // State hook for storing and displaying any scheduling error messages.
  const [error, setError] = useState<string | null>(null);

  // State hooks for handling inline course editing functionality.
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);

  // Asynchronous function to fetch the student's current class schedule from the backend API via relative path.
  const fetchSchedule = async () => {
    try {
      // Retrieves the SSO authentication token from local storage.
      const token = localStorage.getItem('sso_token');
      // Sends an HTTP GET request to fetch the user's schedule using a relative path.
      const res = await fetch('/api/schedules/my-schedule', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Parses the incoming JSON response data.
      const data = await res.json();
      // Throws an error if the response status is not successful.
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load schedule.');
      }

      // Updates the courses state with the retrieved list or an empty array.
      setCourses(data.courses || []);
    } catch (err: any) {
      // Catches errors and stores the error message in state.
      setError(err.message);
    } finally {
      // Sets loading to false once the fetch operation completes.
      setLoading(false);
    }
  };

  // useEffect hook to fetch the student schedule when the component mounts.
  useEffect(() => {
    fetchSchedule();
  }, []);

  // Asynchronous function to handle deleting a course from the schedule.
  const handleDelete = async (code: string) => {
    // Prompts the user for confirmation before proceeding with deletion.
    if (!window.confirm(`Are you sure you want to remove ${code} from your schedule?`)) return;

    try {
      // Retrieves the authentication token.
      const token = localStorage.getItem('sso_token');
      // Sends a DELETE request using a relative path to remove the specified course by code.
      const res = await fetch(`/api/schedules/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // If deletion succeeds, filter out the deleted course from local state.
      if (res.ok) {
        setCourses(courses.filter(c => c.code !== code));
      } else {
        alert('Failed to delete course.');
      }
    } catch (err) {
      console.error('Error deleting course:', err);
      alert('Network error while deleting course.');
    }
  };

  // Asynchronous function to delete all courses from the schedule.
  const handleDeleteAll = async () => {
    if (courses.length === 0) return;
    if (!window.confirm('Are you sure you want to remove ALL courses from your schedule?')) return;

    try {
      const token = localStorage.getItem('sso_token');
      
      // Sends an empty array to your sync endpoint to clear the schedule
      const res = await fetch('/api/schedules/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courses: [] })
      });

      if (res.ok) {
        setCourses([]);
      } else {
        alert('Failed to clear schedule.');
      }
    } catch (err) {
      console.error('Error clearing schedule:', err);
      alert('Network error while clearing schedule.');
    }
  };

  // Handler function to initialize the inline edit state for a selected course.
  const handleStartEdit = (course: Course) => {
    setEditingCode(course.code);
    setEditForm({ 
      ...course, 
      daysInput: Array.isArray(course.days) ? course.days.join(',') : course.days 
    });
  };

  // Asynchronous function to save updated course edits and sync them with the backend.
  const handleSaveEdit = async () => {
    if (!editForm) return;

    // Converts days input string back into a comma-trimmed array.
    const formattedDays = typeof editForm.daysInput === 'string'
      ? editForm.daysInput.split(',').map((d: string) => d.trim())
      : ['Mon', 'Wed'];

    // Constructs the updated course payload object.
    const payloadCourse = {
      code: editForm.code,
      name: editForm.name,
      days: formattedDays,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      building: editForm.building,
      room: editForm.room
    };

    try {
      // Retrieves the authentication token.
      const token = localStorage.getItem('sso_token');
      // Maps over existing courses, replacing the edited course with the updated payload.
      const updatedCourses = courses.map(c => c.code === editingCode ? payloadCourse : c);
      
      // Sends a POST request using a relative path to sync the full updated course list to the backend.
      const res = await fetch('/api/schedules/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courses: updatedCourses })
      });

      // If sync succeeds, update state, exit edit mode, and refresh schedule data.
      if (res.ok) {
        setCourses(updatedCourses);
        setEditingCode(null);
        setEditForm(null);
        fetchSchedule();
      } else {
        alert('Failed to update course.');
      }
    } catch (err) {
      console.error('Error updating course:', err);
      alert('Network error while updating course.');
    }
  };

  // Conditional render if data is still loading.
  if (loading) {
    return <div style={{ padding: '20px', color: '#6b7280' }}>Loading your course schedule...</div>;
  }

  // Conditional render if an error occurred while fetching.
  if (error) {
    return <div style={{ padding: '20px', color: '#dc2626' }}>Error loading schedule: {error}</div>;
  }

  // Renders the schedule viewer component layout JSX.
  return (
    <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
      {/* Header section with title, refresh button, and delete all button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px' }}>📅 Enrolled Class Schedule (Fall 2026)</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchSchedule}
            style={{ background: 'transparent', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}
          >
            🔄 Refresh
          </button>
          {courses.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#991b1b', fontWeight: 'bold' }}
            >
              🗑️ Delete All
            </button>
          )}
        </div>
      </div>

      {/* Conditionally renders either an empty state message or a grid of enrolled courses */}
      {courses.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No classes found in your schedule. Use the "Add Class Manually" button above to add courses.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
          {courses.map((course, idx) => {
            const isEditing = editingCode === course.code;
            const displayDays = Array.isArray(course.days) ? course.days.join(', ') : course.days;

            return (
              <div 
                key={idx} 
                style={{ 
                  background: course.isCurrentlyActive ? '#f0fdf4' : '#f9fafb', 
                  border: `1px solid ${course.isCurrentlyActive ? '#bbf7d0' : '#e5e7eb'}`, 
                  borderRadius: '6px', 
                  padding: '15px',
                  position: 'relative',
                  boxSizing: 'border-box'
                }}
              >
                {/* Conditionally displays a "HAPPENING NOW" badge if the class is currently active */}
                {course.isCurrentlyActive && !isEditing && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#22c55e', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    HAPPENING NOW
                  </span>
                )}

                {/* Renders either the inline edit form or the standard course details card view */}
                {isEditing && editForm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      value={editForm.code} 
                      onChange={e => setEditForm({ ...editForm, code: e.target.value })} 
                      placeholder="Course Code"
                      style={{ padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    <input 
                      value={editForm.name} 
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                      placeholder="Course Name"
                      style={{ padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    <input 
                      value={editForm.daysInput} 
                      onChange={e => setEditForm({ ...editForm, daysInput: e.target.value })} 
                      placeholder="Days (e.g. Mon,Wed)"
                      style={{ padding: '6px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        value={editForm.startTime} 
                        onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} 
                        placeholder="Start"
                        style={{ padding: '6px', width: '50%', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                      <input 
                        value={editForm.endTime} 
                        onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} 
                        placeholder="End"
                        style={{ padding: '6px', width: '50%', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        value={editForm.building} 
                        onChange={e => setEditForm({ ...editForm, building: e.target.value })} 
                        placeholder="Building"
                        style={{ padding: '6px', width: '50%', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                      <input 
                        value={editForm.room} 
                        onChange={e => setEditForm({ ...editForm, room: e.target.value })} 
                        placeholder="Room"
                        style={{ padding: '6px', width: '50%', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button onClick={handleSaveEdit} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Save</button>
                      <button onClick={() => setEditingCode(null)} style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '16px' }}>{course.code}</h3>
                    <p style={{ margin: '0 0 10px 0', color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>{course.name}</p>
                    
                    <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                      <div>🕒 <strong>Time:</strong> {course.startTime} - {course.endTime}</div>
                      <div>📅 <strong>Days:</strong> {displayDays}</div>
                      <div>📍 <strong>Location:</strong> {course.building} {course.room}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleStartEdit(course)}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(course.code)}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}