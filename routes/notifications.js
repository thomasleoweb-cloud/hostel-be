const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, createNotification, deleteNotification } = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getNotifications).post(authorize('admin', 'staff'), createNotification);
router.put('/read-all', markAllAsRead);
router.route('/:id/read').put(markAsRead);
router.delete('/:id', authorize('admin'), deleteNotification);
module.exports = router;
