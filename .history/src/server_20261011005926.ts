import express from 'express';
import cors from 'cors';
import path from 'path';
import { SSOService } from './auth/ssoService';
import { scheduleRouter } from './auth/schedules/scheduleRouter';
import { authRouter } from './backend/authRouter';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// Change this:
// app.use(express.static(path.join(__dirname, '../public')));

// To this:
app.use(express.static(path.join(import.meta.dirname, '../public')));
app.get('/', (req, res) => {
  res.send('Campus Resource Finder Phase 1 API is running!');
});
// API Routes
app.post('/api/auth/sso', SSOService.handleSSOCallback);
app.use('/api/schedules', scheduleRouter);
// Mount auth routes so /sso-login becomes /api/auth/sso-login
app.use('/api/auth', authRouter);
app.use('/api', scheduleRouter);

app.get('/api/emergency-contacts', (req, res) => {
  res.json({
    campusPolice: '562-985-4101',
    escortService: '562-985-4101',
    healthCenter: '562-985-4141'
  });
});

app.listen(PORT, () => {
  console.log(`Phase 1 Core Infrastructure running on http://localhost:${PORT}`);
});
