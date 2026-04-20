const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const Resident = require('../models/Resident');


const getRooms = asyncHandler(async (req, res) => {
  const { status, floor, type, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (floor) filter.floor = parseInt(floor);
  if (type) filter.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [rooms, total] = await Promise.all([
    Room.find(filter).populate('currentResident', 'name phone').skip(skip).limit(parseInt(limit)).sort({ floor: 1, roomNumber: 1 }),
    Room.countDocuments(filter)
  ]);

  const stats = {
    total: await Room.countDocuments(),
    available: await Room.countDocuments({ status: 'available' }),
    occupied: await Room.countDocuments({ status: 'occupied' }),
    maintenance: await Room.countDocuments({ status: 'maintenance' }),
  };

  res.json({ success: true, count: total, stats, data: rooms, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});


const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('currentResident', 'name phone email checkInDate');
  if (!room) { res.status(404); throw new Error('Room not found'); }
  res.json({ success: true, data: room });
});


const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create(req.body);
  res.status(201).json({ success: true, data: room });
});


const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) { res.status(404); throw new Error('Room not found'); }
  res.json({ success: true, data: room });
});


const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) { res.status(404); throw new Error('Room not found'); }
  if (room.status === 'occupied') { res.status(400); throw new Error('Cannot delete an occupied room'); }
  await room.deleteOne();
  res.json({ success: true, message: 'Room deleted successfully' });
});


const checkIn = asyncHandler(async (req, res) => {
  const { residentId, checkInDate, expectedCheckOut } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) { res.status(404); throw new Error('Room not found'); }
  if (room.status === 'occupied') { res.status(400); throw new Error('Room is already occupied'); }
  if (room.status === 'maintenance') { res.status(400); throw new Error('Room is under maintenance'); }

  const resident = await Resident.findById(residentId);
  if (!resident) { res.status(404); throw new Error('Resident not found'); }

  resident.room = room._id;
  resident.checkInDate = checkInDate || new Date();
  resident.expectedCheckOut = expectedCheckOut;
  resident.status = 'active';
  await resident.save();

  room.status = 'occupied';
  room.currentResident = resident._id;
  await room.save();

  res.json({ success: true, message: 'Check-in successful', data: { room, resident } });
});


const checkOut = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('currentResident');
  if (!room) { res.status(404); throw new Error('Room not found'); }
  if (room.status !== 'occupied') { res.status(400); throw new Error('Room is not occupied'); }

  const resident = room.currentResident;
  if (resident) {
    resident.checkOutDate = req.body.checkOutDate || new Date();
    resident.status = 'checked-out';
    resident.room = null;
    await resident.save();
  }

  room.status = 'available';
  room.currentResident = null;
  await room.save();

  res.json({ success: true, message: 'Check-out successful', data: room });
});

module.exports = { getRooms, getRoom, createRoom, updateRoom, deleteRoom, checkIn, checkOut };
