import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

// Get all technicians
router.get('/', async (_req: Request, res: Response) => {
  try {
    const technicians = await prisma.technician.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(technicians);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// Get technician by ID with assigned tickets
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const technician = await prisma.technician.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTickets: {
          where: { status: { not: 'closed' } },
          include: {
            panel: { include: { zone: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    res.json(technician);
  } catch (error) {
    console.error('Error fetching technician:', error);
    res.status(500).json({ error: 'Failed to fetch technician' });
  }
});

// Get available technicians
router.get('/status/available', async (_req: Request, res: Response) => {
  try {
    const technicians = await prisma.technician.findMany({
      where: { status: 'available' },
      orderBy: { rating: 'desc' },
    });

    res.json(technicians);
  } catch (error) {
    console.error('Error fetching available technicians:', error);
    res.status(500).json({ error: 'Failed to fetch available technicians' });
  }
});

// Update technician status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const technician = await prisma.technician.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(technician);
  } catch (error) {
    console.error('Error updating technician status:', error);
    res.status(500).json({ error: 'Failed to update technician status' });
  }
});

// Create new technician
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, skills, certifications, status, activeTickets, resolvedTickets, avgResolutionTime, rating, avatar } = req.body;

    const technician = await prisma.technician.create({
      data: {
        name,
        email,
        phone: phone || '',
        skills: JSON.stringify(skills || []),
        certifications: JSON.stringify(certifications || []),
        status: status || 'available',
        activeTickets: activeTickets || 0,
        resolvedTickets: resolvedTickets || 0,
        avgResolutionTime: avgResolutionTime || 0,
        rating: rating || 5.0,
        avatar: avatar || null,
      },
    });

    res.status(201).json(technician);
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// Delete technician
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.technician.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting technician:', error);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

export default router;

