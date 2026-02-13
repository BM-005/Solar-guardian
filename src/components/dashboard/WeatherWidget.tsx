import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, CloudSun, Sun, CloudLightning, Droplets, SunDim } from 'lucide-react';
import { WeatherData } from '@/types/solar';

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
      </CardContent>
    </Card>
  );
}

