const asyncHandler = require('express-async-handler');
const Maintenance = require('../models/Maintenance');
const notificationService = require('../utils/notificationService');

const getMaintenanceRequests = asyncHandler(async (req, res) => {
  const { status, priority, category, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  if (req.user.role === 'resident') {
    filter.submittedBy = req.user._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [requests, total] = await Promise.all([
    Maintenance.find(filter)
      .populate('room', 'roomNumber floor')
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name phone')
      .populate('resident', 'name')
      .skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Maintenance.countDocuments(filter)
  ]);

  const stats = {
    pending: await Maintenance.countDocuments({ status: 'pending' }),
    inProgress: await Maintenance.countDocuments({ status: 'in-progress' }),
    completed: await Maintenance.countDocuments({ status: 'completed' }),
    urgent: await Maintenance.countDocuments({ priority: 'urgent', status: { $nin: ['completed', 'cancelled'] } })
  };

  res.json({ success: true, count: total, stats, data: requests });
});


const getMaintenanceRequest = asyncHandler(async (req, res) => {
  const req_ = await Maintenance.findById(req.params.id)
    .populate('room', 'roomNumber floor type')
    .populate('submittedBy', 'name email')
    .populate('assignedTo', 'name phone email')
    .populate('resident', 'name phone');
  if (!req_) { res.status(404); throw new Error('Request not found'); }
  res.json({ success: true, data: req_ });
});


const createMaintenanceRequest = asyncHandler(async (req, res) => {
  req.body.submittedBy = req.user._id;
  const request = await Maintenance.create(req.body);
  await request.populate('room', 'roomNumber floor');

  await notificationService.create({
    title: `New Maintenance Request - ${request.priority.toUpperCase()} Priority`,
    message: `${request.title} reported for Room ${request.room?.roomNumber || ''}. Ticket: ${request.ticketId}`,
    type: 'maintenance',
    recipientRole: 'staff',
    relatedTo: { model: 'Maintenance', id: request._id }
  });

  res.status(201).json({ success: true, data: request });
});


const updateMaintenanceRequest = asyncHandler(async (req, res) => {
  const { status, assignedTo, resolutionNotes, estimatedCompletion, cost, updateMessage } = req.body;
  const request = await Maintenance.findById(req.params.id);
  if (!request) { res.status(404); throw new Error('Request not found'); }

  if (status) request.status = status;
  if (assignedTo) { request.assignedTo = assignedTo; request.assignedAt = new Date(); }
  if (resolutionNotes) request.resolutionNotes = resolutionNotes;
  if (estimatedCompletion) request.estimatedCompletion = estimatedCompletion;
  if (cost !== undefined) request.cost = cost;
  if (status === 'completed') request.completedAt = new Date();

  if (updateMessage) {
    request.updates.push({ message: updateMessage, updatedBy: req.user._id, status: status || request.status });
  }

  await request.save();
  await request.populate(['room', 'submittedBy', 'assignedTo']);

  if (status && request.submittedBy) {
    await notificationService.create({
      title: `Maintenance Update - ${request.ticketId}`,
      message: `Your request "${request.title}" status updated to: ${status}. ${updateMessage || ''}`,
      type: 'maintenance',
      recipientRole: 'specific',
      recipients: [{ user: request.submittedBy }],
      relatedTo: { model: 'Maintenance', id: request._id }
    });
  }

  res.json({ success: true, data: request });
});


const deleteMaintenanceRequest = asyncHandler(async (req, res) => {
  const request = await Maintenance.findById(req.params.id);
  if (!request) { res.status(404); throw new Error('Request not found'); }
  await request.deleteOne();
  res.json({ success: true, message: 'Request deleted' });
});

module.exports = { getMaintenanceRequests, getMaintenanceRequest, createMaintenanceRequest, updateMaintenanceRequest, deleteMaintenanceRequest };
