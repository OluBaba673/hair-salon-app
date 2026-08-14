# Olu Hair Place — Booking App

A web app for clients to book appointments: pick a service, date and time, and book. You view
and manage bookings on a password-protected admin page. Bookings are stored in a small free
online database (Neon Postgres) so the same appointment list shows up whether you're checking
it from your laptop or the site is live on the internet.

This README covers two things:

1. **Running it on your laptop** (for testing, or if you decide not to go public).
2. **Putting it on the internet for free** (via GitHub + Render), so clients can book from
   anywhere, anytime, without your laptop needing to be on.

You need three free accounts for step 2 — none require a credit card:

| Account | What it's for |
|---|---|
| [neon.com](https://neon.com) | Stores your bookings (the database) |
| [github.com](https://github.com) | Holds a copy of the app's code |
| [render.com](https://render.com) | Runs the app and gives you a public web address |

---

## Part 1 — One-time setup

### 1. Create your free Neon database

1. Go to [neon.com](https://neon.com) and sign up (email + password, or sign in with Google).
2. Once in, click **Create a project** (or it may create one automatically). Name it anything,
   e.g. "olu-hair-place".
3. On the project page, find **Connection Details** / **Connection string**. Copy the string —
   it looks like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Open the `.env` file in this `hair-salon-app` folder (Notepad is fine) and paste it after
   `DATABASE_URL=`, so the line reads:
   ```
   DATABASE_URL=postgresql://neondb_owner:abc123@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Save the file.

### 2. Install dependencies and confirm the password

1. Install [Node.js](https://nodejs.org) if you don't already have it.
2. In a terminal, in this folder, run:
   ```bash
   npm install
   ```
3. In `.env`, confirm `ADMIN_PASSWORD` is set to what you want (already set).

### 3. Bring over your existing test booking (optional, one-time)

If you booked a test appointment earlier while the app used local storage, run this once to
copy it into the new database:

```bash
node scripts/migrate-json-to-postgres.js
```

### 4. Set up email alerts (deposit workflow)

Bookings now require a 30% deposit before they're confirmed. When a client books, the app
emails them payment instructions and emails you a heads-up — for that to work, it needs to
send email through a Gmail account.

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) while
   signed into the Gmail account you want to send from (2-Step Verification must be turned on
   first — Google will prompt you to enable it if it isn't).
2. Under "App name," type something like `Olu Hair Place App` and click **Create**.
3. Google shows a 16-character code (like `abcd efgh ijkl mnop`). Copy it.
4. Open `.env` and paste it after `EMAIL_APP_PASSWORD=` (remove any spaces), and confirm
   `EMAIL_USER=` has the Gmail address you used. Save.

This code is revocable any time from the same Google page — it is not your real Gmail
password, and Claude never sees or handles your actual password.

---

## Part 2 — Running it on your laptop

```bash
npm start
```

You'll see `Olu Hair Place booking app running at http://localhost:3000`.

- **Clients** book at: `http://localhost:3000`
- **You** manage bookings at: `http://localhost:3000/admin.html`

Leave the terminal window open — closing it stops the app. `Ctrl+C` stops it on purpose.

---

## Part 3 — Putting it on the internet (free)

### 1. Create a GitHub account and repository

1. Go to [github.com](https://github.com) and sign up.
2. Click the **+** icon (top right) → **New repository**.
3. Name it `hair-salon-app` (or anything), leave it **Public** or **Private** (either works),
   don't check any of the "initialize with" boxes. Click **Create repository**.
4. GitHub shows you a page with commands. Copy the URL under "…or push an existing repository
   from the command line" — it looks like `https://github.com/yourname/hair-salon-app.git`.
5. Tell me that URL and I'll push the code for you (or run these two commands yourself from
   the `Code Base` folder, not the `hair-salon-app` subfolder):
   ```bash
   git remote add origin https://github.com/yourname/hair-salon-app.git
   git push -u origin master
   ```
   GitHub will prompt you to log in the first time.

### 2. Create your Render web service

1. Go to [render.com](https://render.com) and sign up — choose **"Sign up with GitHub"** so it
   can see your repo.
2. Click **New +** → **Web Service**.
3. Pick your `hair-salon-app` repo from the list.
4. Set:
   - **Root Directory**: `hair-salon-app`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Under **Environment Variables**, click **"Add from .env"** and paste your whole local
   `.env` file content in one go (same idea as before — it'll split into rows automatically):
   - `DATABASE_URL` → your Neon connection string
   - `ADMIN_PASSWORD` → your admin password
   - `SESSION_SECRET` → any long random text
   - `EMAIL_USER` → the Gmail address sending notifications
   - `EMAIL_APP_PASSWORD` → the Gmail App Password from Part 1, Step 4
6. Click **Create Web Service**. Render will build and start it — takes a few minutes.
7. When it's done, Render gives you a public URL. That's what you share with clients.
   The live site for this app is: **https://hair-salon-app-1xxw.onrender.com**
   Admin page: **https://hair-salon-app-1xxw.onrender.com/admin.html**

**Note on the free tier:** Render's free web services fall asleep after 15 minutes without
traffic, so the first visitor after a quiet spell waits ~30–60 seconds for it to wake up —
after that it's fast again. Your bookings are safe either way since they live in Neon, not on
Render's server itself.

---

## Editing your services, prices, hours, or contact info

Open `config.js` and edit the values — no coding knowledge needed, just careful editing:

```js
services: [
  { id: 'knotless-braids', name: 'Knotless Braids', price: 150, durationMinutes: 360 },
  ...
]
```

`durationMinutes` is the appointment length in minutes (e.g. 360 = 6 hours). If you're running
locally, restart the app (`Ctrl+C`, then `npm start`) after changes. If deployed on Render,
commit and push the change, then Render redeploys automatically.

## How booking works

- Clients can only pick times within your business hours (Mon–Sat, 10am–6pm) that don't
  overlap another appointment — the app assumes one client at a time.
- Same-day bookings only show times that haven't already passed.
- Sundays are closed and show no time slots.
- If two people try to grab the same slot at the same moment, the second is told it's no
  longer available and asked to pick another.

## How the deposit/approval workflow works

1. A client books — the appointment is created with status **Pending deposit** and the time
   slot is held (no one else can book over it).
2. The client sees an on-screen message and gets an email with the deposit amount (30% of the
   service price) and your Interac e-Transfer email to send it to.
3. You get an email too, letting you know a new booking needs a deposit check.
4. Once you've checked your bank/email and the e-transfer has actually arrived, go to the
   admin page and click **Accept** (deposit confirmed → appointment locked in, client emailed)
   or **Decline** (no payment → appointment removed, time slot released, client emailed).
5. Confirmed appointments can still be **Cancelled** later from the admin page if needed
   (the client is emailed about that too).

There's no automatic time limit on pending bookings — they stay pending, holding the slot,
until you accept or decline them. The app has no way to detect the Interac transfer itself
(no small business has API access to that) — checking your bank/email and clicking
Accept/Decline is a manual step, by design.

## Your data

Bookings live in your Neon Postgres database, not in a file on your laptop. Neon's free tier
keeps the data indefinitely (no expiration) — it just pauses the database after a period of no
activity and wakes it back up automatically on the next request.

## Limitations (kept basic, as requested)

- No SMS/text notifications — email only.
- Single admin password shared by you and anyone you give it to (e.g. someone helping manage
  bookings) — no individual staff logins or permission levels.
- If `EMAIL_USER`/`EMAIL_APP_PASSWORD` aren't set, the app still works fine — it just skips
  sending emails and logs a note in the server console instead of failing the booking.
