const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Room = require('../models/Room');
const Resident = require('../models/Resident');
const Maintenance = require('../models/Maintenance');
const Invoice = require('../models/Invoice');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log(' Seeding database...');

  await Promise.all([User.deleteMany(), Room.deleteMany(), Resident.deleteMany(), Maintenance.deleteMany(), Invoice.deleteMany()]);
  console.log('🗑  Cleared existing data');

  const users = await User.create([
    { name: 'Admin User', email: 'admin@hostel.com', password: 'Admin@123', role: 'admin', phone: '9000000001' },
    { name: 'Ravi Kumar', email: 'ravi@hostel.com', password: 'Staff@123', role: 'staff', phone: '9000000002' },
    { name: 'Meena Sharma', email: 'meena@hostel.com', password: 'Staff@123', role: 'staff', phone: '9000000003' },
    { name: 'Arjun Kumar', email: 'arjun@email.com', password: 'Resident@123', role: 'resident', phone: '9876543210' },
    { name: 'Priya Nair', email: 'priya@email.com', password: 'Resident@123', role: 'resident', phone: '9876543211' },
    { name: 'Rahul Singh', email: 'rahul@email.com', password: 'Resident@123', role: 'resident', phone: '9876543212' },
  ]);
  console.log(` Created ${users.length} users`);

  const roomData = [];
  const types = ['Single', 'Double', 'Triple', 'Suite'];
  const rates = { Single: 3500, Double: 5500, Triple: 7000, Suite: 9500 };
  const amenityMap = {
    Single: ['WiFi', 'Study Table', 'Wardrobe'],
    Double: ['WiFi', 'AC', 'Study Table', 'Wardrobe', 'Attached Bathroom'],
    Triple: ['WiFi', 'Geyser', 'Study Table', 'Wardrobe'],
    Suite: ['WiFi', 'AC', 'Geyser', 'TV', 'Attached Bathroom', 'Balcony', 'Study Table', 'Wardrobe']
  };
  for (let floor = 1; floor <= 4; floor++) {
    for (let num = 1; num <= 10; num++) {
      const type = types[(num - 1) % 4];
      roomData.push({
        roomNumber: `${floor}0${num > 9 ? num : '0' + num}`,
        floor, type, capacity: type === 'Dormitory' ? 6 : type === 'Triple' ? 3 : type === 'Double' ? 2 : 1,
        monthlyRate: rates[type], amenities: amenityMap[type],
        status: num % 5 === 0 ? 'maintenance' : num % 3 === 0 ? 'available' : 'occupied'
      });
    }
  }
  const rooms = await Room.create(roomData);
  console.log(` Created ${rooms.length} rooms`);

  const residentData = [
    { name: 'Arjun Kumar', email: 'arjun@email.com', phone: '9876543210', gender: 'Male', dateOfBirth: new Date('2000-03-15'), permanentAddress: { city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001' }, emergencyContact: { name: 'Suresh Kumar', relationship: 'Father', phone: '9988776655' }, room: rooms[0]._id, checkInDate: new Date('2025-01-10'), status: 'active', securityDeposit: 5000, depositStatus: 'paid', outstandingBalance: 1200 },
    { name: 'Priya Nair', email: 'priya@email.com', phone: '9876543211', gender: 'Female', dateOfBirth: new Date('2001-07-22'), permanentAddress: { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, emergencyContact: { name: 'Latha Nair', relationship: 'Mother', phone: '9988776644' }, room: rooms[1]._id, checkInDate: new Date('2025-02-01'), status: 'active', securityDeposit: 8000, depositStatus: 'paid', outstandingBalance: 0 },
    { name: 'Rahul Singh', email: 'rahul@email.com', phone: '9876543212', gender: 'Male', dateOfBirth: new Date('1999-11-08'), permanentAddress: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }, emergencyContact: { name: 'Raj Singh', relationship: 'Father', phone: '9988776633' }, room: rooms[3]._id, checkInDate: new Date('2024-12-15'), status: 'active', securityDeposit: 5000, depositStatus: 'paid', outstandingBalance: 2500 },
    { name: 'Sneha Pillai', email: 'sneha@email.com', phone: '9876543213', gender: 'Female', dateOfBirth: new Date('2000-05-30'), permanentAddress: { city: 'Kochi', state: 'Kerala', pincode: '682001' }, emergencyContact: { name: 'Uma Pillai', relationship: 'Mother', phone: '9988776622' }, room: rooms[4]._id, checkInDate: new Date('2025-01-20'), status: 'active', securityDeposit: 8000, depositStatus: 'paid', outstandingBalance: 0 },
  ];
  const residents = await Resident.create(residentData);
  console.log(` Created ${residents.length} residents`);

  for (const r of residents) {
    await Room.findByIdAndUpdate(r.room, { currentResident: r._id });
  }

  const adminUser = users[0];
  const maintenanceData = [
    { room: rooms[2]._id, submittedBy: users[3]._id, resident: residents[0]._id, title: 'AC not working', description: 'The AC unit stopped cooling yesterday evening. Room is very hot.', category: 'Electrical', priority: 'high', status: 'in-progress' },
    { room: rooms[5]._id, submittedBy: users[4]._id, title: 'Leaking tap in bathroom', description: 'Bathroom sink tap dripping continuously all day.', category: 'Plumbing', priority: 'medium', status: 'pending' },
    { room: rooms[0]._id, submittedBy: users[3]._id, resident: residents[0]._id, title: 'Broken cupboard handle', description: 'Wardrobe door handle has come off.', category: 'Carpentry', priority: 'low', status: 'completed', completedAt: new Date() },
    { room: rooms[7]._id, submittedBy: users[5]._id, title: 'WiFi not working', description: 'Cannot connect to hostel WiFi for 3 days.', category: 'IT/Network', priority: 'high', status: 'pending' },
  ];
  const maintenance = await Maintenance.create(maintenanceData);
  console.log(` Created ${maintenance.length} maintenance requests`);

  const invoiceData = [
    { resident: residents[0]._id, room: rooms[0]._id, billingPeriod: { from: new Date('2025-03-01'), to: new Date('2025-03-31'), label: 'March 2025' }, lineItems: [{ description: 'Room Rent', type: 'rent', amount: 3500 }, { description: 'Utilities', type: 'utilities', amount: 450 }, { description: 'Mess Charges', type: 'mess', amount: 2800 }], subtotal: 6750, total: 6750, dueDate: new Date('2025-04-05'), paymentHistory: [{ amount: 5550, method: 'upi', paidAt: new Date('2025-04-03') }], generatedBy: adminUser._id },
    { resident: residents[1]._id, room: rooms[1]._id, billingPeriod: { from: new Date('2025-03-01'), to: new Date('2025-03-31'), label: 'March 2025' }, lineItems: [{ description: 'Room Rent', type: 'rent', amount: 5500 }, { description: 'Utilities', type: 'utilities', amount: 520 }, { description: 'Mess Charges', type: 'mess', amount: 2800 }, { description: 'Laundry', type: 'laundry', amount: 200 }], subtotal: 9020, discount: 500, total: 8520, dueDate: new Date('2025-04-05'), paymentHistory: [{ amount: 8520, method: 'razorpay', paidAt: new Date('2025-04-02') }], generatedBy: adminUser._id },
    { resident: residents[2]._id, room: rooms[3]._id, billingPeriod: { from: new Date('2025-03-01'), to: new Date('2025-03-31'), label: 'March 2025' }, lineItems: [{ description: 'Room Rent', type: 'rent', amount: 3500 }, { description: 'Utilities', type: 'utilities', amount: 380 }, { description: 'Mess Charges', type: 'mess', amount: 2800 }], subtotal: 6680, total: 6680, dueDate: new Date('2025-04-05'), paymentHistory: [{ amount: 4180, method: 'cash', paidAt: new Date('2025-04-10') }], generatedBy: adminUser._id },
  ];
  await Invoice.create(invoiceData);
  console.log(` Created ${invoiceData.length} invoices`);

  console.log('\n Seeding complete!\n');
  console.log('');
  console.log('  Login credentials:');
  console.log('  Admin:    admin@hostel.com / Admin@123');
  console.log('  Staff:    ravi@hostel.com  / Staff@123');
  console.log('  Resident: arjun@email.com  / Resident@123');
  console.log('\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
