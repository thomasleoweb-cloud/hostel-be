const express = require('express');
const router = express.Router();
const { getDashboardStats, getRevenueReport, getOccupancyReport, getMaintenanceReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'staff'));
router.get('/dashboard', getDashboardStats);
router.get('/revenue', getRevenueReport);
router.get('/occupancy', getOccupancyReport);
router.get('/maintenance', getMaintenanceReport);
module.exports = router;
