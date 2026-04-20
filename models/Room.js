const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  floor: {
    type: Number,
    required: [true, 'Floor number is required'],
    min: 1
  },
  type: {
    type: String,
    enum: ['Single', 'Double', 'Triple', 'Suite', 'Dormitory'],
    required: [true, 'Room type is required']
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  monthlyRate: {
    type: Number,
    required: [true, 'Monthly rate is required'],
    min: 0
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'reserved'],
    default: 'available'
  },
  amenities: [{
    type: String,
    enum: ['AC', 'WiFi', 'Geyser', 'TV', 'Attached Bathroom', 'Balcony', 'Study Table', 'Wardrobe']
  }],
  currentResident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    default: null
  },
  description: { type: String },
  images: [{ type: String }],
  maintenanceHistory: [{
    date: Date,
    description: String,
    cost: Number
  }]
}, { timestamps: true });

RoomSchema.index({ status: 1, floor: 1 });

module.exports = mongoose.model('Room', RoomSchema);
