const crypto = require('crypto');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add your Neon Postgres connection string to .env (see README.md).'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT ''
    )
  `);
}

function mapRow(row) {
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    serviceId: row.service_id,
    serviceName: row.service_name,
    price: row.price,
    durationMinutes: row.duration_minutes,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    notes: row.notes
  };
}

async function getAllBookings() {
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY date, start_time');
  return rows.map(mapRow);
}

async function getBookingsForDate(date) {
  // Both pending_payment and confirmed bookings hold the time slot;
  // only declined/cancelled bookings release it.
  const { rows } = await pool.query(
    "SELECT * FROM bookings WHERE date = $1 AND status IN ('pending_payment', 'confirmed')",
    [date]
  );
  return rows.map(mapRow);
}

async function addBooking(booking) {
  const id = crypto.randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO bookings
      (id, status, service_id, service_name, price, duration_minutes, date, start_time, end_time, client_name, client_phone, client_email, notes)
     VALUES ($1, 'pending_payment', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id,
      booking.serviceId,
      booking.serviceName,
      booking.price,
      booking.durationMinutes,
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.clientName,
      booking.clientPhone,
      booking.clientEmail,
      booking.notes
    ]
  );
  return mapRow(rows[0]);
}

async function setBookingStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE bookings SET status = $2 WHERE id = $1 RETURNING *',
    [id, status]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

module.exports = {
  initDb,
  getAllBookings,
  getBookingsForDate,
  addBooking,
  setBookingStatus
};
