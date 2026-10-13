import express from 'express';
import cors from 'cors';
import path from 'path';
import { SSOService } from './auth/ssoService';
import { scheduleRouter } from '.auth/schedules/scheduleRouter';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.post('/api/auth/sso', SSOService.handleSSOCallback);
app.use('/api/schedules', scheduleRouter);

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
