/**
 * Comprehensive Database Seed Script
 * 
 * This script seeds the database with:
 * - Zones (A, B, C, D)
 * - Solar Panels (40 panels across 4 zones)
 * - Technicians (4 technicians)
 * - Weather Data (30 days of historical data)
 * - Power Generation (30 days of hourly data)
 * - ESP Devices and Sensor Readings
 * - Solar Scans with Panel Detections
 * - Alerts
 * - Tickets
 * - Automation Events
 * - Users
 * 
 * Usage:
 *   cd server && npx tsx seed-all.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // ============================================
  // 1. CREATE ZONES (using upsert)
  // ============================================
  console.log('📍 Creating Zones...');
  
  const zones = await Promise.all([
    prisma.zone.upsert({
      where: { name: 'A' },
      update: {},
      create: { name: 'A' }
    }),
    prisma.zone.upsert({
      where: { name: 'B' },
      update: {},
      create: { name: 'B' }
    }),
    prisma.zone.upsert({
      where: { name: 'C' },
      update: {},
      create: { name: 'C' }
    }),
    prisma.zone.upsert({
      where: { name: 'D' },
      update: {},
      create: { name: 'D' }
    }),
  ]);
  
  console.log(`✅ Created ${zones.length} zones: ${zones.map(z => z.name).join(', ')}\n`);

  // ============================================
  // 2. CREATE SOLAR PANELS
  // ============================================
  console.log('☀️ Creating Solar Panels...');
  
  const panelStatuses = ['healthy', 'healthy', 'healthy', 'healthy', 'warning', 'fault'];
  const panels = [];
  
  for (const zone of zones) {
    for (let row = 1; row <= 10; row++) {
      for (let col = 1; col <= 1; col++) {
        const status = panelStatuses[Math.floor(Math.random() * panelStatuses.length)];
        const efficiency = status === 'healthy' ? 85 + Math.random() * 15 : 
                          status === 'warning' ? 70 + Math.random() * 15 : 
                          50 + Math.random() * 20;
        
        panels.push({
          panelId: `PNL-${zone.name}${String(row).padStart(2, '0')}${String(col).padStart(2, '0')}`,
          row,
          column: col,
          zoneId: zone.id,
          status,
          efficiency,
          currentOutput: status === 'offline' ? 0 : Math.random() * 300,
          maxOutput: 400,
          temperature: 25 + Math.random() * 30,
          lastChecked: new Date(),
          installDate: new Date('2023-01-15'),
          inverterGroup: `INV-${zone.name}-${Math.ceil(row / 5)}`,
          stringId: `STR-${zone.name}-${col}`,
        });
      }
    }
  }
  
  const createdPanels = await Promise.all(
    panels.map(panel => prisma.solarPanel.create({ data: panel }))
  );
  
  console.log(`✅ Created ${createdPanels.length} solar panels\n`);

  // ============================================
  // 3. CREATE TECHNICIANS
  // ============================================
  console.log('👨‍🔧 Creating Technicians...');
  
  const technicians = await Promise.all([
    prisma.technician.create({
      data: {
        name: 'John Smith',
        email: 'john.smith@solarguardian.com',
        phone: '+1-555-0101',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        status: 'available',
        skills: 'electrical,panel repair,inverter troubleshooting',
        activeTickets: 2,
        resolvedTickets: 45,
        avgResolutionTime: 2.5,
      }
    }),
    prisma.technician.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@solarguardian.com',
        phone: '+1-555-0102',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        status: 'available',
        skills: 'thermal imaging,drone operation,cleaning',
        activeTickets: 1,
        resolvedTickets: 32,
        avgResolutionTime: 3.2,
      }
    }),
    prisma.technician.create({
      data: {
        name: 'Mike Davis',
        email: 'mike.davis@solarguardian.com',
        phone: '+1-555-0103',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
        status: 'busy',
        skills: 'electrical,wiring,connector repair',
        activeTickets: 3,
        resolvedTickets: 58,
        avgResolutionTime: 2.1,
      }
    }),
    prisma.technician.create({
      data: {
        name: 'Emily Chen',
        email: 'emily.chen@solarguardian.com',
        phone: '+1-555-0104',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
        status: 'available',
        skills: 'panel replacement,structural repair,warranty',
        activeTickets: 0,
        resolvedTickets: 28,
        avgResolutionTime: 4.0,
      }
    }),
  ]);
  
  console.log(`✅ Created ${technicians.length} technicians\n`);

  // ============================================
  // 4. CREATE FAULT DETECTIONS
  // ============================================
  console.log('🔍 Creating Fault Detections...');
  
  const faultTypes = ['Hotspot', 'Dirty Panel', 'Cracked', 'Shading', 'Inverter Fault', 'Connector Issue'];
  const severities = ['low', 'medium', 'high', 'critical'];
  
  const faultyPanels = createdPanels.filter(p => p.status === 'fault' || p.status === 'warning');
  const faultDetections = await Promise.all(
    faultyPanels.slice(0, 8).map((panel, idx) => 
      prisma.faultDetection.create({
        data: {
          panelId: panel.id,
          detectedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          severity: severities[Math.floor(Math.random() * severities.length)],
          faultType: faultTypes[Math.floor(Math.random() * faultTypes.length)],
          aiConfidence: 75 + Math.random() * 25,
          aiAnalysis: 'AI analysis indicates potential issue requiring immediate attention.',
          recommendedAction: 'Schedule technician for on-site inspection and repair.',
          locationX: Math.random() * 100,
          locationY: Math.random() * 100,
        }
      })
    )
  );
  
  console.log(`✅ Created ${faultDetections.length} fault detections\n`);

  // ============================================
  // 5. CREATE TICKETS
  // ============================================
  console.log('🎫 Creating Tickets...');
  
  const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-001',
        panelId: faultyPanels[0]?.id,
        faultId: faultDetections[0]?.id,
        status: 'open',
        priority: 'critical',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        description: 'Critical thermal hotspot detected - temperature above 85°C',
        faultType: 'Hotspot',
        zone: 'A',
        row: 5,
        assignedTechnicianId: technicians[0].id,
      }
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-002',
        panelId: faultyPanels[1]?.id,
        faultId: faultDetections[1]?.id,
        status: 'in_progress',
        priority: 'high',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        description: 'Significant dust accumulation detected - efficiency drop of 15%',
        faultType: 'Dirty Panel',
        zone: 'B',
        row: 3,
        assignedTechnicianId: technicians[1].id,
      }
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-003',
        panelId: faultyPanels[2]?.id,
        faultId: faultDetections[2]?.id,
        status: 'resolved',
        priority: 'medium',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        description: 'Partial shading detected from nearby obstruction',
        faultType: 'Shading',
        zone: 'C',
        row: 8,
        assignedTechnicianId: technicians[2].id,
        resolutionNotes: 'Removed obstruction and cleaned panels.',
        resolutionCause: 'Tree branch overhang',
      }
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-004',
        panelId: faultyPanels[3]?.id,
        faultId: faultDetections[3]?.id,
        status: 'closed',
        priority: 'low',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        description: 'Minor dust accumulation - cleaning recommended',
        faultType: 'Dirty Panel',
        zone: 'D',
        row: 2,
        assignedTechnicianId: technicians[3].id,
        resolutionNotes: 'Completed routine cleaning.',
        resolutionCause: 'Dust and debris buildup',
      }
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-005',
        panelId: faultyPanels[4]?.id,
        faultId: faultDetections[4]?.id,
        status: 'open',
        priority: 'high',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        description: 'Major crack detected across panel surface',
        faultType: 'Cracked',
        zone: 'A',
        row: 7,
        assignedTechnicianId: technicians[3].id,
      }
    }),
  ]);
  
  console.log(`✅ Created ${tickets.length} tickets\n`);

  // ============================================
  // 6. CREATE WEATHER DATA
  // ============================================
  console.log('🌤️ Creating Weather Data (30 days)...');
  
  const weatherConditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Sunny'];
  const weatherData = [];
  
  for (let i = 0; i < 30 * 24; i++) {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - 30);
    timestamp.setHours(timestamp.getHours() + i);
    
    const hour = timestamp.getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    
    weatherData.push({
      temperature: 15 + Math.random() * 20,
      condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      humidity: 30 + Math.random() * 50,
      sunlightIntensity: isDaytime ? 50 + Math.random() * 50 : 0,
      recordedAt: timestamp,
    });
  }
  
  // Insert in chunks
  for (let i = 0; i < weatherData.length; i += 100) {
    await prisma.weatherData.createMany({
      data: weatherData.slice(i, i + 100)
    });
  }
  
  console.log(`✅ Created ${weatherData.length} weather data points\n`);

  // ============================================
  // 7. CREATE POWER GENERATION DATA
  // ============================================
  console.log('⚡ Creating Power Generation Data (30 days)...');
  
  const powerData = [];
  const now = new Date();
  
  for (let i = 0; i < 30 * 24; i++) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getUTCHours();
    const dayOfWeek = timestamp.getUTCDay();
    
    // Simulate solar power curve (peak at noon)
    let basePower = 0;
    if (hour >= 6 && hour <= 18 && dayOfWeek !== 0) {
      basePower = Math.sin((hour - 6) * Math.PI / 12) * 10000;
      basePower += (Math.random() - 0.5) * 2000;
    }
    
    powerData.push({
      timestamp,
      value: Math.max(0, basePower),
    });
  }
  
  // Insert in chunks
  for (let i = 0; i < powerData.length; i += 100) {
    await prisma.powerGeneration.createMany({
      data: powerData.slice(i, i + 100)
    });
  }
  
  console.log(`✅ Created ${powerData.length} power generation data points\n`);

  // ============================================
  // 8. CREATE ESP DEVICES AND READINGS
  // ============================================
  console.log('📡 Creating ESP Devices and Sensor Readings...');
  
  const espDevices = await Promise.all([
    prisma.espDevice.create({
      data: {
        deviceId: 'ESP-SOLAR-001',
        lastSeenAt: new Date(),
        latestVoltage: 12.5,
        latestCurrentMa: 250,
        latestPowerMw: 3125,
      }
    }),
    prisma.espDevice.create({
      data: {
        deviceId: 'ESP-SOLAR-002',
        lastSeenAt: new Date(),
        latestVoltage: 11.8,
        latestCurrentMa: 180,
        latestPowerMw: 2124,
      }
    }),
  ]);
  
  // Create sensor readings for each device
  for (const device of espDevices) {
    const readings = [];
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(Date.now() - i * 5 * 60 * 1000);
      readings.push({
        deviceRefId: device.id,
        voltage: 11 + Math.random() * 2,
        currentMa: 150 + Math.random() * 150,
        powerMw: (11 + Math.random() * 2) * (150 + Math.random() * 150),
        recordedAt: timestamp,
      });
    }
    
    await prisma.espSensorReading.createMany({ data: readings });
  }
  
  console.log(`✅ Created ${espDevices.length} ESP devices with sensor readings\n`);

  // ============================================
  // 9. CREATE SOLAR SCANS
  // ============================================
  console.log('📸 Creating Solar Scans...');
  
  const solarScans = await Promise.all([
    prisma.solarScan.create({
      data: {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
        status: 'processed',
        thermalMinTemp: 28,
        thermalMaxTemp: 65,
        thermalMeanTemp: 42,
        thermalDelta: 18,
        riskScore: 72,
        severity: 'HIGH',
        dustyPanelCount: 5,
        cleanPanelCount: 15,
        totalPanels: 20,
        deviceId: 'RPI-CAMERA-001',
        deviceName: 'Raspberry Pi Camera 1',
      }
    }),
    prisma.solarScan.create({
      data: {
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        priority: 'MEDIUM',
        status: 'processed',
        thermalMinTemp: 25,
        thermalMaxTemp: 45,
        thermalMeanTemp: 32,
        thermalDelta: 8,
        riskScore: 35,
        severity: 'MODERATE',
        dustyPanelCount: 3,
        cleanPanelCount: 17,
        totalPanels: 20,
        deviceId: 'RPI-CAMERA-001',
        deviceName: 'Raspberry Pi Camera 1',
      }
    }),
    prisma.solarScan.create({
      data: {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        priority: 'NORMAL',
        status: 'archived',
        thermalMinTemp: 24,
        thermalMaxTemp: 38,
        thermalMeanTemp: 30,
        thermalDelta: 5,
        riskScore: 20,
        severity: 'LOW',
        dustyPanelCount: 2,
        cleanPanelCount: 18,
        totalPanels: 20,
        deviceId: 'RPI-CAMERA-002',
        deviceName: 'Raspberry Pi Camera 2',
      }
    }),
  ]);
  
  console.log(`✅ Created ${solarScans.length} solar scans\n`);

  // ============================================
  // 10. CREATE PANEL DETECTIONS
  // ============================================
  console.log('🔎 Creating Panel Detections...');
  
  const detectionStatuses = ['CLEAN', 'CLEAN', 'CLEAN', 'DUSTY', 'FAULTY'];
  
  for (const scan of solarScans) {
    const detections = [];
    for (let i = 1; i <= scan.totalPanels; i++) {
      const status = detectionStatuses[Math.floor(Math.random() * detectionStatuses.length)];
      detections.push({
        scanId: scan.id,
        panelNumber: `P${i}`,
        status,
        x1: (i - 1) * 100,
        y1: 0,
        x2: i * 100,
        y2: 100,
        faultType: status === 'FAULTY' ? 'Hotspot' : status === 'DUSTY' ? 'Dust' : null,
        confidence: status === 'CLEAN' ? 95 : 80 + Math.random() * 15,
      });
    }
    
    await prisma.panelDetection.createMany({ data: detections });
  }
  
  console.log(`✅ Created panel detections for all scans\n`);

  // ============================================
  // 11. CREATE ALERTS
  // ============================================
  console.log('⚠️ Creating Alerts...');
  
  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        alertId: 'ALERT-AK-001',
        zone: 'A',
        row: 5,
        status: 'warning',
        message: 'High temperature detected in Zone A, Row 5',
        dismissed: false,
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALERT-AK-002',
        zone: 'B',
        row: 3,
        status: 'fault',
        message: 'Multiple dusty panels detected',
        dismissed: false,
        ticketId: tickets[1].id,
      }
    }),
    prisma.alert.create({
      data: {
        zone: 'C',
        row: 8,
        status: 'warning',
        message: 'Shading detected',
        dismissed: true,
        dismissedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }
    }),
    prisma.alert.create({
      data: {
        alertId: 'ALERT-AK-003',
        zone: 'A',
        row: 7,
        status: 'fault',
        message: 'Cracked panel detected - immediate attention required',
        dismissed: false,
        ticketId: tickets[4].id,
      }
    }),
  ]);
  
  console.log(`✅ Created ${alerts.length} alerts\n`);

  // ============================================
  // 12. CREATE USERS
  // ============================================
  console.log('👤 Creating Users...');
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@solarguardian.com',
        name: 'Admin User',
        role: 'admin',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      }
    }),
    prisma.user.create({
      data: {
        email: 'manager@solarguardian.com',
        name: 'Manager User',
        role: 'manager',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager',
      }
    }),
  ]);
  
  console.log(`✅ Created ${users.length} users\n`);

  // ============================================
  // 13. CREATE AUTOMATION EVENTS
  // ============================================
  console.log('🔄 Creating Automation Events...');
  
  const automationEvents = await Promise.all([
    prisma.automationEvent.create({
      data: {
        eventType: 'SCAN_RECEIVED',
        stage: 'scan',
        incidentId: 'INC-001',
        scanId: solarScans[0].id,
        panelId: createdPanels[0].panelId,
        payload: { scanData: 'processed' },
      }
    }),
    prisma.automationEvent.create({
      data: {
        eventType: 'ALERT_CREATED',
        stage: 'alert',
        incidentId: 'INC-001',
        alertId: alerts[0].id,
        panelId: createdPanels[0].panelId,
        payload: { severity: 'warning' },
      }
    }),
    prisma.automationEvent.create({
      data: {
        eventType: 'TICKET_CREATED',
        stage: 'ticket',
        incidentId: 'INC-001',
        ticketId: tickets[0].id,
        panelId: createdPanels[0].panelId,
        technicianId: technicians[0].id,
        payload: { priority: 'critical' },
      }
    }),
    prisma.automationEvent.create({
      data: {
        eventType: 'TICKET_ASSIGNED',
        stage: 'assignment',
        incidentId: 'INC-001',
        ticketId: tickets[0].id,
        panelId: createdPanels[0].panelId,
        technicianId: technicians[0].id,
        payload: { assignedTo: technicians[0].name },
      }
    }),
  ]);
  
  console.log(`✅ Created ${automationEvents.length} automation events\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(50));
  console.log('🎉 DATABASE SEED COMPLETE!');
  console.log('='.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   - Zones: ${zones.length}`);
  console.log(`   - Solar Panels: ${createdPanels.length}`);
  console.log(`   - Technicians: ${technicians.length}`);
  console.log(`   - Fault Detections: ${faultDetections.length}`);
  console.log(`   - Tickets: ${tickets.length}`);
  console.log(`   - Weather Data: ${weatherData.length} points`);
  console.log(`   - Power Generation: ${powerData.length} points`);
  console.log(`   - ESP Devices: ${espDevices.length}`);
  console.log(`   - Solar Scans: ${solarScans.length}`);
  console.log(`   - Alerts: ${alerts.length}`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Automation Events: ${automationEvents.length}`);
  console.log('\n✅ All data has been successfully seeded!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

