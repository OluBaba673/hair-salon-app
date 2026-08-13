const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let config = null;
let selectedServiceId = null;
let selectedSlot = null;

const serviceGrid = document.getElementById('serviceGrid');
const dateInput = document.getElementById('dateInput');
const slotsBox = document.getElementById('slotsBox');
const messageBox = document.getElementById('messageBox');
const submitBtn = document.getElementById('submitBtn');
const bookingForm = document.getElementById('bookingForm');
const formCard = document.getElementById('formCard');
const confirmationCard = document.getElementById('confirmationCard');
const confirmationDetails = document.getElementById('confirmationDetails');

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function showMessage(text, type) {
  messageBox.innerHTML = text ? `<div class="message ${type}">${text}</div>` : '';
}

async function loadConfig() {
  const res = await fetch('/api/config');
  config = await res.json();

  document.getElementById('businessName').textContent = config.businessName;
  document.getElementById('contactEmail').textContent = config.contactEmail;

  const openDayNames = config.openDays.map((d) => DAY_NAMES[d]).join(', ');
  document.getElementById('hours').textContent = `${openDayNames}, ${formatTime12h(config.openTime)}–${formatTime12h(config.closeTime)}`;

  serviceGrid.innerHTML = '';
  config.services.forEach((s) => {
    const hrs = (s.durationMinutes / 60).toFixed(s.durationMinutes % 60 === 0 ? 0 : 1);
    const div = document.createElement('div');
    div.className = 'service-option';
    div.dataset.serviceId = s.id;
    div.innerHTML = `<span class="name">${s.name}</span><span class="meta">$${s.price} · ${hrs}hr${hrs == 1 ? '' : 's'}</span>`;
    div.addEventListener('click', () => selectService(s.id));
    serviceGrid.appendChild(div);
  });

  dateInput.min = todayStr();
}

function selectService(serviceId) {
  selectedServiceId = serviceId;
  selectedSlot = null;
  [...serviceGrid.children].forEach((el) => {
    el.classList.toggle('selected', el.dataset.serviceId === serviceId);
  });
  refreshSlots();
}

async function refreshSlots() {
  showMessage('', '');
  submitBtn.disabled = true;
  selectedSlot = null;

  if (!selectedServiceId || !dateInput.value) {
    slotsBox.innerHTML = '<span class="muted">Pick a service and date to see available times.</span>';
    return;
  }

  slotsBox.innerHTML = '<span class="muted">Loading available times…</span>';

  const res = await fetch(`/api/slots?serviceId=${encodeURIComponent(selectedServiceId)}&date=${encodeURIComponent(dateInput.value)}`);
  const data = await res.json();

  if (data.error) {
    slotsBox.innerHTML = `<span class="muted">${data.error}</span>`;
    return;
  }
  if (data.closed) {
    slotsBox.innerHTML = '<span class="muted">We\'re closed on that day. Please pick another date.</span>';
    return;
  }
  if (!data.slots.length) {
    slotsBox.innerHTML = '<span class="muted">No times available that day. Please try another date.</span>';
    return;
  }

  slotsBox.innerHTML = '';
  data.slots.forEach((time) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = formatTime12h(time);
    btn.addEventListener('click', () => {
      selectedSlot = time;
      [...slotsBox.children].forEach((c) => c.classList.remove('selected'));
      btn.classList.add('selected');
      submitBtn.disabled = false;
    });
    slotsBox.appendChild(btn);
  });
}

dateInput.addEventListener('change', refreshSlots);

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('', '');

  if (!selectedServiceId || !dateInput.value || !selectedSlot) {
    showMessage('Please choose a service, date and time.', 'error');
    return;
  }

  const payload = {
    serviceId: selectedServiceId,
    date: dateInput.value,
    startTime: selectedSlot,
    clientName: document.getElementById('clientName').value,
    clientPhone: document.getElementById('clientPhone').value,
    clientEmail: document.getElementById('clientEmail').value,
    notes: document.getElementById('notes').value
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking…';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Something went wrong. Please try again.', 'error');
      if (res.status === 409) refreshSlots();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Book Appointment';
      return;
    }

    showConfirmation(data.booking);
  } catch (err) {
    showMessage('Could not reach the server. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Book Appointment';
  }
});

function showConfirmation(booking) {
  formCard.classList.add('hidden');
  confirmationCard.classList.remove('hidden');
  confirmationDetails.innerHTML = `
    <dt>Service</dt><dd>${booking.serviceName}</dd>
    <dt>Date</dt><dd>${booking.date}</dd>
    <dt>Time</dt><dd>${formatTime12h(booking.startTime)} – ${formatTime12h(booking.endTime)}</dd>
    <dt>Price</dt><dd>$${booking.price}</dd>
    <dt>Name</dt><dd>${booking.clientName}</dd>
    <dt>Phone</dt><dd>${booking.clientPhone}</dd>
  `;
}

document.getElementById('bookAnotherBtn').addEventListener('click', () => {
  confirmationCard.classList.add('hidden');
  formCard.classList.remove('hidden');
  bookingForm.reset();
  selectedServiceId = null;
  selectedSlot = null;
  [...serviceGrid.children].forEach((el) => el.classList.remove('selected'));
  dateInput.value = '';
  slotsBox.innerHTML = '<span class="muted">Pick a service and date to see available times.</span>';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Book Appointment';
  showMessage('', '');
});

loadConfig();
