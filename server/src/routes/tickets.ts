import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

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
        panelDetections: {
          select: { panelNumber: true, status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const scanToPanelNumber = new Map<string, string>();
    const actionableScanIds = new Set<string>();
    for (const scan of scans) {
      const panelNumber =
        scan.panelDetections.find(
          (panel) => panel.status === 'FAULTY' || panel.status === 'DUSTY'
        )?.panelNumber ?? null;
      const scanPriority = String(scan.priority || 'NORMAL').toUpperCase();
      const hasActionablePanel = scan.panelDetections.some(
        (panel) => panel.status === 'FAULTY' || panel.status === 'DUSTY'
      );
      if (hasActionablePanel && (scanPriority === 'MEDIUM' || scanPriority === 'HIGH')) {
        actionableScanIds.add(scan.id);
      }
      if (panelNumber) {
        scanToPanelNumber.set(scan.id, panelNumber);
      }
    }

    const scanQualifiedTicketIds = scanLinkedTicketIds.filter((ticketId) => {
      const scanId = ticketToScanMap.get(ticketId);
      if (!scanId) return false;
      return actionableScanIds.has(scanId);
    });

    if (!scanQualifiedTicketIds.length) {
      return res.json([]);
    }

    const where: any = {
      id: { in: scanQualifiedTicketIds },
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
        scanPanelId,
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
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
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

    res.json(ticket);
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
