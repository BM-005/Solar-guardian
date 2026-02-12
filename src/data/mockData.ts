import {
  SolarPanel,
  Technician,
  Ticket,
  FaultDetection,
  WeatherData,
  DashboardMetrics,
  PowerGeneration,
  AnalyticsData,
  PanelStatus,
} from '@/types/solar';

// Generate 1200 panels across 12 zones (100 panels per zone, 10 rows x 10 columns)
const generatePanels = (): SolarPanel[] => {
  const panels: SolarPanel[] = [];
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const statuses: PanelStatus[] = ['healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'warning', 'fault'];

  zones.forEach((zone, zoneIndex) => {
    for (let row = 1; row <= 10; row++) {
      for (let col = 1; col <= 10; col++) {
        const panelIndex = zoneIndex * 100 + (row - 1) * 10 + col;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const baseEfficiency = status === 'healthy' ? 85 + Math.random() * 15 :
          status === 'warning' ? 60 + Math.random() * 25 :
            30 + Math.random() * 30;

        panels.push({
          id: `PNL-${zone}${String(row).padStart(2, '0')}${String(col).padStart(2, '0')}`,
          row,
          column: col,
          zone,
          status,
          efficiency: Math.round(baseEfficiency * 10) / 10,
          currentOutput: status === 'offline' ? 0 : Math.round((baseEfficiency / 100) * 400 * (0.8 + Math.random() * 0.2)),
          maxOutput: 400,
          temperature: 35 + Math.random() * 25,
          lastChecked: new Date(Date.now() - Math.random() * 86400000 * 7),
          installDate: new Date('2022-03-15'),
          inverterGroup: `INV-${zone}${Math.ceil(row / 5)}`,
          stringId: `STR-${zone}${row}`,
        });
      }
    }
  });

  // Randomly set some panels as offline
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * panels.length);
    panels[randomIndex].status = 'offline';
    panels[randomIndex].currentOutput = 0;
    panels[randomIndex].efficiency = 0;
  }

  return panels;
};

export const mockPanels = generatePanels();

export const mockTechnicians: Technician[] = [
  {
    id: 'tech-001',
    name: 'Marcus Chen',
    email: 'marcus.chen@solarfarm.com',
    phone: '+1 (555) 123-4567',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
    status: 'available',
    skills: ['Panel Replacement', 'Electrical Diagnostics', 'Thermal Imaging'],
    certifications: ['NABCEP PV', 'OSHA 30'],
    activeTickets: 2,
    resolvedTickets: 156,
    avgResolutionTime: 3.2,
    rating: 4.8,
  },
  {
    id: 'tech-002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@solarfarm.com',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
    status: 'busy',
    skills: ['Inverter Repair', 'String Analysis', 'Drone Operation'],
    certifications: ['NABCEP PV', 'FAA Part 107', 'OSHA 10'],
    activeTickets: 4,
    resolvedTickets: 203,
    avgResolutionTime: 2.8,
    rating: 4.9,
  },
  {
    id: 'tech-003',
    name: 'David Rodriguez',
    email: 'david.rodriguez@solarfarm.com',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
    status: 'available',
    skills: ['Module Testing', 'Grounding Systems', 'Safety Inspection'],
    certifications: ['NABCEP PV', 'First Aid', 'OSHA 30'],
    activeTickets: 1,
    resolvedTickets: 89,
    avgResolutionTime: 4.1,
    rating: 4.6,
  },
  {
    id: 'tech-004',
    name: 'Emily Park',
    email: 'emily.park@solarfarm.com',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
    status: 'offline',
    skills: ['Data Analysis', 'Predictive Maintenance', 'System Optimization'],
    certifications: ['NABCEP PV', 'Six Sigma Green Belt'],
    activeTickets: 0,
    resolvedTickets: 178,
    avgResolutionTime: 3.5,
    rating: 4.7,
  },
  {
    id: 'tech-005',
    name: 'James Wilson',
    email: 'james.wilson@solarfarm.com',
    phone: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces',
    status: 'available',
    skills: ['Emergency Response', 'High Voltage', 'Team Lead'],
    certifications: ['NABCEP PV', 'NFPA 70E', 'OSHA 30'],
    activeTickets: 3,
    resolvedTickets: 267,
    avgResolutionTime: 2.5,
    rating: 4.9,
  },
];

export const mockFaultDetections: FaultDetection[] = [
  {
    id: 'fault-001',
    panelId: 'PNL-A0305',
    detectedAt: new Date(Date.now() - 3600000 * 2),
    severity: 'high',
    faultType: 'Hot Spot',
    droneImageUrl: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiConfidence: 94.5,
    aiAnalysis: 'Detected thermal anomaly indicating cell degradation. Temperature differential of 23°C above adjacent cells suggests potential PID effect or micro-cracking.',
    recommendedAction: 'Immediate inspection required. Isolate panel from string to prevent cascading damage. Consider replacement if cell damage confirmed.',
    location: { x: 35, y: 42 },
  },
  {
    id: 'fault-002',
    panelId: 'PNL-C0708',
    detectedAt: new Date(Date.now() - 3600000 * 5),
    severity: 'medium',
    faultType: 'Soiling/Debris',
    droneImageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiConfidence: 87.2,
    aiAnalysis: 'Bird droppings and debris accumulation detected across 15% of panel surface. Causing localized shading and 18% efficiency reduction.',
    recommendedAction: 'Schedule cleaning within 48 hours. No structural damage detected.',
    location: { x: 60, y: 25 },
  },
  {
    id: 'fault-003',
    panelId: 'PNL-F0204',
    detectedAt: new Date(Date.now() - 3600000 * 8),
    severity: 'critical',
    faultType: 'Physical Damage',
    droneImageUrl: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiConfidence: 98.1,
    aiAnalysis: 'Visible crack propagation from edge impact. Glass delamination detected in thermal scan. Panel integrity compromised.',
    recommendedAction: 'URGENT: Disconnect immediately. Safety hazard - exposed electrical components. Full panel replacement required.',
    location: { x: 15, y: 78 },
  },
];

export const mockTickets: Ticket[] = [
  {
    id: 'ticket-001',
    ticketNumber: 'TKT-2024-0892',
    panelId: 'PNL-A0305',
    faultId: 'fault-001',
    status: 'open',
    priority: 'high',
    createdAt: new Date(Date.now() - 3600000 * 2),
    updatedAt: new Date(Date.now() - 3600000 * 1),
    description: 'Hot spot detected by thermal camera during routine drone inspection',
    faultType: 'Hot Spot',
    droneImageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiAnalysis: 'Detected thermal anomaly indicating cell degradation. Temperature differential of 23°C above adjacent cells.',
    recommendedAction: 'Immediate inspection required. Isolate panel from string.',
    notes: [
      {
        id: 'note-001',
        authorId: 'tech-001',
        authorName: 'Marcus Chen',
        content: 'Reviewing thermal data. Will inspect on-site this afternoon.',
        createdAt: new Date(Date.now() - 3600000 * 1),
      },
    ],
  },
  {
    id: 'ticket-002',
    ticketNumber: 'TKT-2024-0891',
    panelId: 'PNL-C0708',
    faultId: 'fault-002',
    status: 'in-progress',
    priority: 'medium',
    createdAt: new Date(Date.now() - 3600000 * 5),
    updatedAt: new Date(Date.now() - 3600000 * 3),
    assignedTechnicianId: 'tech-002',
    description: 'Soiling detected causing efficiency drop',
    faultType: 'Soiling/Debris',
    droneImageUrl: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiAnalysis: 'Bird droppings and debris accumulation detected across 15% of panel surface.',
    recommendedAction: 'Schedule cleaning within 48 hours.',
    notes: [
      {
        id: 'note-002',
        authorId: 'tech-002',
        authorName: 'Sarah Johnson',
        content: 'On-site now. Cleaning in progress.',
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
    ],
  },
  {
    id: 'ticket-003',
    ticketNumber: 'TKT-2024-0890',
    panelId: 'PNL-F0204',
    faultId: 'fault-003',
    status: 'in-progress',
    priority: 'critical',
    createdAt: new Date(Date.now() - 3600000 * 8),
    updatedAt: new Date(Date.now() - 3600000 * 4),
    assignedTechnicianId: 'tech-005',
    description: 'Critical physical damage - panel cracked',
    faultType: 'Physical Damage',
    droneImageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiAnalysis: 'Visible crack propagation from edge impact. Glass delamination detected.',
    recommendedAction: 'URGENT: Disconnect immediately. Full panel replacement required.',
    notes: [
      {
        id: 'note-003',
        authorId: 'tech-005',
        authorName: 'James Wilson',
        content: 'Panel isolated. Replacement unit ordered. ETA 2 hours.',
        createdAt: new Date(Date.now() - 3600000 * 3),
      },
    ],
  },
  {
    id: 'ticket-004',
    ticketNumber: 'TKT-2024-0885',
    panelId: 'PNL-B0502',
    faultId: 'fault-004',
    status: 'resolved',
    priority: 'low',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 1),
    resolvedAt: new Date(Date.now() - 86400000 * 1),
    assignedTechnicianId: 'tech-003',
    description: 'Minor connection issue detected',
    faultType: 'Connection Issue',
    droneImageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
    thermalImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    aiAnalysis: 'Slight resistance increase at junction box connection.',
    recommendedAction: 'Tighten connections and verify with multimeter.',
    resolutionNotes: 'Loose MC4 connector identified and secured. Tested resistance - normal.',
    resolutionCause: 'Thermal expansion loosened connector over time.',
    notes: [],
  },
];

export const mockWeather: WeatherData = {
  temperature: 28,
  condition: 'sunny',
  humidity: 45,
  sunlightIntensity: 92,
  forecast: [
    { hour: 10, temperature: 26, condition: 'sunny', sunlightIntensity: 88 },
    { hour: 11, temperature: 28, condition: 'sunny', sunlightIntensity: 92 },
    { hour: 12, temperature: 30, condition: 'sunny', sunlightIntensity: 95 },
    { hour: 13, temperature: 31, condition: 'partly-cloudy', sunlightIntensity: 78 },
    { hour: 14, temperature: 30, condition: 'partly-cloudy', sunlightIntensity: 72 },
    { hour: 15, temperature: 29, condition: 'cloudy', sunlightIntensity: 55 },
  ],
};

export const calculateMetrics = (panels: SolarPanel[]): DashboardMetrics => {
  const healthy = panels.filter(p => p.status === 'healthy').length;
  const warning = panels.filter(p => p.status === 'warning').length;
  const fault = panels.filter(p => p.status === 'fault').length;
  const offline = panels.filter(p => p.status === 'offline').length;
  const currentGen = panels.reduce((sum, p) => sum + p.currentOutput, 0) / 1000;
  const maxCap = panels.length * 400 / 1000;
  const avgEfficiency = panels.filter(p => p.status !== 'offline').reduce((sum, p) => sum + p.efficiency, 0) /
    panels.filter(p => p.status !== 'offline').length;

  return {
    totalPanels: panels.length,
    healthyPanels: healthy,
    warningPanels: warning,
    faultPanels: fault,
    offlinePanels: offline,
    currentGeneration: Math.round(currentGen * 10) / 10,
    maxCapacity: maxCap,
    efficiency: Math.round(avgEfficiency * 10) / 10,
    carbonSaved: Math.round(currentGen * 0.42 * 365 * 8), // kg CO2 per year estimate
    availableTechnicians: mockTechnicians.filter(t => t.status === 'available').length,
    openTickets: mockTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length,
  };
};

// Generate power generation data
const generatePowerData = (days: number, pointsPerDay: number): PowerGeneration[] => {
  const data: PowerGeneration[] = [];
  const now = new Date();

  for (let d = days - 1; d >= 0; d--) {
    for (let p = 0; p < pointsPerDay; p++) {
      const hour = Math.floor((p / pointsPerDay) * 24);
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - d);
      timestamp.setHours(hour, 0, 0, 0);

      // Simulate solar curve - peak at noon
      const solarFactor = hour >= 6 && hour <= 18 ?
        Math.sin(((hour - 6) / 12) * Math.PI) : 0;
      const randomFactor = 0.85 + Math.random() * 0.15;
      const value = solarFactor * 420 * randomFactor; // Max ~420 kW

      data.push({ timestamp, value: Math.round(value * 10) / 10 });
    }
  }

  return data;
};

export const mockAnalytics: AnalyticsData = {
  powerGeneration: {
    daily: generatePowerData(1, 24),
    weekly: generatePowerData(7, 24),
    monthly: generatePowerData(30, 4),
  },
  efficiency: {
    byZone: [
      { zone: 'A', efficiency: 94.2 },
      { zone: 'B', efficiency: 91.8 },
      { zone: 'C', efficiency: 88.5 },
      { zone: 'D', efficiency: 95.1 },
      { zone: 'E', efficiency: 89.3 },
      { zone: 'F', efficiency: 72.4 },
      { zone: 'G', efficiency: 93.7 },
      { zone: 'H', efficiency: 90.2 },
      { zone: 'I', efficiency: 96.1 },
      { zone: 'J', efficiency: 87.9 },
      { zone: 'K', efficiency: 92.5 },
      { zone: 'L', efficiency: 91.0 },
    ],
    trend: generatePowerData(30, 1).map(p => ({ date: p.timestamp, efficiency: 85 + Math.random() * 12 })),
  },
  environmental: {
    carbonOffset: 1247.5,
    treesEquivalent: 57340,
    homesPowered: 892,
  },
  faultStatistics: {
    byType: [
      { type: 'Hot Spot', count: 23 },
      { type: 'Soiling', count: 45 },
      { type: 'Physical Damage', count: 8 },
      { type: 'Connection Issue', count: 17 },
      { type: 'Shading', count: 12 },
      { type: 'Degradation', count: 31 },
    ],
    byMonth: [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 8 },
      { month: 'Mar', count: 15 },
      { month: 'Apr', count: 22 },
      { month: 'May', count: 18 },
      { month: 'Jun', count: 14 },
    ],
    avgResolutionTime: 4.2,
  },
};

export const mockDashboardMetrics = calculateMetrics(mockPanels);
