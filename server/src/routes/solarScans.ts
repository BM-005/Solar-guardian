import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { createFaultTicketAndAssignment, generateIncidentId, normalizeSeverity, priorityFromSeverity } from './automation.js';
import { generateAlertId } from './alerts.js';

const router = Router();
const DUPLICATE_WINDOW_SECONDS = 120;
const toJpegDataUrl = (rawData?: string | null) => {
  if (!rawData) return null;
  if (rawData.startsWith('data:image/')) return rawData;
  const parts = rawData.split(',');
  const base64Data = parts.length > 1 ? parts[1] : parts[0];
  return `data:image/jpeg;base64,${base64Data}`;
};

const parseRowNumberFromPanelId = (panelId?: string | null): number | null => {
  if (!panelId) return null;
  const normalized = String(panelId).trim().toUpperCase();

  // Canonical format: PNL-A0201 -> row 02
  const canonicalMatch = normalized.match(/^PNL-[A-Z](\d{2})\d{2}$/);
  if (canonicalMatch) {
    const row = Number.parseInt(canonicalMatch[1], 10);
    return Number.isFinite(row) ? row : null;
  }

  // Short format: A0201 -> row 02
  const compactMatch = normalized.match(/^[A-Z](\d{2})\d{2}$/);
  if (compactMatch) {
    const row = Number.parseInt(compactMatch[1], 10);
    return Number.isFinite(row) ? row : null;
  }

  // Legacy fallback for values like 201/301 where row is the hundreds digit.
  const numberMatch = normalized.match(/(\d+)/);
  if (!numberMatch) return null;
  const value = Number.parseInt(numberMatch[1], 10);
  if (!Number.isFinite(value)) return null;
  if (value >= 100) return Math.floor(value / 100);
  return value;
};

const pickString = (source: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
};

const pickNumber = (source: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value.trim(), 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const normalizeAlertId = (value: string | null): string | null => {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!cleaned) return null;
  const match = cleaned.match(/^ALT[-_]?(\d+)$/i);
  if (match) {
    return `ALT-${match[1]}`;
  }
  return cleaned.toUpperCase();
};

const findAlertIdInObject = (value: unknown, fromAlertKey = false): string | null => {
  if (typeof value === 'string') {
    if (!fromAlertKey) return null;
    const direct = normalizeAlertId(value);
    if (direct && /^ALT-\d+$/i.test(direct)) return direct;
    const match = value.match(/\bALT[-_ ]?(\d+)\b/i);
    if (match) return `ALT-${match[1]}`;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findAlertIdInObject(item, fromAlertKey);
      if (nested) return nested;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase().replace(/[\s_-]/g, '');
      const nextFromAlertKey =
        fromAlertKey ||
        key === 'alert' ||
        (key.includes('alert') &&
          (key.includes('id') || key.includes('number') || key.includes('no')));
      const nested = findAlertIdInObject(v, nextFromAlertKey);
      if (nested) return nested;
    }
  }
  return null;
};

const nearlyEqual = (a?: number | null, b?: number | null, epsilon = 0.25) => {
  if (a == null || b == null) return true;
  return Math.abs(a - b) <= epsilon;
};

const isLikelyDuplicateScan = (
  existing: {
    deviceId: string | null;
    totalPanels: number;
    dustyPanelCount: number;
    cleanPanelCount: number;
    thermalMeanTemp: number | null;
    thermalDelta: number | null;
  },
  incoming: {
    deviceId: string | null;
    totalPanels: number;
    dustyPanelCount: number;
    cleanPanelCount: number;
    thermalMeanTemp: number | null;
    thermalDelta: number | null;
  }
) => {
  if ((existing.deviceId || null) !== (incoming.deviceId || null)) return false;
  if (existing.totalPanels !== incoming.totalPanels) return false;
  if (existing.dustyPanelCount !== incoming.dustyPanelCount) return false;
  if (existing.cleanPanelCount !== incoming.cleanPanelCount) return false;
  if (!nearlyEqual(existing.thermalMeanTemp, incoming.thermalMeanTemp, 0.35)) return false;
  if (!nearlyEqual(existing.thermalDelta, incoming.thermalDelta, 0.35)) return false;
  return true;
};

// =====================================================
// HELPER FUNCTIONS FOR AUTOMATION
// =====================================================

const resolvePanel = async (panelCode?: string) => {
  // If a specific panel code is provided, look it up
  if (panelCode) {
    return prisma.solarPanel.findUnique({ where: { panelId: panelCode } });
  }
  
  // Otherwise, get any available panel for the automation
  // In a real scenario, you might want to match by zone/device
  const onlinePanel = await prisma.solarPanel.findFirst({
    where: { status: { not: 'offline' } },
    orderBy: { lastChecked: 'desc' }
  });
  if (onlinePanel) return onlinePanel;

  // Fallback so ticket flow still works even if panels are currently marked offline.
  return prisma.solarPanel.findFirst({
    orderBy: { lastChecked: 'desc' },
  });
};

const AUTO_TICKET_THRESHOLD = Number(process.env.AUTO_TICKET_THRESHOLD ?? 3); // Dusty panels threshold
const normalizePanelStatus = (value: unknown): 'CLEAN' | 'DUSTY' | 'FAULTY' | 'UNKNOWN' => {
  const status = String(value ?? '').trim().toUpperCase();
  if (status === 'CLEAN' || status === 'HEALTHY' || status === 'NORMAL') return 'CLEAN';
  if (status === 'DUSTY' || status === 'DIRTY') return 'DUSTY';
  if (status === 'FAULTY' || status === 'FAULT') return 'FAULTY';
  return 'UNKNOWN';
};

const enrichScansWithAlertContext = async <T extends { id: string; alertId: string | null; rowNumber: number | null }>(
  scans: T[],
): Promise<T[]> => {
  if (!scans.length) return scans;

  const scanIds = scans.map((scan) => scan.id);
  const scanAlertIds = scans
    .map((scan) => scan.alertId)
    .filter((value): value is string => Boolean(value));

  const whereOr: Array<Record<string, unknown>> = [{ scanId: { in: scanIds } }];
  if (scanAlertIds.length > 0) {
    whereOr.push({ alertId: { in: scanAlertIds } });
  }

  const linkedAlerts = await prisma.alert.findMany({
    where: {
      dismissed: false,
      OR: whereOr,
    },
    select: {
      scanId: true,
      alertId: true,
      row: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const alertByScanId = new Map<string, { alertId: string | null; row: number | null }>();
  const alertByAlertId = new Map<string, { alertId: string | null; row: number | null }>();

  linkedAlerts.forEach((alert) => {
    if (alert.scanId && !alertByScanId.has(alert.scanId)) {
      alertByScanId.set(alert.scanId, { alertId: alert.alertId, row: alert.row });
    }
    if (alert.alertId && !alertByAlertId.has(alert.alertId)) {
      alertByAlertId.set(alert.alertId, { alertId: alert.alertId, row: alert.row });
    }
  });

  return scans.map((scan) => {
    const linkedByScan = alertByScanId.get(scan.id);
    const linkedByAlertId = scan.alertId ? alertByAlertId.get(scan.alertId) : undefined;
    const linked = linkedByScan || linkedByAlertId;

    return {
      ...scan,
      alertId: scan.alertId ?? linked?.alertId ?? null,
      rowNumber: scan.rowNumber ?? linked?.row ?? null,
    };
  });
};

// =====================================================
// RASPBERRY PI DATA ENDPOINTS
// =====================================================

// POST /api/solar-scans - Receive scan data from Raspberry Pi
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      timestamp,
      priority,
      thermal,
      panels,
      deviceId,
      deviceName,
      thermalImage,
      rgbImage,
      alertId,
      panelId,
      rowNumber,
      alert_id,
      panel_id,
      row_number,
      autoProcess // Flag to trigger automatic ticket creation
    } = req.body;
    const payload = req.body as Record<string, unknown>;
    const explicitAlertRaw =
      pickString(payload, [
        'alert_id',
        'alertId',
        'alertID',
        'alertNo',
        'alert_no',
        'alertNumber',
        'alert_number',
        'alert-id',
        'alert id',
      ]) ?? findAlertIdInObject(payload);
    let alertIdValue = normalizeAlertId(explicitAlertRaw);
    const hasExplicitAlertId = Boolean(alertIdValue);
    let panelIdValue =
      pickString(payload, ['panel_id', 'panelId', 'panelID', 'panelNo', 'panel_no', 'panelNumber', 'panel_number']) ??
      null;
    let rowNumberValue =
      pickNumber(payload, ['row_number', 'rowNumber', 'row', 'row_no', 'rowNo']) ??
      null;
    const thermalImageDataUrl = toJpegDataUrl(thermalImage);
    const rgbImageDataUrl = toJpegDataUrl(rgbImage);

    const normalizedPanels = Array.isArray(panels)
      ? panels.map((panel: any) => ({
          ...panel,
          status: normalizePanelStatus(panel?.status),
        }))
      : [];

    // Count dusty and clean panels
    const dustyPanelCount = normalizedPanels.filter((p: any) => p.status === 'DUSTY').length;
    const cleanPanelCount = normalizedPanels.filter((p: any) => p.status === 'CLEAN').length;
    const totalPanels = panels?.length || 0;
    const hasFaulty = normalizedPanels.some((p: any) => p.status === 'FAULTY');
    const severity = thermal?.severity || 'NORMAL';
    const normalizedSeverity = normalizeSeverity(severity);
    const normalizedPriority = String(priority || 'NORMAL').toUpperCase();
    const hasScanIssues = hasFaulty || dustyPanelCount > 0;
    const scanPanelId =
      normalizedPanels.find((p: any) => p.status === 'FAULTY' || p.status === 'DUSTY')?.panel_number ||
      normalizedPanels.find((p: any) => p.status === 'FAULTY' || p.status === 'DUSTY')?.panelNumber ||
      null;
    if (!panelIdValue) {
      panelIdValue = scanPanelId;
    }
    let resolvedPanel = panelIdValue ? await resolvePanel(panelIdValue) : null;
    if (!resolvedPanel && scanPanelId) {
      resolvedPanel = await resolvePanel(scanPanelId);
    }

    if (rowNumberValue == null && resolvedPanel?.row != null) {
      rowNumberValue = resolvedPanel.row;
    }

    if (alertIdValue) {
      const matchedAlert = await prisma.alert.findFirst({
        where: {
          dismissed: false,
          alertId: alertIdValue,
        },
        orderBy: { createdAt: 'desc' },
        select: { row: true },
      });
      if (typeof matchedAlert?.row === 'number') {
        rowNumberValue = matchedAlert.row;
      }
    } else if (rowNumberValue == null) {
      rowNumberValue = parseRowNumberFromPanelId(panelIdValue);
    }
    if (!alertIdValue && rowNumberValue != null) {
      const matchedAlert = await prisma.alert.findFirst({
        where: {
          dismissed: false,
          row: rowNumberValue,
          alertId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (matchedAlert?.alertId) {
        alertIdValue = matchedAlert.alertId;
      }
    }

    // Determine if we should automatically create a ticket.
    // Any scan with actionable issues (dusty/faulty) should create a ticket.
    const shouldAutoCreateTicket =
      autoProcess !== false &&
      hasScanIssues;

// Create SolarScan record
    // Get average temperature from onsite ESP sensor (WeatherData table)
    const latestWeather = await prisma.weatherData.findFirst({
      orderBy: { recordedAt: 'desc' },
      where: {
        temperature: { gt: 0 }, // Only use valid readings
      },
    });
    
    // Use onsite sensor temperature as the mean, or fallback to Pi thermal mean
    const avgTemperature = latestWeather?.temperature || thermal?.mean_temp || null;
    
    const deviceIdValue = deviceId || null;
    const timestampValue = timestamp ? new Date(timestamp) : new Date();
    const duplicateSince = new Date(timestampValue.getTime() - DUPLICATE_WINDOW_SECONDS * 1000);

    const recentCandidate = await prisma.solarScan.findFirst({
      where: {
        deviceId: deviceIdValue,
        timestamp: { gte: duplicateSince },
      },
      include: { panelDetections: true },
      orderBy: { timestamp: 'desc' },
    });

    const incomingKey = {
      deviceId: deviceIdValue,
      totalPanels,
      dustyPanelCount,
      cleanPanelCount,
      thermalMeanTemp: avgTemperature,
      thermalDelta: thermal?.delta || null,
    };

    let scan;

    if (!alertIdValue && recentCandidate && isLikelyDuplicateScan(recentCandidate, incomingKey)) {
      scan = await prisma.solarScan.update({
        where: { id: recentCandidate.id },
        data: {
          timestamp: timestampValue,
          priority: priority || recentCandidate.priority || 'NORMAL',
          status: shouldAutoCreateTicket ? 'processing' : (recentCandidate.status || 'pending'),
          thermalMinTemp: thermal?.min_temp ?? recentCandidate.thermalMinTemp,
          thermalMaxTemp: thermal?.max_temp ?? recentCandidate.thermalMaxTemp,
          thermalMeanTemp: avgTemperature ?? recentCandidate.thermalMeanTemp,
          thermalDelta: thermal?.delta ?? recentCandidate.thermalDelta,
          riskScore: thermal?.risk_score ?? recentCandidate.riskScore,
          severity: severity || recentCandidate.severity || null,
          thermalImageUrl: thermalImageDataUrl || recentCandidate.thermalImageUrl,
          rgbImageUrl: rgbImageDataUrl || recentCandidate.rgbImageUrl,
          dustyPanelCount,
          cleanPanelCount,
          totalPanels,
          deviceName: deviceName || recentCandidate.deviceName || null,
          updatedAt: new Date(),
        }
      });

      if (panels && panels.length > 0) {
        await prisma.panelDetection.deleteMany({ where: { scanId: scan.id } });
      }
    } else {
      scan = await prisma.solarScan.create({
        data: {
          timestamp: timestampValue,
          priority: priority || 'NORMAL',
          status: shouldAutoCreateTicket ? 'processing' : 'pending',
          alertId: alertIdValue,
          panelId: panelIdValue,
          rowNumber: rowNumberValue,
          
          // Thermal data from Pi camera (for delta/anomaly detection)
          thermalMinTemp: thermal?.min_temp || null,
          thermalMaxTemp: thermal?.max_temp || null,
          // Use onsite ESP sensor temperature as mean (more accurate than thermal camera)
          thermalMeanTemp: avgTemperature,
          thermalDelta: thermal?.delta || null,
          riskScore: thermal?.risk_score || null,
          severity: severity || null,
          thermalImageUrl: thermalImageDataUrl || null,
          rgbImageUrl: rgbImageDataUrl || null,
          
          // Summary counts
          dustyPanelCount,
          cleanPanelCount,
          totalPanels,
          
          // Device info
          deviceId: deviceIdValue,
          deviceName: deviceName || null,
        }
      });
    }

    if (hasExplicitAlertId && alertIdValue) {
      const alertRecord = await prisma.alert.findFirst({
        where: {
          alertId: alertIdValue,
          dismissed: false,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, alertId: true, row: true, createdAt: true },
      });

      if (alertRecord) {
        const scanCountForAlert = await prisma.solarScan.count({
          where: {
            alertId: alertIdValue,
            timestamp: { gte: alertRecord.createdAt },
          },
        });

        if (scanCountForAlert >= 3) {
          await prisma.alert.delete({
            where: { id: alertRecord.id },
          });
          console.log('🗑️ Alert removed after 3 scans:', alertIdValue);
        }
      }
    } else if (rowNumberValue != null) {
      // No explicit alertId provided - check if there's an active alert for this row
      const alertForRow = await prisma.alert.findFirst({
        where: {
          row: rowNumberValue,
          dismissed: false,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, alertId: true, row: true, createdAt: true },
      });

      if (alertForRow?.alertId) {
        // Link this scan to the alert
        await prisma.solarScan.update({
          where: { id: scan.id },
          data: { alertId: alertForRow.alertId, rowNumber: alertForRow.row },
        });

        // Count all scans linked to this alert (including this one)
        const scanCountForAlert = await prisma.solarScan.count({
          where: {
            alertId: alertForRow.alertId,
            timestamp: { gte: alertForRow.createdAt },
          },
        });

        console.log(`📊 Scan linked to alert ${alertForRow.alertId} (scan #${scanCountForAlert})`);

        // If 3+ scans exist for the alert, remove it
        if (scanCountForAlert >= 3) {
          await prisma.alert.delete({
            where: { id: alertForRow.id },
          });
          console.log('🗑️ Alert removed after 3 scans:', alertForRow.alertId);
        }
      }
    }
    // Log which temperature source was used
    if (latestWeather) {
      console.log(`ðŸ“Š Using onsite ESP sensor temp: ${latestWeather.temperature}Â°C (recorded: ${latestWeather.recordedAt})`);
    } else if (thermal?.mean_temp) {
      console.log(`ðŸ“Š Using Pi thermal camera mean temp: ${thermal.mean_temp}Â°C (onsite sensor unavailable)`);
    }

    // =====================================================
    // CREATE ALERT FOR THIS SCAN
    // Only create alert if scan has issues (dusty/faulty panels or high severity)
    // =====================================================
    if (
      !alertIdValue &&
      (dustyPanelCount > 0 || hasFaulty || normalizedSeverity === 'critical' || normalizedSeverity === 'high')
    ) {
      try {
        // Try to find a panel to get zone and row info
        const panel = resolvedPanel ?? await resolvePanel(panelIdValue || scanPanelId || undefined);
        
        if (panel) {
          // Get zone name from the panel's relation
          const panelWithZone = await prisma.solarPanel.findUnique({
            where: { id: panel.id },
            include: { zone: true }
          });
          
          const zoneName = panelWithZone?.zone?.name || 'Unknown';
          const rowNum = panel.row;
          const alertStatus = hasFaulty || normalizedSeverity === 'critical' ? 'fault' : 'warning';
          
          // Create alert with scanId link - use sequential ID
          const newAlertId = await generateAlertId();
          await prisma.alert.create({
            data: {
              alertId: newAlertId,
              zone: zoneName,
              row: rowNum,
              status: alertStatus,
              message: `Scan detected: ${hasFaulty ? 'faulty panels' : dustyPanelCount + ' dusty panels'} - Severity: ${severity}`,
              dismissed: false,
              scanId: scan.id,
            }
          });
          
          // Update scan with the new alertId so it can be linked to tickets
          await prisma.solarScan.update({
            where: { id: scan.id },
            data: { alertId: newAlertId, rowNumber: rowNum }
          });
          
          console.log('✅ Alert created for scan', scan.id, '- Zone:', zoneName, 'Row:', rowNum, '- AlertId:', newAlertId);
        }
      } catch (alertError) {
        console.error('âŒ Error creating alert for scan:', alertError);
        // Don't fail the scan creation if alert fails
      }
    }

    // Create PanelDetection records for each panel
    if (normalizedPanels.length > 0) {
      await Promise.all(
        normalizedPanels.map((panel: any) => 
          prisma.panelDetection.create({
            data: {
              scanId: scan.id,
              panelNumber: panel.panel_number || panel.panelNumber || 'Unknown',
              status: panel.status || 'UNKNOWN',
              x1: panel.x1 || panel.bbox?.[0] || 0,
              y1: panel.y1 || panel.bbox?.[1] || 0,
              x2: panel.x2 || panel.bbox?.[2] || 0,
              y2: panel.y2 || panel.bbox?.[3] || 0,
              cropImageUrl: panel.crop || panel.cropImageUrl || null,
              faultType: panel.faultType || null,
              confidence: panel.confidence || null,
            }
          })
        )
      );
    }

    // =====================================================
    // AUTOMATIC TICKET CREATION & TECHNICIAN ASSIGNMENT
    // Runs immediately when an actionable scan is received.
    // =====================================================
    
    let automationResult = null;
    
    if (shouldAutoCreateTicket) {
      // Update scan status to indicate processing
      await prisma.solarScan.update({
        where: { id: scan.id },
        data: { status: 'processing', updatedAt: new Date() }
      });
      
      try {
        // Re-fetch scan to get the latest alertId (in case it was created above)
        const scanData = await prisma.solarScan.findUnique({
          where: { id: scan.id },
          select: { alertId: true, rowNumber: true, timestamp: true }
        });

        const panel = await resolvePanel();

        if (panel) {
          const incidentId = generateIncidentId();
          const derivedFaultType = hasFaulty ? 'thermal_fault' : dustyPanelCount >= AUTO_TICKET_THRESHOLD ? 'dust_accumulation' : 'scan_anomaly';
          const effectiveFaultType = hasFaulty
            ? 'thermal_fault'
            : dustyPanelCount > 0
            ? 'dust_accumulation'
            : derivedFaultType;

          // This creates: Fault -> Ticket -> Technician Assignment -> activeTickets Increment
          // Also links the alert with the ticket via zone, row, status
          const panelWithZone = await prisma.solarPanel.findUnique({
            where: { id: panel.id },
            include: { zone: true }
          });

          const zoneName = panelWithZone?.zone?.name || 'Unknown';
          const rowNum = scanData?.rowNumber || panel.row;
          const alertStatus = hasFaulty || normalizedSeverity === 'critical' ? 'fault' : 'warning';

          automationResult = await createFaultTicketAndAssignment({
            incidentId,
            panelId: panel.id,
            faultType: effectiveFaultType,
            severity: normalizedSeverity,
            detectedAt: scanData?.timestamp || scan.timestamp,
            description: `Automated scan processing - ${hasFaulty ? 'thermal fault detected' : 'dust accumulation: ' + dustyPanelCount + ' panels'}`,
            aiConfidence: Math.max(0, Math.min(100, Number(thermal?.risk_score ?? 50))),
            aiAnalysis: `Scan severity: ${severity}; dusty panels: ${dustyPanelCount}; faulty detections: ${hasFaulty ? 'yes' : 'no'}`,
            recommendedAction: hasFaulty
              ? 'Immediate technician dispatch for thermal fault verification'
              : 'Schedule panel cleaning and technician validation',
            droneImageUrl: rgbImageDataUrl || undefined,
            thermalImageUrl: thermalImageDataUrl || undefined,
            locationX: 0,
            locationY: 0,
            scanId: scan.id,
            scanPanelId: scanPanelId || undefined,
            zone: zoneName,
            row: rowNum,
            status: alertStatus,
            alertId: scanData?.alertId || undefined,
          });

          // Update scan status to processed
          await prisma.solarScan.update({
            where: { id: scan.id },
            data: { status: 'processed', updatedAt: new Date() }
          });

          console.log('Automation triggered immediately: Ticket', automationResult.ticketNumber, 'assigned to technician');
          // Keep the scan so ticket details can display scan images and metadata
          console.log('Scan retained for ticket details');
        } else {
          console.log('No panel found for automation - scan saved but no ticket created');
          await prisma.solarScan.update({
            where: { id: scan.id },
            data: { status: 'pending', updatedAt: new Date() }
          });
        }
      } catch (autoError) {
        console.error('Automation error:', autoError);
        await prisma.solarScan.update({
          where: { id: scan.id },
          data: { status: 'pending', updatedAt: new Date() }
        });
      }
    }

    res.status(201).json({
      success: true,
      scanId: scan.id,
      message: shouldAutoCreateTicket
        ? 'Solar scan recorded and ticket automation triggered'
        : 'Solar scan recorded successfully',
      automation: shouldAutoCreateTicket ? {
        ticketCreated: Boolean(automationResult?.ticketId),
        ticketNumber: automationResult?.ticketNumber || null,
        message: automationResult?.ticketId
          ? 'Ticket automatically created and assigned'
          : 'Ticket automation triggered'
      } : null
    });
  } catch (error) {
    console.error('Error saving solar scan:', error);
    res.status(500).json({ error: 'Failed to save solar scan data' });
  }
});

// GET /api/solar-scans - Get all scans
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit = 50 } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const scans = await prisma.solarScan.findMany({
      where,
      include: {
        panelDetections: true
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });

    res.json(await enrichScansWithAlertContext(scans));
  } catch (error) {
    console.error('Error fetching solar scans:', error);
    res.status(500).json({ error: 'Failed to fetch solar scans' });
  }
});

// GET /api/solar-scans/latest - Get latest scan
router.get('/latest', async (_req: Request, res: Response) => {
  try {
    const scan = await prisma.solarScan.findFirst({
      orderBy: { timestamp: 'desc' },
      include: {
        panelDetections: true
      }
    });

    if (!scan) {
      return res.status(404).json({ error: 'No scans found' });
    }

    const [enrichedScan] = await enrichScansWithAlertContext([scan]);
    res.json(enrichedScan);
  } catch (error) {
    console.error('Error fetching latest scan:', error);
    res.status(500).json({ error: 'Failed to fetch latest scan' });
  }
});

// GET /api/solar-scans/stats/summary - Get scan statistics
router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const retentionWhere = {};

    const totalScans = await prisma.solarScan.count({ where: retentionWhere });
    const pendingScans = await prisma.solarScan.count({
      where: { ...retentionWhere, status: 'pending' },
    });
    const processedScans = await prisma.solarScan.count({
      where: { ...retentionWhere, status: 'processed' },
    });
    
    const criticalScans = await prisma.solarScan.count({ 
      where: { ...retentionWhere, severity: 'CRITICAL' } 
    });
    
    const highRiskScans = await prisma.solarScan.count({ 
      where: { ...retentionWhere, severity: { in: ['CRITICAL', 'HIGH'] } } 
    });

    // Average thermal delta
    const avgThermalDelta = await prisma.solarScan.aggregate({
      where: retentionWhere,
      _avg: { thermalDelta: true }
    });

    res.json({
      totalScans,
      pendingScans,
      processedScans,
      criticalScans,
      highRiskScans,
      avgThermalDelta: avgThermalDelta._avg.thermalDelta || 0
    });
  } catch (error) {
    console.error('Error fetching scan stats:', error);
    res.status(500).json({ error: 'Failed to fetch scan statistics' });
  }
});

// GET /api/solar-scans/:id - Get scan by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scan = await prisma.solarScan.findUnique({
      where: { id: req.params.id },
      include: {
        panelDetections: true
      }
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const [enrichedScan] = await enrichScansWithAlertContext([scan]);
    res.json(enrichedScan);
  } catch (error) {
    console.error('Error fetching scan:', error);
    res.status(500).json({ error: 'Failed to fetch scan' });
  }
});

// PATCH /api/solar-scans/:id - Update scan status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const scan = await prisma.solarScan.update({
      where: { id: req.params.id },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    res.json(scan);
  } catch (error) {
    console.error('Error updating scan:', error);
    res.status(500).json({ error: 'Failed to update scan' });
  }
});

// DELETE /api/solar-scans/:id - Delete scan
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.solarScan.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Scan deleted' });
  } catch (error) {
    console.error('Error deleting scan:', error);
    res.status(500).json({ error: 'Failed to delete scan' });
  }
});

export default router;
