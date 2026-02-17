// =====================================================
// RASPBERRY PI RECEIVER TYPES
// =====================================================

export type ScanSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type ScanStatus = 'pending' | 'processed' | 'archived';
export type PanelDetectionStatus = 'CLEAN' | 'DUSTY' | 'FAULTY' | 'UNKNOWN';

export interface ThermalData {
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
  delta: number;
  riskScore: number;
  severity: ScanSeverity;
  timestamp: string;
}

export interface PanelDetection {
  id: string;
  scanId: string;
  panelNumber: string;
  status: PanelDetectionStatus;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cropImageUrl: string | null;
  faultType: string | null;
  confidence: number | null;
  solarPanelId: string | null;
  createdAt: string;
}

export interface SolarScan {
  id: string;
  backendId?: string;
  timestamp: string;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  status: ScanStatus;

  // Thermal analysis data
  thermalMinTemp: number | null;
  thermalMaxTemp: number | null;
  thermalMeanTemp: number | null;
  thermalDelta: number | null;
  riskScore: number | null;
  severity: ScanSeverity | null;
  thermalImageUrl: string | null;
  rgbImageUrl?: string | null;

  // Summary counts
  dustyPanelCount: number;
  cleanPanelCount: number;
  totalPanels: number;

  // Source device info
  deviceId: string | null;
  deviceName: string | null;

  // ── NEW: AI Fusion Report fields (populated from Pi report) ──────────────
  aiReport?: {
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
  } | null;

  // Relations
  panelDetections: PanelDetection[];

  createdAt: string;
  updatedAt: string;
}

export interface SolarScanStats {
  totalScans: number;
  pendingScans: number;
  processedScans: number;
  criticalScans: number;
  highRiskScans: number;
  avgThermalDelta: number;
}

export interface WeatherForecast {
  hour: number;
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'partly-cloudy' | 'rainy' | 'stormy';
  sunlightIntensity: number;
}

export interface PowerGeneration {
  timestamp: Date;
  value: number;
}

export interface DashboardMetrics {
  totalPanels: number;
  healthyPanels: number;
  warningPanels: number;
  faultPanels: number;
  offlinePanels: number;
  currentGeneration: number;
  maxCapacity: number;
  efficiency: number;
  availableTechnicians: number;
  openTickets: number;
}

// =====================================================
// RASPBERRY PI PAYLOAD TYPES
// =====================================================

export interface PiReport {
  health_score: number;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  recommendation: string;
  timeframe: string;
  summary: string;
  root_cause: string;
  impact_assessment: string;
  // Extra Pi fields
  source?: string;
  baseline_aware?: boolean;
  deviation_from_baseline?: string;
  genai_insights?: string;
}

export interface PiRgbStats {
  total: number;
  clean: number;
  dusty: number;
}

export interface PiPanelCrop {
  panel_number: string;
  status: 'CLEAN' | 'DUSTY' | 'FAULTY' | 'UNKNOWN';
  has_dust: boolean;
  image_b64?: string;
  web_path?: string | null;
}

// Thermal data block — Pi may send this as 'thermal' OR 'thermal_stats'
export interface PiThermalBlock {
  min_temp?: number | null;
  max_temp?: number | null;
  mean_temp?: number | null;
  delta?: number | null;
  risk_score?: number | null;
  severity?: ScanSeverity | null;
  // Extra fields from thermal_stats
  fault?: string;
  baseline_delta?: number | null;
}

export interface PiAnalysisResult {
  id?: string;
  capture_id: string;
  timestamp: string;
  received_at?: string;
  report: PiReport;
  rgb_stats: PiRgbStats;
  frame_b64?: string;
  main_image_web?: string | null;
  thermal_b64?: string;
  thermal_image_web?: string | null;
  // Pi sends either 'thermal' or 'thermal_stats' — handle both
  thermal?: PiThermalBlock;
  thermal_stats?: PiThermalBlock;
  panel_crops: PiPanelCrop[];
}

// ─── Convert Pi payload → SolarScan for the Scans page ──────────────────────
export function convertPiResultToSolarScan(piResult: PiAnalysisResult): SolarScan {
  const cleanCount = piResult.rgb_stats?.clean ?? 0;
  const dustyCount = piResult.rgb_stats?.dusty ?? 0;
  const totalPanels = piResult.rgb_stats?.total ?? 0;

  // ── FIX: read 'thermal' first, fall back to 'thermal_stats' ─────────────
  const thermalBlock: PiThermalBlock = piResult.thermal ?? piResult.thermal_stats ?? {};

  // Determine severity from thermal block or health score
  let severity: ScanSeverity = 'LOW';
  if (thermalBlock.severity) {
    severity = thermalBlock.severity;
  } else {
    const hs = piResult.report?.health_score ?? 100;
    if (hs < 30) severity = 'CRITICAL';
    else if (hs < 50) severity = 'HIGH';
    else if (hs < 75) severity = 'MODERATE';
  }

  const thermalRisk =
    thermalBlock.risk_score ??
    Math.max(0, Math.min(100, Math.round(100 - (piResult.report?.health_score ?? 100))));

  // ── Image URLs ────────────────────────────────────────────────────────────
  // Use web paths served by the Node server (saved to disk by server/src/index.ts)
  const rgbUrl = piResult.main_image_web ?? null;
  const thermalUrl = piResult.thermal_image_web ?? null;

  // ── AI Fusion Report ──────────────────────────────────────────────────────
  const report = piResult.report ?? ({} as PiReport);
  const aiReport = {
    healthScore: report.health_score ?? 0,
    recommendation: report.recommendation ?? '',
    summary: report.summary ?? '',
    rootCause: report.root_cause ?? '',
    impactAssessment: report.impact_assessment ?? '',
    timeframe: report.timeframe ?? '',
    source: report.source ?? 'fallback',
    baselineAware: report.baseline_aware ?? false,
    deviationFromBaseline: report.deviation_from_baseline ?? 'N/A',
    genaiInsights: report.genai_insights ?? '',
  };

  return {
    id: `pi-${piResult.capture_id}`,
    backendId: piResult.id,
    timestamp: piResult.received_at || piResult.timestamp,
    priority: report.priority ?? 'NORMAL',
    status: 'pending',

    // Thermal
    thermalMinTemp: thermalBlock.min_temp ?? null,
    thermalMaxTemp: thermalBlock.max_temp ?? null,
    thermalMeanTemp: thermalBlock.mean_temp ?? null,
    thermalDelta: thermalBlock.delta ?? null,
    riskScore: thermalRisk,
    severity,

    // Images
    thermalImageUrl: thermalUrl,
    rgbImageUrl: rgbUrl,

    // Panel counts
    dustyPanelCount: dustyCount,
    cleanPanelCount: cleanCount,
    totalPanels,

    // Device
    deviceId: 'raspberry-pi',
    deviceName: 'Raspberry Pi Scanner',

    // AI Report
    aiReport,

    // Panel detections
    panelDetections: (piResult.panel_crops ?? []).map((crop, index) => ({
      id: `det-${piResult.capture_id}-${index}`,
      scanId: `pi-${piResult.capture_id}`,
      panelNumber: crop.panel_number,
      status: crop.status,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 100,
      cropImageUrl: crop.web_path ?? null,
      faultType: crop.has_dust ? 'dust' : null,
      confidence: null,
      solarPanelId: null,
      createdAt: piResult.received_at || new Date().toISOString(),
    })),

    createdAt: piResult.received_at || new Date().toISOString(),
    updatedAt: piResult.received_at || new Date().toISOString(),
  };
}