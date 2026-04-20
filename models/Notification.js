const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'payment', 'maintenance', 'announcement'],
    default: 'info'
  },
  recipients: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isRead: { type: Boolean, default: false },
    readAt: Date
  }],
  recipientRole: {
    type: String,
    enum: ['all', 'admin', 'staff', 'resident', 'specific'],
    default: 'all'
  },
  relatedTo: {
    model: { type: String, enum: ['Room', 'Resident', 'Maintenance', 'Invoice'] },
    id: mongoose.Schema.Types.ObjectId
  },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  emailStatus: { type: String, enum: ['pending', 'sent', 'failed', 'not_sent'], default: 'not_sent' },
  smsStatus: { type: String, enum: ['pending', 'sent', 'failed', 'not_sent'], default: 'not_sent' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledFor: Date,
  expiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
