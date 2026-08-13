// One-time helper: copies bookings from the old data/db.json file into Postgres.
// Run once, after DATABASE_URL is set in .env: node scripts/migrate-json-to-postgres.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const JSON_PATH = path.join(__dirname, '..', 'data', 'db.json');

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.log('No data/db.json file found — nothing to migrate.');
    return;
  }

  const { bookings } = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  if (!bookings || !bookings.length) {
    console.log('data/db.json has no bookings — nothing to migrate.');
    return;
  }

  await db.initDb();

  for (const b of bookings) {
    await db.addBooking({
      serviceId: b.serviceId,
      serviceName: b.serviceName,
      price: b.price,
      durationMinutes: b.durationMinutes,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      clientEmail: b.clientEmail || '',
      notes: b.notes || ''
    });
    console.log(`Migrated booking for ${b.clientName} on ${b.date}`);
  }

  console.log(`Done. Migrated ${bookings.length} booking(s) to Postgres.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
