const express = require('express');
const router = express.Router();
const { getInvoices, getInvoice, createInvoice, updateInvoice, recordPayment, generateBulkInvoices } = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getInvoices).post(authorize('admin', 'staff'), createInvoice);
router.post('/generate-bulk', authorize('admin'), generateBulkInvoices);
router.route('/:id').get(getInvoice).put(authorize('admin', 'staff'), updateInvoice);
router.post('/:id/payment', authorize('admin', 'staff'), recordPayment);
module.exports = router;
