const mongoose = require('mongoose');

const ResidentSchema = new mongoose.Schema({
  residentId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  dateOfBirth: { type: Date },
  nationality: { type: String, default: 'Indian' },
  idProofType: {
    type: String,
    enum: ['Aadhaar', 'Passport', 'Voter ID', 'Driving License', 'PAN Card']
  },
  idProofNumber: { type: String },
  idProofDocument: { type: String }, 

  permanentAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },

  emergencyContact: {
    name: { type: String, required: true },
    relationship: String,
    phone: { type: String, required: true },
    email: String
  },

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  checkInDate: { type: Date },
  checkOutDate: { type: Date },
  expectedCheckOut: { type: Date },
  status: {
    type: String,
    enum: ['active', 'checked-out', 'suspended', 'pending'],
    default: 'pending'
  },

  outstandingBalance: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },
  depositStatus: {
    type: String,
    enum: ['paid', 'pending', 'refunded'],
    default: 'pending'
  },

  occupation: String,
  institution: String,
  notes: String,
  photos: [{ type: String }]

}, { timestamps: true });

ResidentSchema.pre('save', async function (next) {
  if (!this.residentId) {
    const count = await mongoose.model('Resident').countDocuments();
    this.residentId = `RES${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

ResidentSchema.index({ status: 1, room: 1 });

module.exports = mongoose.model('Resident', ResidentSchema);
