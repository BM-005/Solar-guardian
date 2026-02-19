import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

const ALERT_ID_PATTERN = /^ALT-(\d+)$/i;

// Generate sequential alert ID in ALT-XXX format (ALT-001, ALT-002, ...)
const generateAlertId = async (): Promise<string> => {
  const existing = await prisma.alert.findMany({
    where: { alertId: { startsWith: 'ALT-' } },
    select: { alertId: true },
  });

  const maxNumber = existing.reduce((max, row) => {
    const match = row.alertId?.match(ALERT_ID_PATTERN);
    const parsed = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  const nextNumber = maxNumber + 1;
  return `ALT-${String(nextNumber).padStart(3, '0')}`;
};

// Get all active alerts
router.get('/', async (_req: Request, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        dismissed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create or update an alert (upsert)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { zone, row, status, message, scanId, ticketId } = req.body;

    if (!zone || row === undefined || !status) {
      return res.status(400).json({ error: 'Missing required fields: zone, row, status' });
    }

    // Try to find an existing active alert for this zone/row (regardless of status)
    // Only 1 alert per row - update status if changed
    const existingAlert = await prisma.alert.findFirst({
      where: {
        zone,
        row,
        dismissed: false,
      },
      select: {
        id: true,
        zone: true,
        row: true,
        status: true,
        message: true,
        scanId: true,
        ticketId: true,
      }
    });

    if (existingAlert) {
      // Alert already exists - update status and message (don't create duplicate)
      const updatedAlert = await prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          status, // Update to new status (fault/warning/healthy)
          message: message || existingAlert.message,
          scanId: scanId || existingAlert.scanId,
          ticketId: ticketId || existingAlert.ticketId,
        },
      });
      
      // Tickets are created only from scan automation flow.
      
      return res.json(updatedAlert);
    }

    // Create new alert with generated alertId
    let alert;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const newAlertId = await generateAlertId();
      try {
        alert = await prisma.alert.create({
          data: {
            alertId: newAlertId,
            zone,
            row,
            status,
            message: message || null,
            dismissed: false,
            scanId: scanId || null,
            ticketId: ticketId || null,
          },
        });
        break;
      } catch (createError: any) {
        if (createError?.code !== 'P2002') {
          throw createError;
        }
      }
    }

    if (!alert) {
      return res.status(500).json({ error: 'Failed to allocate unique alert ID' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Dismiss an alert (hard delete - permanently remove from database)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Permanently delete the alert from the database
    await prisma.alert.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Alert deleted permanently' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// Dismiss alerts by zone and row
router.post('/dismiss', async (req: Request, res: Response) => {
  try {
    const { zone, row, status } = req.body;

    if (!zone || row === undefined) {
      return res.status(400).json({ error: 'Missing required fields: zone, row' });
    }

    const updateData: { dismissed: boolean; dismissedAt: Date; status?: string } = {
      dismissed: true,
      dismissedAt: new Date(),
    };

    // If status is provided, only dismiss alerts with that status
    if (status) {
      updateData.status = status;
    }

    const alerts = await prisma.alert.updateMany({
      where: {
        zone,
        row,
        dismissed: false,
      },
      data: updateData,
    });

    res.json({ count: alerts.count });
  } catch (error) {
    console.error('Error dismissing alerts:', error);
    res.status(500).json({ error: 'Failed to dismiss alerts' });
  }
});

// Sync alerts - create/update based on current panel statuses
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // Get all panels with warning or fault status
    const panels = await prisma.solarPanel.findMany({
      select: {
        row: true,
        column: true,
        status: true,
        zone: { select: { name: true } },
      },
    });

    // Group by zone and row
    const rowStatuses = new Map<string, string>();
    panels.forEach(panel => {
      if (panel.status === 'warning' || panel.status === 'fault') {
        const key = `${panel.zone.name}-${panel.row}`;
        // If any panel in the row has a fault, the row is in fault status
        if (panel.status === 'fault') {
          rowStatuses.set(key, 'fault');
        } else if (!rowStatuses.has(key)) {
          rowStatuses.set(key, 'warning');
        }
      }
    });

    // Get existing active alerts
    const existingAlerts = await prisma.alert.findMany({
      where: { dismissed: false },
    });

    const existingAlertKeys = new Set(
      existingAlerts.map(a => `${a.zone}-${a.row}-${a.status}`)
    );

    // Create new alerts for rows that don't have an alert
    const newAlerts: Array<{ zone: string; row: number; status: string }> = [];
    rowStatuses.forEach((status, key) => {
      const [zone, rowStr] = key.split('-');
      const row = parseInt(rowStr);
      const alertKey = `${zone}-${row}-${status}`;

      if (!existingAlertKeys.has(alertKey)) {
        newAlerts.push({ zone, row, status });
      }
    });

    // Create alerts with generated alertIds
    const createdAlerts = await Promise.all(
      newAlerts.map(async (alertData) => {
        const newAlertId = await generateAlertId();
        return prisma.alert.create({
          data: {
            alertId: newAlertId,
            ...alertData,
            dismissed: false,
          },
        });
      })
    );

    const updatedAlerts = await prisma.alert.findMany({
      where: { 
        id: { in: createdAlerts.map(a => a.id) }
      },
    });

    // Dismiss alerts for rows that are now healthy
    const currentRowKeys = new Set(Array.from(rowStatuses.keys()).map(k => {
      const [zone, row] = k.split('-');
      return `${zone}-${row}`;
    }));

    for (const alert of existingAlerts) {
      const alertKey = `${alert.zone}-${alert.row}`;
      if (!currentRowKeys.has(alertKey)) {
        await prisma.alert.update({
          where: { id: alert.id },
          data: { dismissed: true, dismissedAt: new Date() },
        });
      }
    }

    res.json({
      created: createdAlerts.length,
      alerts: updatedAlerts,
    });
  } catch (error) {
    console.error('Error syncing alerts:', error);
    res.status(500).json({ error: 'Failed to sync alerts' });
  }
});

export default router;

