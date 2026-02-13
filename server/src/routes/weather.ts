import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

const buildFallbackForecast = (baseTemp: number, sunlightIntensity: number) => [
  { hour: 10, temperature: Math.round((baseTemp - 1) * 10) / 10, condition: 'sunny', sunlightIntensity: Math.min(95, sunlightIntensity + 10) },
  { hour: 12, temperature: Math.round((baseTemp + 1.5) * 10) / 10, condition: 'sunny', sunlightIntensity: Math.min(98, sunlightIntensity + 15) },
  { hour: 14, temperature: Math.round((baseTemp + 2) * 10) / 10, condition: 'partly-cloudy', sunlightIntensity: Math.max(45, sunlightIntensity - 5) },
  { hour: 16, temperature: Math.round((baseTemp + 0.5) * 10) / 10, condition: 'cloudy', sunlightIntensity: Math.max(30, sunlightIntensity - 20) },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Get current weather
router.get('/current', async (_req: Request, res: Response) => {
  try {
    let weather = await prisma.weatherData.findFirst({
      orderBy: { recordedAt: 'desc' },
    });

    if (!weather) {
      // Ensure API still works even if DB has no weather rows.
      weather = await prisma.weatherData.create({
        data: {
          temperature: 26,
          condition: 'sunny',
          humidity: 48,
          sunlightIntensity: 82,
          recordedAt: new Date(),
        },
      });
    }

    // If latest reading is stale, create a fresh synthetic reading so dashboard updates.
    const isStale = Date.now() - new Date(weather.recordedAt).getTime() > 5 * 60 * 1000;
    if (isStale) {
      const nextTemp = Math.round((weather.temperature + (Math.random() - 0.5) * 1.4) * 10) / 10;
      const nextHumidity = clamp(Math.round(weather.humidity + (Math.random() - 0.5) * 6), 20, 95);
      const nextSun = clamp(Math.round(weather.sunlightIntensity + (Math.random() - 0.5) * 12), 0, 100);

      weather = await prisma.weatherData.create({
        data: {
          temperature: nextTemp,
          condition: nextSun > 70 ? 'sunny' : nextSun > 40 ? 'partly-cloudy' : 'cloudy',
          humidity: nextHumidity,
          sunlightIntensity: nextSun,
          recordedAt: new Date(),
        },
      });
    }

    res.json({
      ...weather,
      windSpeed: clamp(Math.round(8 + Math.random() * 8), 4, 20),
      uvIndex: Math.max(1, Math.round(weather.sunlightIntensity / 12)),
      forecast: buildFallbackForecast(weather.temperature, weather.sunlightIntensity),
    });
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

