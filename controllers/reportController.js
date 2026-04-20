const asyncHandler = require('express-async-handler');
const Room = require('../models/Room');
const Resident = require('../models/Resident');
const Invoice = require('../models/Invoice');
const Maintenance = require('../models/Maintenance');

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalRooms, occupiedRooms, availableRooms, maintenanceRooms,
    totalResidents, activeResidents,
    pendingMaintenance, inProgressMaintenance,
    revenueCurrent, revenueLastMonth,
    totalDue
  ] = await Promise.all([
    Room.countDocuments(),
    Room.countDocuments({ status: 'occupied' }),
    Room.countDocuments({ status: 'available' }),
    Room.countDocuments({ status: 'maintenance' }),
    Resident.countDocuments(),
    Resident.countDocuments({ status: 'active' }),
    Maintenance.countDocuments({ status: 'pending' }),
    Maintenance.countDocuments({ status: 'in-progress' }),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]).then(r => r[0]?.total || 0),
    Invoice.aggregate([
      { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]).then(r => r[0]?.total || 0),
    Invoice.aggregate([
      { $match: { status: { $in: ['partial', 'overdue', 'sent'] } } },
      { $group: { _id: null, total: { $sum: '$balanceDue' } } }
    ]).then(r => r[0]?.total || 0)
  ]);

  res.json({
    success: true,
    data: {
      rooms: { total: totalRooms, occupied: occupiedRooms, available: availableRooms, maintenance: maintenanceRooms, occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0 },
      residents: { total: totalResidents, active: activeResidents },
      maintenance: { pending: pendingMaintenance, inProgress: inProgressMaintenance },
      finance: { revenueCurrent, revenueLastMonth, totalDue, revenueGrowth: revenueLastMonth ? (((revenueCurrent - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1) : 0 }
    }
  });
});


const getRevenueReport = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const monthly = await Invoice.aggregate([
    { $match: { createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(parseInt(year) + 1, 0, 1) } } },
    { $group: {
      _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
      revenue: { $sum: '$amountPaid' },
      billed: { $sum: '$total' },
      invoiceCount: { $sum: 1 }
    }},
    { $sort: { '_id.month': 1 } }
  ]);

  const byType = await Invoice.aggregate([
    { $match: { createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(parseInt(year) + 1, 0, 1) } } },
    { $unwind: '$lineItems' },
    { $group: { _id: '$lineItems.type', total: { $sum: '$lineItems.amount' } } }
  ]);

  res.json({ success: true, data: { monthly, byType, year: parseInt(year) } });
});


const getOccupancyReport = asyncHandler(async (req, res) => {
  const byType = await Room.aggregate([
    { $group: { _id: '$type', total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } } } }
  ]);
  const byFloor = await Room.aggregate([
    { $group: { _id: '$floor', total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, data: { byType, byFloor } });
});


const getMaintenanceReport = asyncHandler(async (req, res) => {
  const byCategory = await Maintenance.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 }, avgCost: { $avg: '$cost' } } }
  ]);
  const byStatus = await Maintenance.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const byPriority = await Maintenance.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);
  res.json({ success: true, data: { byCategory, byStatus, byPriority } });
});

module.exports = { getDashboardStats, getRevenueReport, getOccupancyReport, getMaintenanceReport };
