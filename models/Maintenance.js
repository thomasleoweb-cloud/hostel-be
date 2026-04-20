const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required']
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  title: {
    type: String,
    required: [true, 'Issue title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    enum: ['Electrical', 'Plumbing', 'Carpentry', 'IT/Network', 'Housekeeping', 'Appliance', 'Structural', 'Other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: { type: Date },
  estimatedCompletion: { type: Date },
  completedAt: { type: Date },
  resolutionNotes: { type: String },
  cost: { type: Number, default: 0 },
  images: [{ type: String }],
  updates: [{
    message: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

MaintenanceSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const count = await mongoose.model('Maintenance').countDocuments();
    this.ticketId = `MR${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
