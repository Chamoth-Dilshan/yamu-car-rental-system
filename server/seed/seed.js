const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../models/User')
const Vehicle = require('../models/Vehicle')
const DriverAd = require('../models/DriverAd')
const Booking = require('../models/Booking')
const { buildRoleAssignment } = require('../utils/roleHelpers')

const vehicleImages = {
  audi: [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80'
  ],
  wagonR: [
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1200&q=80'
  ],
  kicks: [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80'
  ],
  vezel: [
    'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?auto=format&fit=crop&w=1200&q=80'
  ]
}

const buildSeedNotification = (type, title, message, link, createdAt, isRead = false) => ({
  type,
  title,
  message,
  link,
  isRead,
  readAt: isRead ? new Date(createdAt) : null,
  createdAt: new Date(createdAt)
})

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI in server/.env')
    }

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 })
    console.log('MongoDB Connected for seeding...')

    await Booking.deleteMany({})
    await DriverAd.deleteMany({})
    await Vehicle.deleteMany({})
    await User.deleteMany({})

    const admin = await User.create({
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
      },
      notifications: [
        buildSeedNotification(
          'booking',
          'New vehicle booking',
          'Alex Perera created vehicle booking BOOK350806 for Nissan Kicks.',
          '/admin/bookings',
          '2026-03-20T08:30:00.000Z'
        ),
        buildSeedNotification(
          'role',
          'New provider role application',
          'Kasun Driver Applicant submitted a driver application for review.',
          '/admin/pending-approvals',
          '2026-03-20T09:10:00.000Z',
          true
        )
      ]
    })

    const alex = await User.create({
      username: 'alex',
      email: 'alex@example.com',
      password: '12345',
      fullName: 'Alex Perera',
      role: 'customer',
      city: 'Colombo',
      phone: '0771234567',
      address: '14 Duplication Road, Colombo 03',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [
        buildRoleAssignment('customer', { isPrimary: true }),
        buildRoleAssignment('driver', { roleStatus: 'active', verificationStatus: 'verified' }),
        buildRoleAssignment('staff', { roleStatus: 'active', verificationStatus: 'verified' })
      ],
      customerProfile: {
        preferences: 'Automatic vehicles, city pickups',
        notes: 'Frequent airport trips and short weekend hires'
      },
      driverProfile: {
        drivingLicenseNumber: 'B1234567',
        nicId: '901234567V',
        serviceArea: 'Colombo and Gampaha',
        providerDetails: 'Experienced private hire driver with airport pickup coverage'
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
          submittedAt: new Date('2026-02-10'),
          reviewedAt: new Date('2026-02-12'),
          reviewedBy: admin._id,
          applicationData: {
            drivingLicenseNumber: 'B1234567',
            nicId: '901234567V',
            serviceArea: 'Colombo and Gampaha'
          }
        },
        {
          roleKey: 'staff',
          status: 'approved',
          submittedAt: new Date('2026-02-15'),
          reviewedAt: new Date('2026-02-16'),
          reviewedBy: admin._id,
          applicationData: {
            storeName: 'Alex Rentals',
            businessRegistrationNumber: 'BR-2026-001',
            storeAddress: '12 Main Street, Colombo',
            storeContactNumber: '0112233445',
            storeEmail: 'alex@example.com'
          }
        }
      ],
      notifications: [
        buildSeedNotification(
          'booking',
          'Vehicle booking created',
          'Audi Q8 reservation BOOK80280 was created and is pending review.',
          '/bookings',
          '2026-03-20T10:00:00.000Z'
        ),
        buildSeedNotification(
          'payment',
          'Payment status updated',
          'Booking BOOK86189 payment is now marked as pending.',
          '/bookings',
          '2026-03-19T11:15:00.000Z',
          true
        )
      ]
    })

    await User.create({
      username: 'kasun',
      email: 'kasun@example.com',
      password: '12345',
      fullName: 'Kasun Driver Applicant',
      role: 'customer',
      city: 'Kandy',
      phone: '0712223344',
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
          submittedAt: new Date('2026-03-20'),
          applicationData: {
            drivingLicenseNumber: 'C9876543',
            nicId: '921234567V',
            serviceArea: 'Kandy'
          }
        }
      ],
      notifications: [
        buildSeedNotification(
          'role',
          'Driver application submitted',
          'Your driver application is now pending admin review.',
          '/apply-roles',
          '2026-03-20T09:10:00.000Z'
        )
      ]
    })

    const nadeesha = await User.create({
      username: 'nadeesha',
      email: 'nadeesha@example.com',
      password: '12345',
      fullName: 'Nadeesha Fernando',
      role: 'driver',
      city: 'Colombo',
      phone: '0765566778',
      address: '52 Park Street, Colombo',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [
        buildRoleAssignment('customer'),
        buildRoleAssignment('driver', { roleStatus: 'active', verificationStatus: 'verified', isPrimary: true })
      ],
      customerProfile: {
        preferences: 'Day tours and airport transfers'
      },
      driverProfile: {
        drivingLicenseNumber: 'DL-443322',
        nicId: '891112223V',
        serviceArea: 'Colombo',
        providerDetails: 'Airport pickups, business travel, and private city rides'
      },
      providerApplications: [
        {
          roleKey: 'driver',
          status: 'approved',
          submittedAt: new Date('2026-01-05'),
          reviewedAt: new Date('2026-01-06'),
          reviewedBy: admin._id,
          applicationData: {
            drivingLicenseNumber: 'DL-443322',
            nicId: '891112223V',
            serviceArea: 'Colombo'
          }
        }
      ],
      notifications: [
        buildSeedNotification(
          'booking',
          'New driver booking request',
          'Deshan Samarathunga sent a new trip request (DRV-SAMPLE-1001).',
          '/driver/bookings',
          '2026-04-20T07:45:00.000Z'
        ),
        buildSeedNotification(
          'booking',
          'Booking request updated',
          'You marked booking DRV-SAMPLE-1003 as completed.',
          '/driver/bookings',
          '2026-03-10T18:30:00.000Z',
          true
        )
      ]
    })

    const shan = await User.create({
      username: 'shan',
      email: 'shan@example.com',
      password: '12345',
      fullName: 'Kasun Perera',
      role: 'driver',
      city: 'Kandy',
      phone: '0757788990',
      address: '18 Hill Street, Kandy',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [
        buildRoleAssignment('customer'),
        buildRoleAssignment('driver', { roleStatus: 'active', verificationStatus: 'verified', isPrimary: true })
      ],
      driverProfile: {
        drivingLicenseNumber: 'DL-998877',
        nicId: '900008887V',
        serviceArea: 'Kandy',
        providerDetails: 'Tea estate trips, family tours, and hill-country transfers'
      },
      providerApplications: [
        {
          roleKey: 'driver',
          status: 'approved',
          submittedAt: new Date('2026-01-08'),
          reviewedAt: new Date('2026-01-09'),
          reviewedBy: admin._id,
          applicationData: {
            drivingLicenseNumber: 'DL-998877',
            nicId: '900008887V',
            serviceArea: 'Kandy'
          }
        }
      ]
    })

    const deshan = await User.create({
      username: 'deshan',
      email: 'deshan@example.com',
      password: '12345',
      fullName: 'Deshan Samarathunga',
      role: 'customer',
      city: 'Negombo',
      phone: '0778899001',
      address: '101 Sea Avenue, Negombo',
      accountStatus: 'active',
      verificationStatus: 'verified',
      roles: [buildRoleAssignment('customer', { isPrimary: true })],
      customerProfile: {
        preferences: 'Private tours and chauffeur support',
        notes: 'Usually books outstation trips with luggage space'
      },
      notifications: [
        buildSeedNotification(
          'booking',
          'Driver request sent',
          'Your request DRV-SAMPLE-1002 was sent to Nadeesha Fernando.',
          '/bookings',
          '2026-04-25T06:10:00.000Z'
        ),
        buildSeedNotification(
          'booking',
          'Driver updated your trip request',
          'Booking DRV-SAMPLE-1003 is now completed.',
          '/bookings',
          '2026-03-10T18:30:00.000Z',
          true
        )
      ]
    })

    const [nissanKicks, wagonR, audiQ8] = await Vehicle.create([
      {
        vehicleCode: 'CAR-1005',
        name: 'Nissan Kicks',
        brand: 'Nissan',
        model: 'Kicks',
        year: 2021,
        category: 'SUV',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        seats: 5,
        location: 'Colombo',
        engineCapacity: '1500cc',
        ownerContact: '0115551005',
        description: 'Comfortable compact SUV for airport transfers, daily travel, and family-friendly city rides.',
        features: ['Air conditioning', 'Reverse camera', 'Bluetooth audio', 'USB charging', 'ABS braking'],
        images: vehicleImages.kicks,
        pricePerDay: 6500,
        status: 'available',
        featured: true
      },
      {
        vehicleCode: 'CAR-1001',
        name: 'Maruti Suzuki Wagon R',
        brand: 'Maruti Suzuki',
        model: 'Wagon R',
        year: 2020,
        category: 'Hatchback',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        seats: 5,
        location: 'Colombo',
        engineCapacity: '1200cc',
        ownerContact: '0115551001',
        description: 'Affordable automatic hatchback that works well for short city hops and practical daily bookings.',
        features: ['Air conditioning', 'Parking sensors', 'Power steering', 'Foldable rear seats', 'Good mileage'],
        images: vehicleImages.wagonR,
        pricePerDay: 4500,
        status: 'available',
        featured: true
      },
      {
        vehicleCode: 'CAR-1003',
        name: 'Audi Q8',
        brand: 'Audi',
        model: 'Q8',
        year: 2023,
        category: 'Luxury SUV',
        fuelType: 'Petrol',
        transmission: 'Automatic',
        seats: 5,
        location: 'Negombo',
        engineCapacity: '3000cc',
        ownerContact: '0115551003',
        description: 'Premium SUV for executive transfers, wedding transport, and polished leisure travel.',
        features: ['Leather seats', 'Premium audio', '360 camera', 'Panoramic roof', 'Cruise control'],
        images: vehicleImages.audi,
        pricePerDay: 6500,
        status: 'available',
        featured: true
      },
      {
        vehicleCode: 'CAR-1010',
        name: 'Honda Vezel',
        brand: 'Honda',
        model: 'Vezel',
        year: 2022,
        category: 'Crossover',
        fuelType: 'Hybrid',
        transmission: 'Automatic',
        seats: 5,
        location: 'Kandy',
        engineCapacity: '1500cc',
        ownerContact: '0115551010',
        description: 'Efficient crossover for outstation travel with generous luggage room and a refined cabin.',
        features: ['Hybrid economy', 'Push start', 'Lane assist', 'Apple CarPlay', 'Traction control'],
        images: vehicleImages.vezel,
        pricePerDay: 7000,
        status: 'available',
        featured: false
      }
    ])

    const [nadeeshaAd, shanAd] = await DriverAd.create([
      {
        driver: nadeesha._id,
        title: 'Reliable Colombo Airport Transfer Driver',
        tagline: 'Airport pickups, business travel, and private city rides',
        serviceLocation: 'Colombo',
        languages: ['English', 'Sinhala', 'Tamil'],
        experienceYears: 8,
        dailyRate: 9000,
        maxGroupSize: 3,
        availability: 'available',
        visibility: 'active',
        preferredContact: 'Phone & Email',
        specialties: ['Airport transfer', 'Business travel', 'Hotel pickup', 'City tours'],
        description: 'Professional Colombo-based driver offering punctual service for airport transfers, private bookings, and business transport.',
        completedTrips: 12,
        ratingAverage: 4.9,
        reviewCount: 8
      },
      {
        driver: shan._id,
        title: 'Friendly Kandy Day Tour Driver',
        tagline: 'Tea estate tours, hill country trips, and family travel',
        serviceLocation: 'Kandy',
        languages: ['English', 'Sinhala'],
        experienceYears: 6,
        dailyRate: 8500,
        maxGroupSize: 4,
        availability: 'available',
        visibility: 'active',
        preferredContact: 'Phone',
        specialties: ['Day tours', 'Tea estate trips', 'Private family travel'],
        description: 'Experienced local driver based in Kandy. Best for day trips, hill country travel, and relaxed family outings.',
        completedTrips: 9,
        ratingAverage: 4.7,
        reviewCount: 5
      }
    ])

    await Booking.create([
      {
        bookingNo: 'BOOK350806',
        bookingType: 'vehicle',
        customer: alex._id,
        vehicle: nissanKicks._id,
        serviceTitle: nissanKicks.name,
        vehicleLabel: nissanKicks.name,
        pickupLocation: 'Bandaranaike International Airport',
        destination: 'Colombo 03',
        notes: 'Need pickup at arrivals gate',
        startDate: new Date('2026-03-20T00:00:00.000Z'),
        endDate: new Date('2026-03-22T00:00:00.000Z'),
        dailyRate: 6500,
        billableDays: 3,
        baseAmount: 19500,
        serviceFee: 0,
        totalAmount: 19500,
        paymentStatus: 'pending',
        bookingStatus: 'pending'
      },
      {
        bookingNo: 'BOOK86189',
        bookingType: 'vehicle',
        customer: alex._id,
        vehicle: wagonR._id,
        serviceTitle: wagonR.name,
        vehicleLabel: wagonR.name,
        pickupLocation: 'Colombo Fort',
        destination: 'Galle',
        notes: 'Weekend round trip',
        startDate: new Date('2026-03-19T00:00:00.000Z'),
        endDate: new Date('2026-03-23T00:00:00.000Z'),
        dailyRate: 4500,
        billableDays: 5,
        baseAmount: 22500,
        serviceFee: 0,
        totalAmount: 22500,
        paymentStatus: 'pending',
        bookingStatus: 'pending'
      },
      {
        bookingNo: 'BOOK80280',
        bookingType: 'vehicle',
        customer: alex._id,
        vehicle: audiQ8._id,
        serviceTitle: audiQ8.name,
        vehicleLabel: audiQ8.name,
        pickupLocation: 'Negombo',
        destination: 'Bentota',
        notes: 'Need infant seat support',
        startDate: new Date('2026-03-20T00:00:00.000Z'),
        endDate: new Date('2026-03-22T00:00:00.000Z'),
        dailyRate: 6500,
        billableDays: 3,
        baseAmount: 19500,
        serviceFee: 0,
        totalAmount: 19500,
        paymentStatus: 'pending',
        bookingStatus: 'pending'
      },
      {
        bookingNo: 'DRV-SAMPLE-1001',
        bookingType: 'driver',
        customer: deshan._id,
        driver: nadeesha._id,
        driverAd: nadeeshaAd._id,
        serviceTitle: nadeeshaAd.title,
        vehicleLabel: nadeeshaAd.title,
        pickupLocation: 'Negombo Beach',
        destination: 'Colombo City Tour',
        notes: 'Family of three with one child seat requirement',
        startDate: new Date('2026-04-20T00:00:00.000Z'),
        endDate: new Date('2026-04-20T00:00:00.000Z'),
        dailyRate: 9000,
        billableDays: 1,
        baseAmount: 9000,
        serviceFee: 0,
        totalAmount: 9000,
        paymentStatus: 'pending',
        bookingStatus: 'pending'
      },
      {
        bookingNo: 'DRV-SAMPLE-1002',
        bookingType: 'driver',
        customer: deshan._id,
        driver: nadeesha._id,
        driverAd: nadeeshaAd._id,
        serviceTitle: nadeeshaAd.title,
        vehicleLabel: nadeeshaAd.title,
        pickupLocation: 'Katunayake',
        destination: 'Kandy',
        notes: 'Airport transfer with luggage support',
        startDate: new Date('2026-04-25T00:00:00.000Z'),
        endDate: new Date('2026-04-26T00:00:00.000Z'),
        dailyRate: 9000,
        billableDays: 2,
        baseAmount: 18000,
        serviceFee: 0,
        totalAmount: 18000,
        paymentStatus: 'paid',
        bookingStatus: 'confirmed'
      },
      {
        bookingNo: 'DRV-SAMPLE-1003',
        bookingType: 'driver',
        customer: deshan._id,
        driver: nadeesha._id,
        driverAd: nadeeshaAd._id,
        serviceTitle: nadeeshaAd.title,
        vehicleLabel: nadeeshaAd.title,
        pickupLocation: 'Colombo 07',
        destination: 'Airport Departure',
        notes: 'Completed business travel pickup',
        startDate: new Date('2026-03-10T00:00:00.000Z'),
        endDate: new Date('2026-03-10T00:00:00.000Z'),
        dailyRate: 9000,
        billableDays: 1,
        baseAmount: 9000,
        serviceFee: 0,
        totalAmount: 9000,
        paymentStatus: 'paid',
        bookingStatus: 'completed'
      },
      {
        bookingNo: 'DRV-SAMPLE-2001',
        bookingType: 'driver',
        customer: alex._id,
        driver: shan._id,
        driverAd: shanAd._id,
        serviceTitle: shanAd.title,
        vehicleLabel: shanAd.title,
        pickupLocation: 'Kandy City',
        destination: 'Nuwara Eliya',
        notes: 'Hill-country scenic route',
        startDate: new Date('2026-03-28T00:00:00.000Z'),
        endDate: new Date('2026-03-29T00:00:00.000Z'),
        dailyRate: 8500,
        billableDays: 2,
        baseAmount: 17000,
        serviceFee: 0,
        totalAmount: 17000,
        paymentStatus: 'pending',
        bookingStatus: 'cancelled'
      }
    ])

    console.log('Seed complete')
    console.log('Admin: admin@example.com / 12345')
    console.log('Customer with vehicle bookings: alex@example.com / 12345')
    console.log('Driver: nadeesha@example.com / 12345')
    console.log('Customer with driver requests: deshan@example.com / 12345')
    console.log('Pending driver applicant: kasun@example.com / 12345')

    process.exit(0)
  } catch (error) {
    console.error('Seed error:', error)
    process.exit(1)
  }
}

seed()
