const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const { buildRoleAssignment } = require('../utils/roleHelpers');

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI in server/.env');
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for seeding...');

    await User.deleteMany({});

    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: '12345',
      fullName: 'System Admin',
      role: 'admin',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [buildRoleAssignment('admin', { isPrimary: true })],
      adminProfile: {
        accessScope: 'Platform administration',
        controlNotes: 'Seeded administrator account'
      }
    });

    await User.create({
      username: 'alex',
      email: 'alex@example.com',
      password: '12345',
      fullName: 'Alex Perera',
      role: 'customer',
      city: 'Colombo',
      phone: '0771234567',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [
        buildRoleAssignment('customer', { isPrimary: true }),
        buildRoleAssignment('driver', { roleStatus: 'active', verificationStatus: 'verified' }),
        buildRoleAssignment('staff', { roleStatus: 'active', verificationStatus: 'verified' })
      ],
      customerProfile: {
        preferences: 'Automatic vehicles, city pickups'
      },
      driverProfile: {
        drivingLicenseNumber: 'B1234567',
        nicId: '901234567V',
        serviceArea: 'Colombo and Gampaha',
        providerDetails: 'Experienced private hire driver'
      },
      staffProfile: {
        storeName: 'Alex Rentals',
        storeOwner: 'Alex Perera',
        businessRegistrationNumber: 'BR-2026-001',
        storeAddress: '12 Main Street, Colombo',
        storeContactNumber: '0112233445',
        storeEmail: 'alex@example.com'
      },
      providerApplications: [
        {
          roleKey: 'driver',
          status: 'approved',
          submittedAt: new Date(),
          reviewedAt: new Date(),
          applicationData: {
            drivingLicenseNumber: 'B1234567',
            nicId: '901234567V',
            serviceArea: 'Colombo and Gampaha'
          }
        },
        {
          roleKey: 'staff',
          status: 'approved',
          submittedAt: new Date(),
          reviewedAt: new Date(),
          applicationData: {
            storeName: 'Alex Rentals',
            businessRegistrationNumber: 'BR-2026-001',
            storeAddress: '12 Main Street, Colombo',
            storeContactNumber: '0112233445',
            storeEmail: 'alex@example.com'
          }
        }
      ]
    });

    await User.create({
      username: 'kasun',
      email: 'kasun@example.com',
      password: '12345',
      fullName: 'Kasun Driver Applicant',
      role: 'customer',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [
        buildRoleAssignment('customer', { isPrimary: true }),
        buildRoleAssignment('driver', { roleStatus: 'pending', verificationStatus: 'pending' })
      ],
      customerProfile: {
        preferences: 'Weekend-only travel'
      },
      driverProfile: {
        drivingLicenseNumber: 'C9876543',
        nicId: '921234567V',
        serviceArea: 'Kandy'
      },
      providerApplications: [
        {
          roleKey: 'driver',
          status: 'pending',
          submittedAt: new Date(),
          applicationData: {
            drivingLicenseNumber: 'C9876543',
            nicId: '921234567V',
            serviceArea: 'Kandy'
          }
        }
      ]
    });

    console.log('Seed complete');
    console.log('Admin: admin@example.com / 12345');
    console.log('Multi-role user: alex@example.com / 12345');
    console.log('Pending driver applicant: kasun@example.com / 12345');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
