import { useEffect, useState } from 'react';
import {
  Sun,
  Zap,
  Gauge,
  Leaf,
  Users,
  AlertTriangle
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { PowerChart } from '@/components/dashboard/PowerChart';

import { PanelHealthOverview } from '@/components/dashboard/PanelHealthOverview';
import {
  mockDashboardMetrics,
  mockWeather,
  mockFaultDetections,
  mockAnalytics
} from '@/data/mockData';
import type { DashboardMetrics } from '@/lib/api';
import type { WeatherData } from '@/types/solar';

interface DashboardData {
  metrics: DashboardMetrics;
  weather: WeatherData;
  analytics: typeof mockAnalytics;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data from real APIs
        const [metricsRes, weatherRes, powerDailyRes, powerWeeklyRes, powerMonthlyRes] = await Promise.all([
          fetch('/api/analytics/dashboard'),
          fetch('/api/weather/current'),
          fetch('/api/analytics/power?period=daily'),
          fetch('/api/analytics/power?period=weekly'),
          fetch('/api/analytics/power?period=monthly'),
        ]);

        const metrics = metricsRes.ok ? await metricsRes.json() : mockDashboardMetrics;
        const weatherApi = weatherRes.ok ? await weatherRes.json() : null;
        const powerDaily = powerDailyRes.ok ? await powerDailyRes.json() : mockAnalytics.powerGeneration.daily;
        const powerWeekly = powerWeeklyRes.ok ? await powerWeeklyRes.json() : mockAnalytics.powerGeneration.weekly;
        const powerMonthly = powerMonthlyRes.ok ? await powerMonthlyRes.json() : mockAnalytics.powerGeneration.monthly;

        // Transform weather data
        const weather = weatherApi ? {
          ...weatherApi,
          windSpeed: 15, // default
          uvIndex: Math.floor(weatherApi.sunlightIntensity / 10), // estimate
          forecast: mockWeather.forecast, // use mock forecast
        } : mockWeather;

        setData({
          metrics,
          weather,
          analytics: {
            ...mockAnalytics,
            powerGeneration: {
              daily: powerDaily,
              weekly: powerWeekly,
              monthly: powerMonthly,
            },
          },
        });
      } catch (err) {
        console.log('Using mock data (API unavailable):', err);
        // Fallback to mock data
        setData({
          metrics: mockDashboardMetrics,
          weather: mockWeather,
          analytics: mockAnalytics
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold">Error loading data</p>
          <p className="text-muted-foreground">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const { metrics, weather, analytics } = data;



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time monitoring of your solar farm performance
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total Panels"
          value={metrics.totalPanels}
          icon={Sun}
          trend={{ value: 2.5, isPositive: true }}
        />
        <MetricCard
          title="Current Generation"
          value={metrics.currentGeneration}
          suffix="kW"
          icon={Zap}
          trend={{ value: 8.3, isPositive: true }}
        />
        <MetricCard
          title="Efficiency"
          value={Math.round(metrics.efficiency)}
          suffix="%"
          icon={Gauge}
          variant={metrics.efficiency > 85 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Carbon Saved"
          value={metrics.carbonSaved}
          suffix="kg"
          icon={Leaf}
          variant="success"
        />
        <MetricCard
          title="Technicians"
          value={metrics.availableTechnicians}
          suffix="available"
          icon={Users}
        />
        <MetricCard
          title="Open Tickets"
          value={metrics.openTickets}
          icon={AlertTriangle}
          variant={metrics.openTickets > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts */}
        <div className="space-y-6 lg:col-span-2">
          <PowerChart
            daily={analytics.powerGeneration.daily}
            weekly={analytics.powerGeneration.weekly}
            monthly={analytics.powerGeneration.monthly}
          />
          <PanelHealthOverview
            healthy={metrics.healthyPanels}
            warning={metrics.warningPanels}
            fault={metrics.faultPanels}
            offline={metrics.offlinePanels}
            total={metrics.totalPanels}
          />
        </div>

        {/* Right Column - Weather */}
        <div className="space-y-6">
          <WeatherWidget weather={weather} />
        </div>
      </div>
    </div>
  );
}

