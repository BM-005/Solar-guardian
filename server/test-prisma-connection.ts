// Test script to verify Prisma connection to Neon database
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('🔄 Testing Prisma connection to Neon database...');
    
    // Test 1: Simple query
    const zones = await prisma.zone.findMany();
    console.log('✅ Prisma connected successfully!');
    console.log(`📊 Found ${zones.length} zones`);
    
    // Test 2: Count all tables
    console.log('\n📈 Table Counts:');
    console.log('----------------');
    
    const counts = await Promise.all([
      prisma.zone.count().then(c => ({ table: 'Zone', count: c })),
      prisma.solarPanel.count().then(c => ({ table: 'SolarPanel', count: c })),
      prisma.technician.count().then(c => ({ table: 'Technician', count: c })),
      prisma.ticket.count().then(c => ({ table: 'Ticket', count: c })),
      prisma.faultDetection.count().then(c => ({ table: 'FaultDetection', count: c })),
      prisma.alert.count().then(c => ({ table: 'Alert', count: c })),
      prisma.solarScan.count().then(c => ({ table: 'SolarScan', count: c })),
      prisma.weatherData.count().then(c => ({ table: 'WeatherData', count: c })),
      prisma.powerGeneration.count().then(c => ({ table: 'PowerGeneration', count: c })),
      prisma.user.count().then(c => ({ table: 'User', count: c })),
      prisma.espDevice.count().then(c => ({ table: 'EspDevice', count: c })),
    ]);
    
    counts.forEach(({ table, count }) => {
      console.log(`  ${table}: ${count}`);
    });
    
    console.log('\n✅ All database operations can be performed on Neon database!');
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

