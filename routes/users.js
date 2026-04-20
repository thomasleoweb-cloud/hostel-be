const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, toggleUserStatus, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.route('/').get(getUsers).post(createUser);
router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);
router.put('/:id/toggle-status', toggleUserStatus);
module.exports = router;
