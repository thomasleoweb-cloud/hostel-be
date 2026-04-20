const express = require('express');
const router = express.Router();
const { getResidents, getResident, createResident, updateResident, deleteResident, getResidentInvoices } = require('../controllers/residentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(authorize('admin', 'staff'), getResidents).post(authorize('admin', 'staff'), createResident);
router.route('/:id').get(getResident).put(authorize('admin', 'staff'), updateResident).delete(authorize('admin'), deleteResident);
router.get('/:id/invoices', getResidentInvoices);
module.exports = router;
