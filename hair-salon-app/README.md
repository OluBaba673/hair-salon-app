# Olu-Deb Hair Place — Booking App

A simple appointment-booking web app that runs on your own laptop. Clients open a page in
their browser, pick a service, date and time, and book. You view and manage bookings on a
password-protected admin page.

## First-time setup

1. Install [Node.js](https://nodejs.org) if you don't already have it (this includes `npm`).
2. Open a terminal in this `hair-salon-app` folder and run:

   ```bash
   npm install
   ```

3. **Change the admin password.** Open the `.env` file in this folder and replace
   `ADMIN_PASSWORD=changeme123` with your own password. Save the file.

## Running the app

Each time you want the app available:

```bash
npm start
```

You'll see:

```
Olu-Deb Hair Place booking app running at http://localhost:3000
```

- **Clients** book at: `http://localhost:3000`
- **You** manage bookings at: `http://localhost:3000/admin.html` (log in with the password
  from your `.env` file)

Leave the terminal window open — closing it stops the app. Press `Ctrl+C` in the terminal to
stop it on purpose.

## Letting clients book from their own phones

Right now the app only works on your laptop's browser (`localhost`). To let clients on your
Wi-Fi network book from their own phone:

1. Find your laptop's local IP address (Windows: run `ipconfig` in a terminal and look for
   "IPv4 Address", something like `192.168.1.23`).
2. Make sure Windows Firewall allows Node.js on private networks (it usually prompts you the
   first time you run the app — choose "Allow").
3. On the client's phone (same Wi-Fi), open `http://192.168.1.23:3000` (using your actual IP).

This only works while your laptop is on, awake, and running `npm start`, and while the client
is on the same network. It does not work over the internet or when your laptop is closed —
that would require paid hosting, which is outside what you asked for.

## Editing your services, prices, hours, or contact info

Open `config.js` and edit the values there — no coding knowledge needed, just careful editing:

```js
services: [
  { id: 'knotless-braids', name: 'Knotless Braids', price: 150, durationMinutes: 360 },
  ...
]
```

`durationMinutes` is the appointment length in minutes (e.g. 360 = 6 hours). Restart the app
(`Ctrl+C`, then `npm start` again) after making changes for them to take effect.

## How booking works

- Clients can only pick times that fit within your business hours (Mon–Sat, 10am–6pm) and
  don't overlap another appointment — the app assumes one client at a time.
- Same-day bookings only show times that haven't already passed.
- Sundays are closed and won't show any time slots.
- If two people try to grab the same slot at the same moment, the second one is told the slot
  is no longer available and asked to pick another.

## Your data

All appointments are stored in `data/db.json` on your laptop — nothing is sent anywhere else.
Back this file up (copy it somewhere safe) if you want to keep a record of past bookings.

## Limitations (kept basic, as requested)

- No automatic email/text confirmations to clients — you see contact info in the admin page
  and can reach out directly. Wiring up real email/SMS would require an email/SMS provider
  account and credentials, which is more setup than "basic."
- Single admin password, no individual staff logins.
- Runs only while your laptop is on — no cloud hosting.
