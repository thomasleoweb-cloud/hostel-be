const express = require('express');
const router = express.Router();
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom, checkIn, checkOut } = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getRooms).post(authorize('admin'), createRoom);
router.route('/:id').get(getRoom).put(authorize('admin', 'staff'), updateRoom).delete(authorize('admin'), deleteRoom);
router.post('/:id/checkin', authorize('admin', 'staff'), checkIn);
router.post('/:id/checkout', authorize('admin', 'staff'), checkOut);
module.exports = router;
