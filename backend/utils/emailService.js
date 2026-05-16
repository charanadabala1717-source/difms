const nodemailer = require("nodemailer");

const hasSmtpConfig = () => {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  if (!hasSmtpConfig()) {
    console.log("Email not sent because SMTP is not configured.");
    console.log({ to, subject, html, attachments: attachments.map((item) => item.filename) });
    return { sent: false, reason: "SMTP is not configured" };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    attachments,
  });

  return { sent: true };
};

module.exports = { sendEmail };
