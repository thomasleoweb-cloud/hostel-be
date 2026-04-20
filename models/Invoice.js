const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  billingPeriod: {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    label: { type: String } 
  },
  lineItems: [{
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['rent', 'utilities', 'mess', 'laundry', 'internet', 'parking', 'late_fee', 'damage', 'other']
    },
    amount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discount: {
    type: Number,
    default: 0
  },
  discountReason: String,
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  paymentHistory: [{
    amount: Number,
    method: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'razorpay', 'cheque']
    },
    transactionId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paidAt: { type: Date, default: Date.now },
    notes: String,
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  notes: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt: Date
}, { timestamps: true });

InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const d = new Date();
    this.invoiceNumber = `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(count + 1).padStart(4, '0')}`;
  }
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  this.total = this.subtotal - this.discount + this.tax;
  this.amountPaid = this.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  this.balanceDue = Math.max(0, this.total - this.amountPaid);
  if (this.balanceDue === 0 && this.amountPaid > 0) this.status = 'paid';
  else if (this.amountPaid > 0 && this.balanceDue > 0) this.status = 'partial';
  else if (this.dueDate < new Date() && this.balanceDue > 0) this.status = 'overdue';
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
