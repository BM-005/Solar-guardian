import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db.js';

// Routes
import panelsRouter from './routes/panels.js';
import techniciansRouter from './routes/technicians.js';
import ticketsRouter from './routes/tickets.js';
import faultsRouter from './routes/faults.js';
import weatherRouter from './routes/weather.js';
import analyticsRouter from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/panels', panelsRouter);
app.use('/api/technicians', techniciansRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/faults', faultsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/analytics', analyticsRouter);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Solar Guardian API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;

