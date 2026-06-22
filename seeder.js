const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Customer = require('./models/Customer');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Medicine.deleteMany({});
    await Customer.deleteMany({});

    // Create admin user
    await User.create({
      name: 'Admin User',
      email: 'admin@pharmacy.com',
      password: 'password123',
      role: 'admin',
      phone: '9876543210',
    });

    // Create pharmacist
    await User.create({
      name: 'Pharmacist User',
      email: 'pharmacist@pharmacy.com',
      password: 'password123',
      role: 'pharmacist',
      phone: '9876543211',
    });

    // Create medicines
    const medicines = await Medicine.insertMany([
      {
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        category: 'Tablet',
        manufacturer: 'Sun Pharma',
        price: 25.50,
        costPrice: 15.00,
        stock: 500,
        expiryDate: new Date('2027-12-31'),
        dosage: '1-2 tablets as needed',
        requiresPrescription: false,
      },
      {
        name: 'Amoxicillin 250mg',
        genericName: 'Amoxicillin',
        category: 'Capsule',
        manufacturer: 'Cipla',
        price: 85.00,
        costPrice: 55.00,
        stock: 200,
        expiryDate: new Date('2028-06-30'),
        dosage: '1 capsule thrice daily',
        requiresPrescription: true,
      },
      {
        name: 'Cetirizine 10mg',
        genericName: 'Cetirizine HCl',
        category: 'Tablet',
        manufacturer: 'Dr. Reddy\'s',
        price: 35.00,
        costPrice: 20.00,
        stock: 350,
        expiryDate: new Date('2028-03-31'),
        dosage: '1 tablet at bedtime',
        requiresPrescription: false,
      },
      {
        name: 'Omeprazole 20mg',
        genericName: 'Omeprazole',
        category: 'Capsule',
        manufacturer: 'Mankind Pharma',
        price: 65.00,
        costPrice: 40.00,
        stock: 180,
        expiryDate: new Date('2027-09-30'),
        dosage: '1 capsule before breakfast',
        requiresPrescription: false,
      },
      {
        name: 'Azithromycin 500mg',
        genericName: 'Azithromycin',
        category: 'Tablet',
        manufacturer: 'Pfizer',
        price: 120.00,
        costPrice: 80.00,
        stock: 150,
        expiryDate: new Date('2028-01-31'),
        dosage: '1 tablet daily for 3 days',
        requiresPrescription: true,
      },
      {
        name: 'Ibuprofen 400mg',
        genericName: 'Ibuprofen',
        category: 'Tablet',
        manufacturer: 'Zydus Cadila',
        price: 30.00,
        costPrice: 18.00,
        stock: 400,
        expiryDate: new Date('2027-11-30'),
        dosage: '1-2 tablets with food',
        requiresPrescription: false,
      },
      {
        name: 'Cough Syrup DM',
        genericName: 'Dextromethorphan',
        category: 'Syrup',
        manufacturer: 'Abbott',
        price: 95.00,
        costPrice: 60.00,
        stock: 8,
        expiryDate: new Date('2027-05-31'),
        dosage: '10ml thrice daily',
        requiresPrescription: false,
      },
      {
        name: 'Insulin Glargine',
        genericName: 'Insulin Glargine',
        category: 'Injection',
        manufacturer: 'Sanofi',
        price: 450.00,
        costPrice: 350.00,
        stock: 4,
        expiryDate: new Date('2026-12-31'),
        dosage: 'As per physician',
        requiresPrescription: true,
      },
    ]);

    // Create sample customers
    await Customer.insertMany([
      {
        name: 'Rahul Sharma',
        phone: '9876543212',
        email: 'rahul@example.com',
        age: 35,
        gender: 'Male',
        address: { street: 'MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      },
      {
        name: 'Priya Patel',
        phone: '9876543213',
        email: 'priya@example.com',
        age: 28,
        gender: 'Female',
        address: { street: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
      },
      {
        name: 'Amit Singh',
        phone: '9876543214',
        email: 'amit@example.com',
        age: 45,
        gender: 'Male',
        address: { street: 'Indira Nagar', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226016' },
      },
    ]);

    console.log('Seed data created successfully!');
    console.log('Admin login: admin@pharmacy.com / password123');
    console.log('Pharmacist login: pharmacist@pharmacy.com / password123');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();