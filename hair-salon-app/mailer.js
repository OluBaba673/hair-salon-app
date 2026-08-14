const nodemailer = require('nodemailer');
const config = require('./config');

let transporter = null;

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`Email not sent (EMAIL_USER/EMAIL_APP_PASSWORD not set in .env): "${subject}" to ${to}`);
    return;
  }
  try {
    await t.sendMail({
      from: `"${config.businessName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text
    });
  } catch (err) {
    console.error(`Failed to send email "${subject}" to ${to}:`, err.message);
  }
}

module.exports = { sendMail };
