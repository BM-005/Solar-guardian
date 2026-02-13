import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, CloudSun, Sun, CloudLightning, Droplets, SunDim } from 'lucide-react';
import { WeatherData } from '@/types/solar';
import { cn } from '@/lib/utils';

interface WeatherWidgetProps {
  weather: WeatherData;
}

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  'partly-cloudy': CloudSun,
  rainy: CloudRain,
  stormy: CloudLightning,
};

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  const WeatherIcon = weatherIcons[weather.condition as keyof typeof weatherIcons] ?? CloudSun;
  const forecast = Array.isArray(weather.forecast) ? weather.forecast : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Weather Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-accent/20 p-4">
              <WeatherIcon className="h-10 w-10 text-accent" />
            </div>
            <div>
              <div className="text-4xl font-bold">{Math.round(weather.temperature)}°C</div>
              <div className="text-sm capitalize text-muted-foreground">
                {String(weather.condition).replace('-', ' ')}
              </div>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="flex items-center justify-end gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{Math.round(weather.humidity)}%</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <SunDim className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{Math.round(weather.sunlightIntensity)}%</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Today's Forecast</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {forecast.map((fc, idx) => {
              const FcIcon = weatherIcons[fc.condition as keyof typeof weatherIcons] ?? CloudSun;
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex min-w-[70px] flex-col items-center rounded-lg border p-3',
                    idx === 1 && 'border-primary bg-primary/5'
                  )}
                >
                  <span className="text-xs text-muted-foreground">{fc.hour}:00</span>
                  <FcIcon className="my-2 h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{Math.round(fc.temperature)}°</span>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.max(0, Math.min(100, fc.sunlightIntensity))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
