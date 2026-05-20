'use strict';
const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function send(to, subject, html) {
  if (!process.env.SMTP_USER) {
    logger.warn('Email not configured — skipping send to: ' + to);
    return;
  }
  await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || 'EduGenius <noreply@edugenius.ng>',
    to, subject, html,
  });
}

// ─── Templates ─────────────────────────────────────────────
const base = (content) => `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{margin:0;font-family:sans-serif;background:#0E1628;color:#E8E4DC}
  .wrap{max-width:540px;margin:40px auto;background:#141F35;border-radius:16px;overflow:hidden}
  .header{background:linear-gradient(135deg,#1A2740,#0E1628);padding:32px;text-align:center}
  .logo{font-size:28px;font-weight:700;color:#E8A838;letter-spacing:-0.5px}
  .body{padding:32px}
  .btn{display:inline-block;background:#E8A838;color:#080D1A;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;margin:20px 0}
  .footer{padding:20px 32px;font-size:12px;color:#5A5666;border-top:1px solid rgba(255,255,255,0.06)}
</style></head><body>
<div class="wrap">
  <div class="header"><div class="logo">EduGenius</div><div style="color:#9A96A0;font-size:13px;margin-top:4px">AI Learning Platform</div></div>
  <div class="body">${content}</div>
  <div class="footer">EduGenius · Empowering African students to excellence<br>Do not reply to this email.</div>
</div></body></html>`;

async function sendWelcome(user) {
  await send(user.email, 'Welcome to EduGenius! 🎓', base(`
    <h2 style="color:#E8A838;margin:0 0 12px">Welcome, ${user.firstName}!</h2>
    <p>Your EduGenius account is ready. Start practising WAEC and JAMB past questions, get AI-powered explanations, and track your progress — all in one place.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard →</a>
    <p style="color:#9A96A0;font-size:13px;margin-top:16px">Your study streak starts today. Good luck! 🔥</p>
  `));
}

async function sendPasswordReset(user, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await send(user.email, 'Reset your EduGenius password', base(`
    <h2 style="color:#E8A838;margin:0 0 12px">Password Reset</h2>
    <p>Hi ${user.firstName}, you requested a password reset. Click the button below. This link expires in <strong>10 minutes</strong>.</p>
    <a href="${url}" class="btn">Reset Password →</a>
    <p style="color:#9A96A0;font-size:13px;margin-top:16px">If you didn't request this, ignore this email — your account is safe.</p>
  `));
}

async function sendAnnouncement(user, title, body) {
  await send(user.email, `[EduGenius] ${title}`, base(`
    <h2 style="color:#E8A838;margin:0 0 12px">${title}</h2>
    <p>${body}</p>
    <a href="${process.env.FRONTEND_URL}" class="btn">Open Platform →</a>
  `));
}

async function sendExamResult(user, session) {
  await send(user.email, `Your exam result: ${session.subject} — ${session.score}%`, base(`
    <h2 style="color:#E8A838;margin:0 0 12px">Exam Result</h2>
    <p>Hi ${user.firstName}, here are your results for <strong>${session.subject}</strong> (${session.examType}):</p>
    <div style="background:#0E1628;border-radius:10px;padding:20px;margin:16px 0;text-align:center">
      <div style="font-size:48px;font-weight:700;color:${session.score >= 50 ? '#10C48A' : '#F06A6A'}">${session.score}%</div>
      <div style="color:#9A96A0;margin-top:4px">${session.correct} / ${session.totalQuestions} correct</div>
    </div>
    <a href="${process.env.FRONTEND_URL}/exams/sessions/${session.id}" class="btn">Review Answers →</a>
  `));
}

module.exports = { sendWelcome, sendPasswordReset, sendAnnouncement, sendExamResult };
