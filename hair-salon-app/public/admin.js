const messageBox = document.getElementById('messageBox');
const loginCard = document.getElementById('loginCard');
const bookingsCard = document.getElementById('bookingsCard');
const bookingsBody = document.getElementById('bookingsBody');
const passwordInput = document.getElementById('passwordInput');

function showMessage(text, type) {
  messageBox.innerHTML = text ? `<div class="message ${type}">${text}</div>` : '';
}

function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

async function checkSession() {
  const res = await fetch('/api/admin/session');
  const data = await res.json();
  if (data.isAdmin) {
    showBookings();
  } else {
    loginCard.classList.remove('hidden');
    bookingsCard.classList.add('hidden');
  }
}

async function login() {
  showMessage('', '');
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: passwordInput.value })
  });
  const data = await res.json();
  if (!res.ok) {
    showMessage(data.error || 'Login failed', 'error');
    return;
  }
  showBookings();
}

async function showBookings() {
  loginCard.classList.add('hidden');
  bookingsCard.classList.remove('hidden');

  const res = await fetch('/api/admin/bookings');
  if (res.status === 401) {
    loginCard.classList.remove('hidden');
    bookingsCard.classList.add('hidden');
    return;
  }
  const data = await res.json();

  bookingsBody.innerHTML = '';
  data.bookings.forEach((b) => {
    const tr = document.createElement('tr');
    if (b.status === 'cancelled') tr.classList.add('cancelled');
    tr.innerHTML = `
      <td>${b.date}</td>
      <td>${formatTime12h(b.startTime)} – ${formatTime12h(b.endTime)}</td>
      <td>${b.serviceName} ($${b.price})</td>
      <td>${b.clientName}</td>
      <td>${b.clientPhone}</td>
      <td>${b.clientEmail || ''}</td>
      <td>${b.notes || ''}</td>
      <td></td>
    `;
    if (b.status !== 'cancelled') {
      const btn = document.createElement('button');
      btn.className = 'cancel-btn';
      btn.textContent = 'Cancel';
      btn.addEventListener('click', () => cancelBooking(b.id));
      tr.lastElementChild.appendChild(btn);
    }
    bookingsBody.appendChild(tr);
  });

  if (!data.bookings.length) {
    bookingsBody.innerHTML = '<tr><td colspan="8" class="muted">No appointments yet.</td></tr>';
  }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this appointment?')) return;
  const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
  if (res.ok) showBookings();
}

document.getElementById('loginBtn').addEventListener('click', login);
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  checkSession();
});

checkSession();
