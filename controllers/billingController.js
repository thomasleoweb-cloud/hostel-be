const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Resident = require('../models/Resident');
const notificationService = require('../utils/notificationService');


const getInvoices = asyncHandler(async (req, res) => {
  const { status, resident, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (resident) filter.resident = resident;
  if (req.user.role === 'resident') {
    const res_ = await Resident.findOne({ user: req.user._id });
    if (res_) filter.resident = res_._id;
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [invoices, total] = await Promise.all([
    Invoice.find(filter).populate('resident', 'name residentId').populate('room', 'roomNumber').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Invoice.countDocuments(filter)
  ]);
  const summary = {
    totalBilled: await Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]).then(r => r[0]?.total || 0),
    totalCollected: await Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }]).then(r => r[0]?.total || 0),
    totalDue: await Invoice.aggregate([{ $match: { status: { $in: ['partial', 'overdue', 'sent'] } } }, { $group: { _id: null, total: { $sum: '$balanceDue' } } }]).then(r => r[0]?.total || 0),
  };
  res.json({ success: true, count: total, summary, data: invoices });
});


const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('resident', 'name residentId phone email emergencyContact')
    .populate('room', 'roomNumber floor type monthlyRate')
    .populate('generatedBy', 'name')
    .populate('paymentHistory.receivedBy', 'name');
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  res.json({ success: true, data: invoice });
});


const createInvoice = asyncHandler(async (req, res) => {
  req.body.generatedBy = req.user._id;
  const invoice = await Invoice.create(req.body);

  await Resident.findByIdAndUpdate(invoice.resident, { $inc: { outstandingBalance: invoice.total } });

  res.status(201).json({ success: true, data: invoice });
});


const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  res.json({ success: true, data: invoice });
});


const recordPayment = asyncHandler(async (req, res) => {
  const { amount, method, transactionId, notes } = req.body;
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  if (amount <= 0) { res.status(400); throw new Error('Payment amount must be positive'); }

  invoice.paymentHistory.push({ amount, method, transactionId, notes, receivedBy: req.user._id, paidAt: new Date() });
  await invoice.save(); // triggers pre-save to recalculate

  await Resident.findByIdAndUpdate(invoice.resident, { $inc: { outstandingBalance: -amount } });

  await notificationService.create({
    title: 'Payment Received',
    message: `Payment of ₹${amount.toLocaleString()} received for invoice ${invoice.invoiceNumber} via ${method}.`,
    type: 'payment',
    recipientRole: 'specific',
    relatedTo: { model: 'Invoice', id: invoice._id }
  });

  res.json({ success: true, data: invoice });
});


const generateBulkInvoices = asyncHandler(async (req, res) => {
  const { month, year, includeRent, includeMess, includeUtilities, messAmount, utilitiesAmount } = req.body;
  const residents = await Resident.find({ status: 'active' }).populate('room');
  const created = [];

  for (const resident of residents) {
    if (!resident.room) continue;
    const lineItems = [];
    if (includeRent) lineItems.push({ description: `Room Rent - ${resident.room.roomNumber}`, type: 'rent', amount: resident.room.monthlyRate });
    if (includeMess && messAmount) lineItems.push({ description: 'Mess Charges', type: 'mess', amount: parseFloat(messAmount) });
    if (includeUtilities && utilitiesAmount) lineItems.push({ description: 'Utilities', type: 'utilities', amount: parseFloat(utilitiesAmount) });

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    const dueDate = new Date(year, month, 5); // 5th of next month

    const invoice = await Invoice.create({
      resident: resident._id, room: resident.room._id,
      billingPeriod: { from, to, label: `${from.toLocaleString('default', { month: 'long' })} ${year}` },
      lineItems, subtotal: lineItems.reduce((s, i) => s + i.amount, 0),
      total: lineItems.reduce((s, i) => s + i.amount, 0),
      dueDate, status: 'sent', generatedBy: req.user._id
    });
    created.push(invoice);
    await Resident.findByIdAndUpdate(resident._id, { $inc: { outstandingBalance: invoice.total } });
  }

  res.status(201).json({ success: true, message: `Generated ${created.length} invoices`, count: created.length });
});

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, recordPayment, generateBulkInvoices };
