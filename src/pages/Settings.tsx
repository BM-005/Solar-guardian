import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Database,
  Wifi,
  Cpu
} from 'lucide-react';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Settings state
  const [settings, setSettings] = useState({
    // User Profile
    name: 'Admin User',
    email: 'admin@solarfarm.com',
    twoFactor: false,

    // Notifications
    criticalAlerts: true,
    warningAlerts: true,
    emailReports: false,
    smsCritical: false,

    // Appearance
    darkMode: theme === 'dark',
    animations: true,
    compact: false,

    // Data Settings
    refreshRate: 30,
    autoRefresh: true,
    cache: true,

    // API Configuration
    weatherApi: '',
    droneApi: 'http://localhost:8081/api',
    aiEndpoint: 'http://localhost:5000/analyze',
    apiLogging: true,
  });

  // Update dark mode when theme changes
  useEffect(() => {
    setSettings(prev => ({ ...prev, darkMode: theme === 'dark' }));
  }, [theme]);

  const handleSwitchChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    if (key === 'darkMode') {
      setTheme(value ? 'dark' : 'light');
    }
  };

  const handleInputChange = (key: string, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('solar-settings', JSON.stringify(settings));

    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleReset = () => {
    const defaultSettings = {
      name: 'Admin User',
      email: 'admin@solarfarm.com',
      twoFactor: false,
      criticalAlerts: true,
      warningAlerts: true,
      emailReports: false,
      smsCritical: false,
      darkMode: false,
      animations: true,
      compact: false,
      refreshRate: 30,
      autoRefresh: true,
      cache: true,
      weatherApi: '',
      droneApi: 'http://localhost:8081/api',
      aiEndpoint: 'http://localhost:5000/analyze',
      apiLogging: true,
    };

    setSettings(defaultSettings);
    setTheme('light');

    localStorage.removeItem('solar-settings');

    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
    });
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('solar-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(prev => ({ ...prev, ...parsed }));
    }
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your dashboard preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              User Profile
            </CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" defaultValue="System Administrator" disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor">Two-factor authentication</Label>
              <Switch
                id="two-factor"
                checked={settings.twoFactor}
                onCheckedChange={(checked) => handleSwitchChange('twoFactor', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="critical-alerts">Critical fault alerts</Label>
              <Switch
                id="critical-alerts"
                checked={settings.criticalAlerts}
                onCheckedChange={(checked) => handleSwitchChange('criticalAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="warning-alerts">Warning notifications</Label>
              <Switch
                id="warning-alerts"
                checked={settings.warningAlerts}
                onCheckedChange={(checked) => handleSwitchChange('warningAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-reports">Daily email reports</Label>
              <Switch
                id="email-reports"
                checked={settings.emailReports}
                onCheckedChange={(checked) => handleSwitchChange('emailReports', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-critical">SMS for critical issues</Label>
              <Switch
                id="sms-critical"
                checked={settings.smsCritical}
                onCheckedChange={(checked) => handleSwitchChange('smsCritical', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the dashboard look</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark mode</Label>
              <Switch
                id="dark-mode"
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSwitchChange('darkMode', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="animations">Enable animations</Label>
              <Switch
                id="animations"
                checked={settings.animations}
                onCheckedChange={(checked) => handleSwitchChange('animations', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="compact">Compact view</Label>
              <Switch
                id="compact"
                checked={settings.compact}
                onCheckedChange={(checked) => handleSwitchChange('compact', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Refresh */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Settings
            </CardTitle>
            <CardDescription>Configure data refresh rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refresh-rate">Refresh interval (seconds)</Label>
              <Input
                id="refresh-rate"
                type="number"
                value={settings.refreshRate}
                onChange={(e) => handleInputChange('refreshRate', parseInt(e.target.value) || 30)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh">Auto-refresh data</Label>
              <Switch
                id="auto-refresh"
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => handleSwitchChange('autoRefresh', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cache">Enable caching</Label>
              <Switch
                id="cache"
                checked={settings.cache}
                onCheckedChange={(checked) => handleSwitchChange('cache', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>Configure external API connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weather-api">Weather API Key</Label>
              <Input
                id="weather-api"
                type="password"
                placeholder="Enter API key"
                value={settings.weatherApi}
                onChange={(e) => handleInputChange('weatherApi', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drone-api">Drone Control API URL</Label>
              <Input
                id="drone-api"
                value={settings.droneApi}
                onChange={(e) => handleInputChange('droneApi', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-endpoint">AI Analysis Endpoint</Label>
              <Input
                id="ai-endpoint"
                value={settings.aiEndpoint}
                onChange={(e) => handleInputChange('aiEndpoint', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="api-logging">Enable API logging</Label>
              <Switch
                id="api-logging"
                checked={settings.apiLogging}
                onCheckedChange={(checked) => handleSwitchChange('apiLogging', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Backend connection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span>Drone Controller</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Database</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>AI Model</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              All systems are operational. Real-time data is being processed.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
