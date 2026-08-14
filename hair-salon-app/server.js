require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const config = require('./config');
const db = require('./db');
const mailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret';

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function parseDateOnly(dateStr) {
  // Expects YYYY-MM-DD, interpreted as local time (noon to dodge DST edge cases)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function todayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function isPastDate(dateStr) {
  return dateStr < todayDateStr();
}

function findService(serviceId) {
  return config.services.find((s) => s.id === serviceId);
}

async function getAvailableSlots(serviceId, dateStr) {
  const service = findService(serviceId);
  const date = parseDateOnly(dateStr);
  if (!service || !date) return { error: 'Invalid service or date' };
  if (isPastDate(dateStr)) return { slots: [] };
  if (!config.openDays.includes(date.getDay())) return { slots: [], closed: true };

  const openMin = timeToMinutes(config.openTime);
  const closeMin = timeToMinutes(config.closeTime);
  const duration = service.durationMinutes;

  const bookingsForDate = await db.getBookingsForDate(dateStr);
  const existing = bookingsForDate.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime)
  }));

  const isToday = dateStr === todayDateStr();
  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  const slots = [];
  for (let start = openMin; start + duration <= closeMin; start += config.slotIncrementMinutes) {
    const end = start + duration;
    if (isToday && start <= nowMin) continue;
    const overlaps = existing.some((b) => start < b.end && end > b.start);
    if (!overlaps) slots.push(minutesToTime(start));
  }
  return { slots };
}

function depositAmount(price) {
  return Math.round(price * config.depositPercent * 100) / 100;
}

function adminUrl(req) {
  return `${req.protocol}://${req.get('host')}/admin.html`;
}

async function sendPendingEmails(req, booking) {
  const deposit = depositAmount(booking.price);

  await mailer.sendMail({
    to: booking.clientEmail,
    subject: `Appointment request received — ${booking.serviceName} on ${booking.date}`,
    text: `Hi ${booking.clientName},

Thanks for booking with ${config.businessName}!

Service: ${booking.serviceName}
Date: ${booking.date}
Time: ${booking.startTime}–${booking.endTime}
Total price: $${booking.price}

To confirm this appointment, please send a deposit of $${deposit} (${Math.round(config.depositPercent * 100)}%) via Interac e-Transfer to:
${config.interacEmail}

Once we've confirmed your payment, you'll get another email confirming your appointment. If we're unable to confirm the deposit, this appointment will be declined and the time slot released.

Questions? Reply to ${config.contactEmail}.

— ${config.businessName}`
  });

  await mailer.sendMail({
    to: config.contactEmail,
    subject: `New booking pending deposit — ${booking.clientName}, ${booking.serviceName} on ${booking.date}`,
    text: `New appointment request awaiting deposit confirmation:

Client: ${booking.clientName}
Phone: ${booking.clientPhone}
Email: ${booking.clientEmail}
Service: ${booking.serviceName}
Date: ${booking.date}
Time: ${booking.startTime}–${booking.endTime}
Deposit expected: $${deposit} (${Math.round(config.depositPercent * 100)}% of $${booking.price})
Notes: ${booking.notes || '(none)'}

Once you've confirmed the Interac e-Transfer arrived, accept or decline this booking here:
${adminUrl(req)}`
  });
}

async function sendConfirmedEmail(booking) {
  await mailer.sendMail({
    to: booking.clientEmail,
    subject: `Appointment confirmed — ${booking.serviceName} on ${booking.date}`,
    text: `Hi ${booking.clientName},

Great news — your deposit has been confirmed and your appointment is locked in!

Service: ${booking.serviceName}
Date: ${booking.date}
Time: ${booking.startTime}–${booking.endTime}

See you then!

— ${config.businessName}`
  });
}

async function sendDeclinedEmail(booking) {
  await mailer.sendMail({
    to: booking.clientEmail,
    subject: `Appointment declined — ${booking.serviceName} on ${booking.date}`,
    text: `Hi ${booking.clientName},

We're sorry, but we weren't able to confirm your deposit for this appointment, so it has been declined and the time slot released:

Service: ${booking.serviceName}
Date: ${booking.date}
Time: ${booking.startTime}–${booking.endTime}

If you'd still like this appointment, please book again, or contact us at ${config.contactEmail} with questions.

— ${config.businessName}`
  });
}

async function sendCancelledEmail(booking) {
  await mailer.sendMail({
    to: booking.clientEmail,
    subject: `Appointment cancelled — ${booking.serviceName} on ${booking.date}`,
    text: `Hi ${booking.clientName},

Your appointment has been cancelled:

Service: ${booking.serviceName}
Date: ${booking.date}
Time: ${booking.startTime}–${booking.endTime}

Contact us at ${config.contactEmail} with any questions.

— ${config.businessName}`
  });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// ---------- public API ----------

app.get('/api/config', (req, res) => {
  res.json({
    businessName: config.businessName,
    contactEmail: config.contactEmail,
    openDays: config.openDays,
    openTime: config.openTime,
    closeTime: config.closeTime,
    services: config.services,
    depositPercent: config.depositPercent,
    interacEmail: config.interacEmail,
    policies: config.policies
  });
});

app.get(
  '/api/slots',
  asyncHandler(async (req, res) => {
    const { serviceId, date } = req.query;
    if (!serviceId || !date) {
      return res.status(400).json({ error: 'serviceId and date are required' });
    }
    const result = await getAvailableSlots(serviceId, date);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  })
);

app.post(
  '/api/bookings',
  asyncHandler(async (req, res) => {
    const { serviceId, date, startTime, clientName, clientPhone, clientEmail, notes } = req.body || {};

    if (!serviceId || !date || !startTime || !clientName || !clientPhone || !clientEmail) {
      return res
        .status(400)
        .json({ error: 'serviceId, date, startTime, clientName, clientPhone and clientEmail are required' });
    }

    const service = findService(serviceId);
    if (!service) return res.status(400).json({ error: 'Unknown service' });

    const parsedDate = parseDateOnly(date);
    if (!parsedDate) return res.status(400).json({ error: 'Invalid date' });
    if (isPastDate(date)) return res.status(400).json({ error: 'That date has already passed' });
    if (!config.openDays.includes(parsedDate.getDay())) {
      return res.status(400).json({ error: 'We are closed on that day' });
    }

    const { slots, error } = await getAvailableSlots(serviceId, date);
    if (error) return res.status(400).json({ error });
    if (!slots.includes(startTime)) {
      return res.status(409).json({ error: 'That time slot is no longer available. Please pick another.' });
    }

    const endTime = minutesToTime(timeToMinutes(startTime) + service.durationMinutes);

    const booking = await db.addBooking({
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
      date,
      startTime,
      endTime,
      clientName: String(clientName).trim(),
      clientPhone: String(clientPhone).trim(),
      clientEmail: String(clientEmail).trim(),
      notes: notes ? String(notes).trim() : ''
    });

    sendPendingEmails(req, booking).catch((err) => console.error('Failed to send pending emails:', err));

    res.status(201).json({ booking, depositAmount: depositAmount(booking.price) });
  })
);

app.get(
  '/api/bookings/lookup',
  asyncHandler(async (req, res) => {
    const phone = (req.query.phone || '').toString();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    const bookings = await db.getBookingsByPhone(digits);
    res.json({
      bookings: bookings.map((b) => ({
        clientName: b.clientName,
        serviceName: b.serviceName,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        price: b.price,
        status: b.status
      }))
    });
  })
);

// ---------- admin API ----------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.get(
  '/api/admin/bookings',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bookings = await db.getAllBookings();
    res.json({ bookings });
  })
);

app.post(
  '/api/admin/bookings/:id/accept',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const booking = await db.setBookingStatus(req.params.id, 'confirmed');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.clientEmail) {
      sendConfirmedEmail(booking).catch((err) => console.error('Failed to send confirmed email:', err));
    }
    res.json({ booking });
  })
);

app.post(
  '/api/admin/bookings/:id/decline',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const booking = await db.setBookingStatus(req.params.id, 'declined');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.clientEmail) {
      sendDeclinedEmail(booking).catch((err) => console.error('Failed to send declined email:', err));
    }
    res.json({ booking });
  })
);

app.delete(
  '/api/admin/bookings/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const booking = await db.setBookingStatus(req.params.id, 'cancelled');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.clientEmail) {
      sendCancelledEmail(booking).catch((err) => console.error('Failed to send cancelled email:', err));
    }
    res.json({ booking });
  })
);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

db.initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`${config.businessName} booking app running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to the database. Check DATABASE_URL in .env.', err);
    process.exit(1);
  });
