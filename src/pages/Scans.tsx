import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Search,
  Clock,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  Eye,
  Trash2,
  RefreshCw,
  Camera,
  Zap,
  Image,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePiReceiver } from '@/hooks/usePiReceiver';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiReport {
  healthScore: number;
  recommendation: string;
  summary: string;
  rootCause: string;
  impactAssessment: string;
  timeframe: string;
  source: string;
  baselineAware: boolean;
  deviationFromBaseline: string;
  genaiInsights: string;
}

interface SolarScanFromAPI {
  id: string;
  backendId?: string;
  timestamp: string;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  status: 'pending' | 'processed' | 'archived';
  thermalMinTemp: number | null;
  thermalMaxTemp: number | null;
  thermalMeanTemp: number | null;
  thermalDelta: number | null;
  riskScore: number | null;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | null;
  thermalImageUrl: string | null;
  rgbImageUrl: string | null;
  dustyPanelCount: number;
  cleanPanelCount: number;
  totalPanels: number;
  deviceId: string | null;
  deviceName: string | null;
  aiReport?: AiReport | null;
  panelDetections: Array<{
    id: string;
    scanId: string;
    panelNumber: string;
    status: 'CLEAN' | 'DUSTY' | 'FAULTY' | 'UNKNOWN';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    cropImageUrl: string | null;
    faultType: string | null;
    confidence: number | null;
    solarPanelId: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isPiScan?: boolean;
}

interface SolarScanStats {
  totalScans: number;
  pendingScans: number;
  processedScans: number;
  criticalScans: number;
  highRiskScans: number;
  avgThermalDelta: number;
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  MODERATE: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  LOW: 'bg-green-500/10 text-green-500 border-green-500/30',
};

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-500 text-white',
  MEDIUM: 'bg-yellow-500 text-black',
  NORMAL: 'bg-green-500 text-white',
};

const statusColors: Record<string, string> = {
  pending: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  processed: 'bg-green-500/10 text-green-500 border-green-500/30',
  archived: 'bg-muted text-muted-foreground border-muted',
};

const panelStatusColors: Record<string, string> = {
  CLEAN: 'bg-green-500/10 text-green-500 border-green-500/30',
  DUSTY: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  FAULTY: 'bg-red-500/10 text-red-500 border-red-500/30',
  UNKNOWN: 'bg-muted text-muted-foreground border-muted',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Scans() {
  const [scans, setScans] = useState<SolarScanFromAPI[]>([]);
  const [stats, setStats] = useState<SolarScanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScan, setSelectedScan] = useState<SolarScanFromAPI | null>(null);
  const [scanDetailsOpen, setScanDetailsOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'api' | 'pi'>('all');

  const {
    isConnected: isPiConnected,
    isConnecting: isPiConnecting,
    error: piError,
    piScans,
    totalPiScans,
    serverUrl,
    connect: connectToPi,
    disconnect: disconnectFromPi,
  } = usePiReceiver();

  const [piUrlInput, setPiUrlInput] = useState(serverUrl);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchScans = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '50');
      const response = await fetch(`/api/solar-scans?${params.toString()}`);
      if (response.ok) setScans(await response.json());
    } catch (err) {
      console.warn('Failed to fetch scans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/solar-scans/stats/summary');
      if (response.ok) setStats(await response.json());
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchScans();
    fetchStats();
  }, [statusFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleViewScan = (scan: SolarScanFromAPI) => {
    setSelectedScan(scan);
    setScanDetailsOpen(true);
  };

  const handleUpdateStatus = async (scanId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/solar-scans/${scanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) { fetchScans(); fetchStats(); }
    } catch (err) {
      console.error('Failed to update scan status:', err);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;
    try {
      const response = await fetch(`/api/solar-scans/${scanId}`, { method: 'DELETE' });
      if (response.ok) { fetchScans(); fetchStats(); setScanDetailsOpen(false); }
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  // ── Merge + filter ─────────────────────────────────────────────────────────

  const allScans: SolarScanFromAPI[] = [
    ...piScans.map(s => ({ ...s, isPiScan: true })),
    ...scans.map(s => ({ ...s, isPiScan: false })),
  ];

  const filteredScans = allScans.filter(scan => {
    if (sourceFilter === 'api' && scan.isPiScan) return false;
    if (sourceFilter === 'pi' && !scan.isPiScan) return false;
    const q = searchQuery.toLowerCase();
    return (
      scan.id.toLowerCase().includes(q) ||
      (scan.deviceName?.toLowerCase().includes(q) ?? false) ||
      (scan.deviceId?.toLowerCase().includes(q) ?? false)
    );
  });

  const getRelativeTime = (dateStr: string) =>
    formatDistanceToNow(new Date(dateStr), { addSuffix: true });

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading scans...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solar Scans</h1>
        <p className="text-muted-foreground">View and manage Raspberry Pi solar panel scans</p>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
                <p className="text-3xl font-bold">{stats.totalScans}</p>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3">
                <Camera className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold">{stats.pendingScans}</p>
              </div>
              <div className="rounded-xl bg-yellow-500/10 p-3">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processed</p>
                <p className="text-3xl font-bold">{stats.processedScans}</p>
              </div>
              <div className="rounded-xl bg-green-500/10 p-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-3xl font-bold text-red-500">{stats.criticalScans}</p>
              </div>
              <div className="rounded-xl bg-red-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Delta</p>
                <p className="text-3xl font-bold">{stats.avgThermalDelta?.toFixed(1)}°C</p>
              </div>
              <div className="rounded-xl bg-orange-500/10 p-3">
                <Thermometer className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Pi Connection Card ────────────────────────────────────────────────── */}
      <Card className={isPiConnected ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5'}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isPiConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
              ) : isPiConnected ? (
                <Wifi className="h-6 w-6 text-green-500" />
              ) : (
                <WifiOff className="h-6 w-6 text-red-500" />
              )}
              <div>
                <p className="font-semibold">
                  {isPiConnected ? 'Connected to Pi Receiver' : isPiConnecting ? 'Connecting…' : 'Disconnected from Pi'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Server: {serverUrl || 'localhost:3000'} • Live Scans: {totalPiScans}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter Pi Receiver URL"
                value={piUrlInput}
                onChange={(e) => setPiUrlInput(e.target.value)}
                className="w-[250px]"
                disabled={isPiConnected || isPiConnecting}
              />
              {isPiConnected ? (
                <Button variant="destructive" onClick={disconnectFromPi} disabled={isPiConnecting}>
                  <WifiOff className="mr-2 h-4 w-4" /> Disconnect
                </Button>
              ) : (
                <Button onClick={() => connectToPi(piUrlInput)} disabled={isPiConnecting || !piUrlInput}>
                  {isPiConnecting
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Wifi className="mr-2 h-4 w-4" />}
                  Connect
                </Button>
              )}
            </div>
          </div>
          {piError && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-500">
              Connection Error: {piError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ID or device name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as 'all' | 'api' | 'pi')}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="api">API Scans</SelectItem>
            <SelectItem value="pi">Live Pi Scans</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { fetchScans(); fetchStats(); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ── Scan Details Dialog ───────────────────────────────────────────────── */}
      <Dialog open={scanDetailsOpen} onOpenChange={setScanDetailsOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Scan Details
              {selectedScan?.isPiScan && (
                <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/30 ml-1">
                  LIVE Pi Scan
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedScan && (
            <div className="space-y-5">

              {/* 1 ── Scan Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Scan ID</label>
                  <p className="mt-1 text-sm font-mono">{selectedScan.id.slice(0, 12)}…</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Timestamp</label>
                  <p className="mt-1 text-sm">{getRelativeTime(selectedScan.timestamp)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedScan.status] || statusColors.pending}>
                      {selectedScan.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <div className="mt-1">
                    <Badge className={priorityColors[selectedScan.priority] || priorityColors.NORMAL}>
                      {selectedScan.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Device</label>
                  <p className="mt-1 text-sm">{selectedScan.deviceName || selectedScan.deviceId || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total Panels</label>
                  <p className="mt-1 text-sm font-semibold">{selectedScan.totalPanels}</p>
                </div>
              </div>

              {/* 2 ── Thermal Analysis */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  Thermal Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Min Temp', val: selectedScan.thermalMinTemp },
                    { label: 'Max Temp', val: selectedScan.thermalMaxTemp },
                    { label: 'Mean Temp', val: selectedScan.thermalMeanTemp },
                    { label: 'Delta', val: selectedScan.thermalDelta },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <p className="text-lg font-semibold">
                        {val != null ? `${val.toFixed(1)}°C` : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <label className="text-xs text-muted-foreground">Risk Score</label>
                    <p className={cn('text-2xl font-bold',
                      (selectedScan.riskScore ?? 0) >= 80 ? 'text-red-500' :
                        (selectedScan.riskScore ?? 0) >= 60 ? 'text-orange-500' :
                          (selectedScan.riskScore ?? 0) >= 30 ? 'text-yellow-500' : 'text-green-500'
                    )}>
                      {selectedScan.riskScore ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Severity</label>
                    <div className="mt-1">
                      <Badge className={severityColors[selectedScan.severity || 'LOW'] || severityColors.LOW}>
                        {selectedScan.severity || 'LOW'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 ── Captured Images */}
              {(selectedScan.rgbImageUrl || selectedScan.thermalImageUrl) && (
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Captured Images
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedScan.rgbImageUrl && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">RGB Capture</label>
                        <img
                          src={selectedScan.rgbImageUrl}
                          alt="RGB Capture"
                          className="w-full rounded-md object-cover"
                          style={{ maxHeight: 200 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {selectedScan.thermalImageUrl && (
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Thermal Image</label>
                        <img
                          src={selectedScan.thermalImageUrl}
                          alt="Thermal"
                          className="w-full rounded-md object-cover"
                          style={{ maxHeight: 200 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4 ── Panel Status Summary + Crops */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Panel Status Summary
                </h4>
                <div className="flex gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-semibold text-lg">{selectedScan.cleanPanelCount}</span>
                    <span className="text-muted-foreground">Clean</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span className="text-orange-500 font-semibold text-lg">{selectedScan.dustyPanelCount}</span>
                    <span className="text-muted-foreground">Dusty</span>
                  </div>
                </div>

                {/* Individual panel crops */}
                {selectedScan.panelDetections && selectedScan.panelDetections.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Individual Panels</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedScan.panelDetections.map((panel) => (
                        <div
                          key={panel.id}
                          className={cn(
                            'rounded border overflow-hidden',
                            panel.status === 'DUSTY' ? 'border-orange-500/40' :
                              panel.status === 'CLEAN' ? 'border-green-500/40' : 'border-muted'
                          )}
                        >
                          {panel.cropImageUrl && (
                            <img
                              src={panel.cropImageUrl}
                              alt={`Panel ${panel.panelNumber}`}
                              className="w-full h-20 object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="flex items-center justify-between px-2 py-1 bg-muted/30">
                            <span className="text-xs font-mono font-semibold">{panel.panelNumber}</span>
                            <Badge className={cn('text-xs', panelStatusColors[panel.status] || panelStatusColors.UNKNOWN)}>
                              {panel.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5 ── AI Fusion Report */}
              {selectedScan.aiReport && (
                <div className="rounded-lg border p-4 bg-muted/20">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    AI Fusion Report
                    <Badge variant="outline" className="ml-1 text-xs">
                      {selectedScan.aiReport.source || 'AI'}
                    </Badge>
                  </h4>

                  {/* Health score bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-muted-foreground">Health Score</label>
                      <span className={cn('text-xl font-bold',
                        selectedScan.aiReport.healthScore >= 80 ? 'text-green-500' :
                          selectedScan.aiReport.healthScore >= 60 ? 'text-yellow-500' :
                            selectedScan.aiReport.healthScore >= 40 ? 'text-orange-500' : 'text-red-500'
                      )}>
                        {selectedScan.aiReport.healthScore}/100
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all',
                          selectedScan.aiReport.healthScore >= 80 ? 'bg-green-500' :
                            selectedScan.aiReport.healthScore >= 60 ? 'bg-yellow-500' :
                              selectedScan.aiReport.healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                        )}
                        style={{ width: `${selectedScan.aiReport.healthScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {selectedScan.aiReport.recommendation && (
                      <div className="rounded bg-muted/40 p-3">
                        <label className="text-xs text-muted-foreground block mb-1">Recommendation</label>
                        <p className="font-medium">{selectedScan.aiReport.recommendation}</p>
                      </div>
                    )}
                    {selectedScan.aiReport.timeframe && (
                      <div className="rounded bg-muted/40 p-3">
                        <label className="text-xs text-muted-foreground block mb-1">Timeframe</label>
                        <p>{selectedScan.aiReport.timeframe}</p>
                      </div>
                    )}
                    {selectedScan.aiReport.summary && (
                      <div className="rounded bg-muted/40 p-3 md:col-span-2">
                        <label className="text-xs text-muted-foreground block mb-1">Summary</label>
                        <p>{selectedScan.aiReport.summary}</p>
                      </div>
                    )}
                    {selectedScan.aiReport.rootCause && (
                      <div className="rounded bg-muted/40 p-3">
                        <label className="text-xs text-muted-foreground block mb-1">Root Cause</label>
                        <p>{selectedScan.aiReport.rootCause}</p>
                      </div>
                    )}
                    {selectedScan.aiReport.impactAssessment && (
                      <div className="rounded bg-muted/40 p-3">
                        <label className="text-xs text-muted-foreground block mb-1">Impact Assessment</label>
                        <p>{selectedScan.aiReport.impactAssessment}</p>
                      </div>
                    )}
                    {selectedScan.aiReport.baselineAware && selectedScan.aiReport.deviationFromBaseline !== 'N/A' && (
                      <div className="rounded bg-muted/40 p-3">
                        <label className="text-xs text-muted-foreground block mb-1">Baseline Deviation</label>
                        <p>{selectedScan.aiReport.deviationFromBaseline}</p>
                      </div>
                    )}
                    {selectedScan.aiReport.genaiInsights && (
                      <div className="rounded bg-blue-500/10 border border-blue-500/20 p-3 md:col-span-2">
                        <label className="text-xs text-blue-400 block mb-1">✨ GenAI Insights</label>
                        <p>{selectedScan.aiReport.genaiInsights}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6 ── Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {selectedScan.status === 'pending' && (
                  <Button onClick={() => handleUpdateStatus(selectedScan.id, 'processed')}>
                    Mark as Processed
                  </Button>
                )}
                {selectedScan.status === 'processed' && (
                  <Button onClick={() => handleUpdateStatus(selectedScan.id, 'archived')}>
                    Archive
                  </Button>
                )}
                <Button variant="destructive" onClick={() => handleDeleteScan(selectedScan.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Scan List ─────────────────────────────────────────────────────────── */}
      {filteredScans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No scans found</h3>
          <p className="text-muted-foreground">
            {allScans.length === 0
              ? 'No scans received from Raspberry Pi yet.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScans.map((scan) => (
            <Card key={scan.id} className="card-hover">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                  {/* Left — icon + name */}
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2',
                      scan.severity === 'CRITICAL' ? 'bg-red-500/10' :
                        scan.severity === 'HIGH' ? 'bg-orange-500/10' :
                          scan.severity === 'MODERATE' ? 'bg-yellow-500/10' : 'bg-green-500/10'
                    )}>
                      <Thermometer className={cn('h-5 w-5',
                        scan.severity === 'CRITICAL' ? 'text-red-500' :
                          scan.severity === 'HIGH' ? 'text-orange-500' :
                            scan.severity === 'MODERATE' ? 'text-yellow-500' : 'text-green-500'
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold">{scan.deviceName || 'Unknown Device'}</p>
                      <p className="text-sm text-muted-foreground">{getRelativeTime(scan.timestamp)}</p>
                    </div>
                  </div>

                  {/* Middle — stats */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span>{scan.totalPanels} panels</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{scan.cleanPanelCount} clean</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>{scan.dustyPanelCount} dusty</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {scan.isPiScan && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                          LIVE
                        </Badge>
                      )}
                      {scan.severity && (
                        <Badge className={severityColors[scan.severity] || severityColors.LOW}>
                          {scan.severity}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right — badges + view button */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[scan.status] || statusColors.pending}>
                      {scan.status}
                    </Badge>
                    <Badge className={priorityColors[scan.priority] || priorityColors.NORMAL}>
                      {scan.priority}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleViewScan(scan)}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
