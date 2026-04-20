const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Create and optionally send a notification via email/SMS
 * @param {Object} options
 */
const create = async ({ title, message, type = 'info', recipientRole = 'all', recipients = [], relatedTo, channels = {}, createdBy }) => {
  try {
    let recipientList = recipients;

    if (recipientRole !== 'specific') {
      const filter = {};
      if (recipientRole !== 'all') filter.role = recipientRole;
      const users = await User.find({ ...filter, isActive: true }).select('_id');
      recipientList = users.map(u => ({ user: u._id, isRead: false }));
    }

    const notification = await Notification.create({
      title, message, type, recipientRole,
      recipients: recipientList,
      relatedTo, channels, createdBy
    });

    // Send email if requested
    if (channels.email) {
      try {
        await sendEmailNotification(notification, recipientList);
        await Notification.findByIdAndUpdate(notification._id, { emailStatus: 'sent' });
      } catch (e) {
        await Notification.findByIdAndUpdate(notification._id, { emailStatus: 'failed' });
        console.error('Email notification failed:', e.message);
      }
    }

    // Send SMS if requested
    if (channels.sms) {
      try {
        await sendSMSNotification(message, recipientList);
        await Notification.findByIdAndUpdate(notification._id, { smsStatus: 'sent' });
      } catch (e) {
        await Notification.findByIdAndUpdate(notification._id, { smsStatus: 'failed' });
        console.error('SMS notification failed:', e.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error.message);
  }
};

const sendEmailNotification = async (notification, recipients) => {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const users = await User.find({ _id: { $in: recipients.map(r => r.user) } }).select('email name');

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9">
      <div style="background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
        <h2 style="color:#1e293b;margin-bottom:8px">${notification.title}</h2>
        <p style="color:#475569;line-height:1.6">${notification.message}</p>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0"/>
        <p style="color:#94a3b8;font-size:12px">This is an automated notification from HostelOS. Please do not reply to this email.</p>
      </div>
    </div>`;

  for (const user of users) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `HostelOS: ${notification.title}`,
      html: emailHtml
    });
  }
};

const sendSMSNotification = async (message, recipients) => {
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const users = await User.find({ _id: { $in: recipients.map(r => r.user) }, phone: { $exists: true } }).select('phone name');

  for (const user of users) {
    if (user.phone) {
      await twilio.messages.create({
        body: `HostelOS: ${message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone.startsWith('+') ? user.phone : `+91${user.phone}`
      });
    }
  }
};

module.exports = { create };
