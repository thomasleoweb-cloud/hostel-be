const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Resident = require('../models/Resident');

let razorpay = null;
const getRazorpay = () => {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpay;
};


const createOrder = asyncHandler(async (req, res) => {
  const { invoiceId } = req.body;
  const invoice = await Invoice.findById(invoiceId).populate('resident', 'name email phone');
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
  if (invoice.balanceDue <= 0) { res.status(400); throw new Error('No outstanding balance on this invoice'); }

  const options = {
    amount: Math.round(invoice.balanceDue * 100), // paise
    currency: 'INR',
    receipt: invoice.invoiceNumber,
    notes: {
      invoiceId: invoice._id.toString(),
      residentName: invoice.resident?.name,
      invoiceNumber: invoice.invoiceNumber
    }
  };

  const order = await getRazorpay().orders.create(options);

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      invoiceNumber: invoice.invoiceNumber,
      residentName: invoice.resident?.name,
      residentEmail: invoice.resident?.email,
      residentPhone: invoice.resident?.phone
    }
  });
});


const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error('Payment verification failed: Invalid signature');
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) { res.status(404); throw new Error('Invoice not found'); }

  const paymentDetails = await getRazorpay().payments.fetch(razorpay_payment_id);
  const amount = paymentDetails.amount / 100;

  invoice.paymentHistory.push({
    amount,
    method: 'razorpay',
    transactionId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    paidAt: new Date()
  });
  await invoice.save();

  await Resident.findByIdAndUpdate(invoice.resident, { $inc: { outstandingBalance: -amount } });

  res.json({ success: true, message: 'Payment verified and recorded', data: { invoiceId, amount, transactionId: razorpay_payment_id } });
});


const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body).digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  console.log(`Razorpay webhook: ${event}`);

  if (event === 'payment.failed') {
    const payment = req.body.payload.payment.entity;
    console.error(`Payment failed: ${payment.id} for order ${payment.order_id}`);
  }

  res.json({ success: true });
});

module.exports = { createOrder, verifyPayment, webhook };
