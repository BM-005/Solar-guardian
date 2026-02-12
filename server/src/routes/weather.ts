import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

// Get current weather
router.get('/current', async (_req: Request, res: Response) => {
  try {
    const weather = await prisma.weatherData.findFirst({
      orderBy: { recordedAt: 'desc' },
    });

    if (!weather) {
      return res.status(404).json({ error: 'No weather data available' });
    }

    res.json(weather);
  } catch (error) {
    console.error('Error fetching current weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Get weather history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;

    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const weatherHistory = await prisma.weatherData.findMany({
      where: {
        recordedAt: { gte: startDate },
      },
      orderBy: { recordedAt: 'desc' },
    });

    res.json(weatherHistory);
  } catch (error) {
    console.error('Error fetching weather history:', error);
    res.status(500).json({ error: 'Failed to fetch weather history' });
  }
});

// Record new weather data (for IoT sensors)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { temperature, condition, humidity, sunlightIntensity } = req.body;

    const weather = await prisma.weatherData.create({
      data: {
        temperature,
        condition,
        humidity,
        sunlightIntensity,
        recordedAt: new Date(),
      },
    });

    res.status(201).json(weather);
  } catch (error) {
    console.error('Error recording weather:', error);
    res.status(500).json({ error: 'Failed to record weather data' });
  }
});

// Get weather forecast
router.get('/forecast', async (_req: Request, res: Response) => {
  try {
    // In a real app, this would come from a weather API
    // For now, return simulated forecast
    const forecast = [
      { hour: 10, temperature: 26, condition: 'sunny', sunlightIntensity: 88 },
      { hour: 11, temperature: 28, condition: 'sunny', sunlightIntensity: 92 },
      { hour: 12, temperature: 30, condition: 'sunny', sunlightIntensity: 95 },
      { hour: 13, temperature: 31, condition: 'partly-cloudy', sunlightIntensity: 78 },
      { hour: 14, temperature: 30, condition: 'partly-cloudy', sunlightIntensity: 72 },
      { hour: 15, temperature: 29, condition: 'cloudy', sunlightIntensity: 55 },
    ];

    res.json(forecast);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch weather forecast' });
  }
});

export default router;

