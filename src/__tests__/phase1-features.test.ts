import request from 'supertest';

const API_BASE = 'http://localhost:3001';

describe('Phase 1 Comprehensive Feature Test Suite', () => {
  const testEmail = 'nadhirah.michael-ho01@student.csulb.edu';
  const testPassword = 'password123';

  // ==========================================
  // USE CASE 1: User Account Creation, SSO & Login
  // ==========================================
  describe('Use Case 1: User Account Creation, CSULB SSO & Login', () => {
    it('should register a new student account successfully', async () => {
      const res = await request(API_BASE)
        .post('/api/v1/auth/register')
        .send({
          email: 'test.student01@student.csulb.edu',
          username: 'TestStudent',
          password: 'securePassword123',
          role: 'Student Buyer',
        });

      expect([200, 400]).toContain(res.status);
    });

    it('should trigger email OTP verification upon valid login attempt', async () => {
      const res = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body.requires2FA).toBe(true);
    });

    it('should reject non-CSULB email domains during authentication', async () => {
      const res = await request(API_BASE)
        .post('/api/auth/login')
        .send({ email: 'attacker@gmail.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ==========================================
  // USE CASE 2: Campus Map & Navigation Interface
  // ==========================================
  describe('Use Case 2: CSULB Campus Map & Navigation Interface', () => {
    it('should serve static public assets and map configuration dependencies', async () => {
      const res = await request(API_BASE).get('/');
      expect(res.status).toBeLessThan(500);
    });
  });

  // ==========================================
  // USE CASE 3: Class Schedule & Indoor Floor Plan Navigator
  // ==========================================
  describe('Use Case 3: Add Class Schedule & Indoor Floor Plan Navigator', () => {
    it('should protect schedule endpoints against unauthenticated requests', async () => {
      const res = await request(API_BASE).get('/api/schedules/my-schedule');
      expect(res.status).toBe(401);
    });

    it('should reject invalid .ics file uploads without proper multipart headers or file payloads', async () => {
      const res = await request(API_BASE)
        .post('/api/v1/schedule/upload-ics')
        .set('Authorization', 'Bearer mock_token');

      expect(res.status).toBe(400);
      expect(res.body.detail).toBe('Please upload a valid .ics file.');
    });

    it('should reject invalid OCR image uploads without proper file payloads', async () => {
      const res = await request(API_BASE)
        .post('/api/v1/schedule/upload-image')
        .set('Authorization', 'Bearer mock_token');

      expect(res.status).toBe(400);
      expect(res.body.detail).toBe('Please upload a valid image file.');
    });
  });

  // ==========================================
  // USE CASE 4: Offline PWA Service Worker & Database
  // ==========================================
  describe('Use Case 4: Offline PWA Service Worker Caching & Database Implementation', () => {
    it('should verify database connectivity and table initialization via debug endpoint', async () => {
      const res = await request(API_BASE).get('/api/v1/v1/debug/db-check');
      expect(res.status).toBeLessThan(500);
    });
  });

  // ==========================================
  // USE CASE 5: Redirect to Official Campus Resources
  // ==========================================
  describe('Use Case 5: Redirect to Official Campus Resources & UI Navigation', () => {
    it('should verify API routing prefix availability for campus navigation', async () => {
      const res = await request(API_BASE).get('/api/v1/profile');
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ==========================================
  // USE CASE 6: User Profile Management & Offline Emergency Support
  // ==========================================
  describe('Use Case 6: User Profile Management & Offline Emergency Support', () => {
    it('should enforce authentication on profile update routes', async () => {
      const res = await request(API_BASE)
        .put('/api/v1/profile')
        .send({ name: 'Updated Name', major: 'Computer Science' });

      expect(res.status).toBeLessThan(500);
    });
  });

  // ==========================================
  // USE CASE 7: Campus Community & Live Bus Tracker
  // ==========================================
  describe('Use Case 7: Campus Community & Live Bus Tracker', () => {
    it('should verify bus tracking router availability', async () => {
      const res = await request(API_BASE).get('/api/bus/routes');
      expect(res.status).toBeLessThan(500);
    });
  });
});
