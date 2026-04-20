const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');
const notificationService = require('../utils/notificationService');


const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { 'recipients.user': req.user._id };
  if (unreadOnly === 'true') filter['recipients.isRead'] = false;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({ 'recipients.user': req.user._id, 'recipients.isRead': false });

  res.json({ success: true, unreadCount, data: notifications });
});


const markAsRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, 'recipients.user': req.user._id },
    { $set: { 'recipients.$.isRead': true, 'recipients.$.readAt': new Date() } }
  );
  res.json({ success: true });
});


const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { 'recipients.user': req.user._id },
    { $set: { 'recipients.$.isRead': true, 'recipients.$.readAt': new Date() } }
  );
  res.json({ success: true });
});


const createNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: notification });
});


const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = { getNotifications, markAsRead, markAllAsRead, createNotification, deleteNotification };
