const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, webhook } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/webhook', webhook);
router.use(protect);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
module.exports = router;
