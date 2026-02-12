import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Zones
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  for (const zoneName of zones) {
    await prisma.zone.upsert({
      where: { name: zoneName },
      update: {},
      create: { name: zoneName },
    });
  }
  console.log(`✅ Created ${zones.length} zones`);

  // Create Panels for each zone
  const createdZones = await prisma.zone.findMany();
  let panelCount = 0;

  for (const zone of createdZones) {
    for (let row = 1; row <= 10; row++) {
      for (let col = 1; col <= 10; col++) {
        const panelId = `PNL-${zone.name}${String(row).padStart(2, '0')}${String(col).padStart(2, '0')}`;
        
        const rand = Math.random();
        let status: 'healthy' | 'warning' | 'fault' | 'offline' = 'healthy';
        if (rand > 0.9) status = 'fault';
        else if (rand > 0.75) status = 'warning';
        else if (rand > 0.98) status = 'offline';

        const efficiency = status === 'offline' ? 0 : 75 + Math.random() * 20;

        await prisma.solarPanel.upsert({
          where: { panelId },
          update: {},
          create: {
            panelId,
            row,
            column: col,
            zoneId: zone.id,
            status,
            efficiency: Math.round(efficiency * 10) / 10,
            currentOutput: status === 'offline' ? 0 : Math.round((efficiency / 100) * 400),
            maxOutput: 400,
            temperature: 35 + Math.random() * 20,
            lastChecked: new Date(),
            installDate: new Date('2023-01-15'),
            inverterGroup: `INV-${zone.name}1`,
            stringId: `STR-${zone.name}${row}`,
          },
        });
        panelCount++;
      }
    }
  }
  console.log(`✅ Created ${panelCount} solar panels`);

  // Create Technicians
  const technicians = [
    { name: 'Marcus Chen', email: 'marcus.chen@solarfarm.com', status: 'available' as const },
    { name: 'Sarah Johnson', email: 'sarah.johnson@solarfarm.com', status: 'busy' as const },
    { name: 'David Rodriguez', email: 'david.rodriguez@solarfarm.com', status: 'available' as const },
    { name: 'Emily Park', email: 'emily.park@solarfarm.com', status: 'offline' as const },
    { name: 'James Wilson', email: 'james.wilson@solarfarm.com', status: 'available' as const },
  ];

  for (const tech of technicians) {
    await prisma.technician.upsert({
      where: { email: tech.email },
      update: {},
      create: {
        ...tech,
        phone: '+1 (555) 123-4567',
        skills: JSON.stringify(['Panel Maintenance', 'Diagnostics']),
        certifications: JSON.stringify(['NABCEP PV']),
        activeTickets: Math.floor(Math.random() * 5),
        resolvedTickets: Math.floor(Math.random() * 200),
        avgResolutionTime: 2 + Math.random() * 3,
        rating: 4 + Math.random(),
      },
    });
  }
  console.log(`✅ Created ${technicians.length} technicians`);

  // Create some weather data
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    await prisma.weatherData.create({
      data: {
        temperature: 20 + Math.random() * 15,
        condition: i > 6 && i < 18 ? 'sunny' : 'cloudy',
        humidity: 40 + Math.random() * 30,
        sunlightIntensity: i > 6 && i < 18 ? 70 + Math.random() * 30 : 0,
        recordedAt: timestamp,
      },
    });
  }
  console.log(`✅ Created 24 hours of weather data`);

  // Create some power generation data
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      timestamp.setHours(hour, 0, 0, 0);
      
      const solarFactor = hour >= 6 && hour <= 18 ? 
        Math.sin(((hour - 6) / 12) * Math.PI) : 0;
      const value = solarFactor * 420 * (0.85 + Math.random() * 0.15);
      
      await prisma.powerGeneration.upsert({
        where: { timestamp },
        update: { value: Math.round(value * 100) / 100 },
        create: {
          timestamp,
          value: Math.round(value * 100) / 100,
        },
      });
    }
  }
  console.log(`✅ Created 7 days of power generation data`);

  // Create some faults
  const faultTypes = ['Hot Spot', 'Soiling', 'Physical Damage', 'Connection Issue'];
  const panels = await prisma.solarPanel.findMany({ take: 20 });

  for (const panel of panels) {
    if (Math.random() > 0.7) {
      await prisma.faultDetection.create({
        data: {
          panelId: panel.id,
          detectedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
          faultType: faultTypes[Math.floor(Math.random() * faultTypes.length)],
          aiConfidence: 80 + Math.random() * 20,
          aiAnalysis: 'AI detected anomaly during routine inspection.',
          recommendedAction: 'Schedule technician for on-site evaluation.',
          locationX: Math.random() * 100,
          locationY: Math.random() * 100,
        },
      });
    }
  }
  console.log(`✅ Created fault detections`);

  // Create tickets WITH IMAGES
  const techniciansList = await prisma.technician.findMany();
  const faults = await prisma.faultDetection.findMany({ take: 10 });
  
  // Demo images - real solar panel images
  const droneImages = [
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?w=400&h=300&fit=crop',
  ];
  const thermalImages = [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop',
  ];
  
  for (const fault of faults) {
    if (Math.random() > 0.3) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          panelId: fault.panelId,
          faultId: fault.id,
          status: ['open', 'in_progress', 'resolved'][Math.floor(Math.random() * 3)] as any,
          priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignedTechnicianId: Math.random() > 0.3 ? techniciansList[0]?.id : null,
          description: `${fault.faultType} detected - requires attention`,
          faultType: fault.faultType,
          droneImageUrl: droneImages[Math.floor(Math.random() * droneImages.length)],
          thermalImageUrl: thermalImages[Math.floor(Math.random() * thermalImages.length)],
          aiAnalysis: fault.aiAnalysis,
          recommendedAction: fault.recommendedAction,
        },
      });
    }
  }
  console.log(`✅ Created tickets with images`);

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
