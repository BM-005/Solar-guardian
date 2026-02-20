import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

const enrichScanAlertMeta = async (
  scans: Array<{ id: string; alertId: string | null; rowNumber: number | null }>
) => {
  if (!scans.length) {
    return new Map<string, { alertId: string | null; rowNumber: number | null }>();
  }

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

  const resolved = new Map<string, { alertId: string | null; rowNumber: number | null }>();
  scans.forEach((scan) => {
    const linkedByScan = alertByScanId.get(scan.id);
    const linkedByAlertId = scan.alertId ? alertByAlertId.get(scan.alertId) : undefined;
    const linked = linkedByScan || linkedByAlertId;
    resolved.set(scan.id, {
      alertId: scan.alertId ?? linked?.alertId ?? null,
      rowNumber: scan.rowNumber ?? linked?.row ?? null,
    });
  });

  return resolved;
};

// Create a new ticket (used by n8n automation)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      ticketNumber, 
      status, 
      priority, 
      description, 
      faultType, 
      assignedTechnicianId,
      panelId,
      faultId,
      droneImageUrl,
      thermalImageUrl,
      aiAnalysis,
      recommendedAction
    } = req.body;

    if (!ticketNumber || !description) {
      return res.status(400).json({ error: 'ticketNumber and description are required' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        status: status || 'open',
        priority: priority || 'medium',
        description,
        faultType: faultType || 'unknown',
        assignedTechnicianId: assignedTechnicianId || null,
        panelId: panelId || null,
        faultId: faultId || null,
        droneImageUrl: droneImageUrl || null,
        thermalImageUrl: thermalImageUrl || null,
        aiAnalysis: aiAnalysis || null,
        recommendedAction: recommendedAction || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        assignedTechnician: true,
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get all tickets with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority } = req.query;
    const scanTicketEvents = await prisma.automationEvent.findMany({
      where: {
        stage: 'ticket_created',
        scanId: { not: null },
        ticketId: { not: null },
      },
      select: { ticketId: true, scanId: true, payload: true },
    });

    const ticketToScanMap = new Map<string, string>();
    const ticketToEventPanelMap = new Map<string, string>();
    for (const event of scanTicketEvents) {
      if (!event.ticketId || !event.scanId) continue;
      if (!ticketToScanMap.has(event.ticketId)) {
        ticketToScanMap.set(event.ticketId, event.scanId);
      }
      if (!ticketToEventPanelMap.has(event.ticketId)) {
        const payload = event.payload as Record<string, unknown> | null;
        const panelFromEvent = typeof payload?.scanPanelId === 'string' ? payload.scanPanelId : null;
        if (panelFromEvent) {
          ticketToEventPanelMap.set(event.ticketId, panelFromEvent);
        }
      }
    }

    const alertLinkedTickets = await prisma.alert.findMany({
      where: {
        ticketId: { not: null },
        scanId: { not: null },
      },
      select: { ticketId: true, scanId: true },
      orderBy: { createdAt: 'desc' },
    });
    for (const alertLink of alertLinkedTickets) {
      if (!alertLink.ticketId || !alertLink.scanId) continue;
      if (!ticketToScanMap.has(alertLink.ticketId)) {
        ticketToScanMap.set(alertLink.ticketId, alertLink.scanId);
      }
    }

    const scanLinkedTicketIds = Array.from(ticketToScanMap.keys());

    if (!scanLinkedTicketIds.length) {
      return res.json([]);
    }

    const uniqueScanIds = Array.from(new Set(Array.from(ticketToScanMap.values())));
    const scans = await prisma.solarScan.findMany({
      where: { id: { in: uniqueScanIds } },
      select: {
        id: true,
        priority: true,
        alertId: true,
        rowNumber: true,
        panelDetections: {
          select: { panelNumber: true, status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const resolvedScanMeta = await enrichScanAlertMeta(
      scans.map((scan) => ({
        id: scan.id,
        alertId: scan.alertId ?? null,
        rowNumber: scan.rowNumber ?? null,
      }))
    );

    const scanToPanelNumber = new Map<string, string>();
    for (const scan of scans) {
      const panelNumber =
        scan.panelDetections.find(
          (panel) => {
            const normalized = String(panel.status ?? '').trim().toUpperCase();
            return normalized === 'FAULTY' || normalized === 'FAULT' || normalized === 'DUSTY' || normalized === 'DIRTY';
          }
        )?.panelNumber ?? null;
      if (panelNumber) {
        scanToPanelNumber.set(scan.id, panelNumber);
      }
    }

    if (!scanLinkedTicketIds.length) {
      return res.json([]);
    }

    const where: any = {
      id: { in: scanLinkedTicketIds },
    };

    if (status) {
      where.status = status as string;
    }

    if (priority) {
      where.priority = priority as string;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        panelId: true,
        faultId: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        description: true,
        faultType: true,
        zone: true,
        row: true,
        droneImageUrl: true,
        thermalImageUrl: true,
        aiAnalysis: true,
        recommendedAction: true,
        resolutionNotes: true,
        resolutionCause: true,
        resolutionImageUrl: true,
        assignedTechnicianId: true,
        panel: { include: { zone: true } },
        fault: true,
        assignedTechnician: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const ticketsWithScanPanel = tickets.map((ticket) => {
      const scanId = ticketToScanMap.get(ticket.id);
      const scanPanelId =
        (scanId ? scanToPanelNumber.get(scanId) ?? null : null) ??
        ticketToEventPanelMap.get(ticket.id) ??
        null;
      return {
        ...ticket,
        scanId: scanId ?? null,
        scanPanelId,
        scanAlertId: scanId ? (resolvedScanMeta.get(scanId)?.alertId ?? null) : null,
        scanRowNumber: scanId ? (resolvedScanMeta.get(scanId)?.rowNumber ?? null) : null,
      };
    });

    res.json(ticketsWithScanPanel);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get ticket by ID with all details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scanEvent = await prisma.automationEvent.findFirst({
      where: {
        stage: 'ticket_created',
        ticketId: req.params.id,
        scanId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { scanId: true },
    });

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        ticketNumber: true,
        panelId: true,
        faultId: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        description: true,
        faultType: true,
        zone: true,
        row: true,
        droneImageUrl: true,
        thermalImageUrl: true,
        aiAnalysis: true,
        recommendedAction: true,
        resolutionNotes: true,
        resolutionCause: true,
        resolutionImageUrl: true,
        assignedTechnicianId: true,
        panel: { include: { zone: true } },
        fault: true,
        assignedTechnician: true,
        notes: {
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const alertLink = await prisma.alert.findFirst({
      where: {
        ticketId: req.params.id,
        scanId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { scanId: true },
    });

    const linkedScanId = scanEvent?.scanId ?? alertLink?.scanId ?? null;
    const linkedScan = linkedScanId
      ? await prisma.solarScan.findUnique({
          where: { id: linkedScanId },
          select: { alertId: true, rowNumber: true },
        })
      : null;
    const resolvedScanMeta = linkedScanId
      ? await enrichScanAlertMeta([
          {
            id: linkedScanId,
            alertId: linkedScan?.alertId ?? null,
            rowNumber: linkedScan?.rowNumber ?? null,
          },
        ])
      : new Map<string, { alertId: string | null; rowNumber: number | null }>();
    const resolvedMeta = linkedScanId ? resolvedScanMeta.get(linkedScanId) : null;

    res.json({
      ...ticket,
      scanId: linkedScanId,
      scanAlertId: resolvedMeta?.alertId ?? null,
      scanRowNumber: resolvedMeta?.rowNumber ?? null,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Update ticket
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, resolutionNotes, resolutionCause, resolutionImageUrl, assignedTechnicianId } = req.body;

    // Get the current ticket to check if technician is assigned
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { assignedTechnicianId: true, status: true }
    });

    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const isResolving = (status === 'resolved' || status === 'closed') && currentTicket.status !== 'resolved' && currentTicket.status !== 'closed';

    // If ticket is being resolved/closed and has an assigned technician, decrement their activeTickets
    if (isResolving && currentTicket.assignedTechnicianId) {
      await prisma.technician.update({
        where: { id: currentTicket.assignedTechnicianId },
        data: {
          activeTickets: { decrement: 1 },
          resolvedTickets: { increment: 1 }
        }
      });
      console.log(`✅ Decremented activeTickets for technician ${currentTicket.assignedTechnicianId}`);
    }

    const updateData: {
      updatedAt: Date;
      status?: string;
      resolvedAt?: Date;
      resolutionNotes?: string;
      resolutionCause?: string;
      resolutionImageUrl?: string;
      assignedTechnicianId?: string | null;
    } = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }
    }

    if (resolutionNotes) {
      updateData.resolutionNotes = resolutionNotes;
    }

    if (resolutionCause) {
      updateData.resolutionCause = resolutionCause;
    }

    if (resolutionImageUrl) {
      updateData.resolutionImageUrl = resolutionImageUrl;
    }
    if (assignedTechnicianId !== undefined) {
      updateData.assignedTechnicianId = assignedTechnicianId || null;
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // If ticket is resolved/closed, delete it from the database
    if (isResolving) {
      // Delete the ticket (notes will be deleted via cascade)
      await prisma.ticket.delete({
        where: { id: req.params.id }
      });
      console.log(`✅ Deleted resolved ticket ${ticket.ticketNumber}`);
      
      return res.json({ 
        success: true, 
        message: 'Ticket resolved and deleted',
        ticketNumber: ticket.ticketNumber
      });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Add note to ticket
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { authorId, content } = req.body;

    const note = await prisma.ticketNote.create({
      data: {
        ticketId: req.params.id,
        authorId,
        content,
        createdAt: new Date(),
      },
      include: { author: true },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Get ticket statistics
router.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const [
      openTickets,
      inProgressTickets,
      resolvedTickets,
      criticalTickets,
    ] = await Promise.all([
      prisma.ticket.count({ where: { status: 'open' } }),
      prisma.ticket.count({ where: { status: 'in_progress' } }),
      prisma.ticket.count({ where: { status: 'resolved' } }),
      prisma.ticket.count({ where: { priority: 'critical', status: { not: 'closed' } } }),
    ]);

    res.json({
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
      critical: criticalTickets,
    });
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({ error: 'Failed to fetch ticket statistics' });
  }
});

// Delete all tickets
router.delete('/all', async (_req: Request, res: Response) => {
  try {
    // First delete all notes
    await prisma.ticketNote.deleteMany({});
    
    // Then delete all tickets
    const result = await prisma.ticket.deleteMany({});
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.count} tickets` 
    });
  } catch (error) {
    console.error('Error deleting all tickets:', error);
    res.status(500).json({ error: 'Failed to delete tickets' });
  }
});

export default router;
