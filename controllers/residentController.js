const asyncHandler = require('express-async-handler');
const Resident = require('../models/Resident');
const Room = require('../models/Room');


const getResidents = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { residentId: { $regex: search, $options: 'i' } }
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [residents, total] = await Promise.all([
    Resident.find(filter).populate('room', 'roomNumber floor type').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Resident.countDocuments(filter)
  ]);
  res.json({ success: true, count: total, data: residents, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});


const getResident = asyncHandler(async (req, res) => {
  const resident = await Resident.findById(req.params.id).populate('room', 'roomNumber floor type monthlyRate amenities');
  if (!resident) { res.status(404); throw new Error('Resident not found'); }
  res.json({ success: true, data: resident });
});


const createResident = asyncHandler(async (req, res) => {
  const resident = await Resident.create(req.body);
  res.status(201).json({ success: true, data: resident });
});


const updateResident = asyncHandler(async (req, res) => {
  const resident = await Resident.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('room', 'roomNumber floor type');
  if (!resident) { res.status(404); throw new Error('Resident not found'); }
  res.json({ success: true, data: resident });
});


const deleteResident = asyncHandler(async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) { res.status(404); throw new Error('Resident not found'); }
  if (resident.status === 'active') { res.status(400); throw new Error('Cannot delete an active resident. Process check-out first.'); }
  await resident.deleteOne();
  res.json({ success: true, message: 'Resident record deleted' });
});


const getResidentInvoices = asyncHandler(async (req, res) => {
  const Invoice = require('../models/Invoice');
  const invoices = await Invoice.find({ resident: req.params.id }).sort({ createdAt: -1 });
  res.json({ success: true, data: invoices });
});

module.exports = { getResidents, getResident, createResident, updateResident, deleteResident, getResidentInvoices };
