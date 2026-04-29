const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = require('../config/db')
const User = require('../modules/users/user.model')
const Vehicle = require('../modules/vehicles/vehicle.model')
const DriverAd = require('../modules/drivers/driverAd.model')
const Booking = require('../modules/reservations/booking.model')
const { buildRoleAssignment } = require('../utils/roleHelpers')

const DEFAULT_PASSWORD = '12345'

const FIRST_NAMES = [
  'Ayesha', 'Nadeesha', 'Kasun', 'Sahan', 'Ishara', 'Tharindu', 'Dinithi', 'Ravindu', 'Nuwan', 'Madhavi',
  'Sachini', 'Kavindu', 'Yasas', 'Chathuri', 'Dulanjan', 'Piumi', 'Nimesha', 'Lahiru', 'Shanika', 'Vihanga',
  'Nethmi', 'Roshan', 'Upeksha', 'Malith', 'Imesha', 'Sajini', 'Kanishka', 'Harshani', 'Deshan', 'Supun'
]

const LAST_NAMES = [
  'Perera', 'Fernando', 'Silva', 'Wijesinghe', 'Gunasekara', 'Jayawardena', 'Ratnayake', 'Bandara', 'Samarasinghe', 'Ekanayake',
  'Karunaratne', 'Abeywickrama', 'Weerasinghe', 'Herath', 'Mendis', 'Senanayake', 'Fonseka', 'Navaratne', 'Amarasinghe', 'Kumara',
  'Madushanka', 'Rathnayake', 'Jayasuriya', 'Wijeratne', 'Peiris', 'Dissanayake', 'Kodithuwakku', 'Liyanage', 'Samarathunga', 'Rajapaksha'
]

const CITIES = [
  'Colombo', 'Negombo', 'Kandy', 'Galle', 'Matara', 'Kurunegala', 'Jaffna', 'Batticaloa', 'Anuradhapura', 'Badulla',
  'Kalutara', 'Ratnapura', 'Nuwara Eliya', 'Trincomalee', 'Hambantota'
]

const LANGUAGES = [
  ['English', 'Sinhala'],
  ['Sinhala'],
  ['English', 'Tamil'],
  ['Sinhala', 'Tamil'],
  ['English', 'Sinhala', 'Tamil']
]

const DRIVER_SPECIALTIES = [
  'Airport transfers',
  'Corporate travel',
  'Family tours',
  'Hill-country day trips',
  'Hotel pickup service',
  'Wedding transport',
  'Long-distance transfers',
  'City sightseeing'
]

const STORE_PREFIXES = [
  'Yamu', 'CityLine', 'Urban', 'Island', 'Ceylon', 'Lotus', 'Coastal', 'Pearl', 'Sunrise', 'Royal',
  'Metro', 'Vista', 'Prime', 'BlueWave', 'Crown', 'Harbour', 'Palm', 'Orbit', 'Skyline', 'Grand'
]

const VEHICLE_CATALOG = [
  {
    brand: 'Suzuki',
    model: 'Wagon R',
    category: 'Hatchback',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1200cc',
    basePrice: 5000,
    features: ['Air conditioning', 'Parking sensors', 'Power steering', 'Bluetooth audio', 'Foldable rear seats'],
    description: 'Compact automatic hatchback suited for city travel, short-term reservations, and efficient daily use.',
    theme: { primary: '1f2937', secondary: '0f172a', accent: 'f8fafc' }
  },
  {
    brand: 'Toyota',
    model: 'Aqua',
    category: 'Hybrid Hatchback',
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1500cc',
    basePrice: 5600,
    features: ['Hybrid economy', 'Climate control', 'Reverse camera', 'ABS braking', 'USB charging'],
    description: 'Popular hybrid hatchback with low running costs and a smooth drive for everyday travel.',
    theme: { primary: '0f766e', secondary: '134e4a', accent: 'ecfeff' }
  },
  {
    brand: 'Toyota',
    model: 'Prius',
    category: 'Hybrid Sedan',
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1800cc',
    basePrice: 6900,
    features: ['Cruise control', 'Eco mode', 'Keyless start', 'Rear camera', 'Lane assist'],
    description: 'Comfortable hybrid sedan for airport transfers, business use, and efficient outstation trips.',
    theme: { primary: '1d4ed8', secondary: '1e3a8a', accent: 'eff6ff' }
  },
  {
    brand: 'Toyota',
    model: 'Corolla',
    category: 'Sedan',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1600cc',
    basePrice: 7200,
    features: ['Apple CarPlay', 'Traction control', 'Rear AC vents', 'Cruise control', 'Parking camera'],
    description: 'Well-balanced sedan with a refined cabin and dependable performance for premium everyday reservations.',
    theme: { primary: '7c2d12', secondary: '431407', accent: 'fff7ed' }
  },
  {
    brand: 'Toyota',
    model: 'Allion',
    category: 'Sedan',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1500cc',
    basePrice: 6400,
    features: ['Climate control', 'Push start', 'Leather steering', 'Parking sensors', 'Armrest storage'],
    description: 'Mid-size sedan that works well for family outings, city business travel, and point-to-point bookings.',
    theme: { primary: '334155', secondary: '0f172a', accent: 'f8fafc' }
  },
  {
    brand: 'Honda',
    model: 'Grace',
    category: 'Hybrid Sedan',
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1500cc',
    basePrice: 6600,
    features: ['Hybrid economy', 'Push start', 'Rear camera', 'Traction control', 'Touch display'],
    description: 'Efficient compact sedan for city commutes and long-distance reservations with a comfortable ride.',
    theme: { primary: '4c1d95', secondary: '2e1065', accent: 'f5f3ff' }
  },
  {
    brand: 'Honda',
    model: 'Vezel',
    category: 'SUV',
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1500cc',
    basePrice: 8400,
    features: ['Hybrid economy', 'Lane assist', 'Push start', 'Apple CarPlay', 'Spacious boot'],
    description: 'Versatile crossover built for family travel, weekend trips, and smooth highway driving.',
    theme: { primary: '14532d', secondary: '052e16', accent: 'f0fdf4' }
  },
  {
    brand: 'Nissan',
    model: 'Kicks',
    category: 'SUV',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1500cc',
    basePrice: 8000,
    features: ['Reverse camera', 'Cruise control', 'Bluetooth audio', 'Traction control', 'USB charging'],
    description: 'Comfortable compact SUV for airport pickups, day trips, and family-friendly reservations.',
    theme: { primary: '9a3412', secondary: '431407', accent: 'fff7ed' }
  },
  {
    brand: 'Nissan',
    model: 'X-Trail',
    category: 'SUV',
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2000cc',
    basePrice: 9200,
    features: ['360 camera', 'Panoramic roof', 'Leather seats', 'Alloy wheels', 'Dual-zone AC'],
    description: 'Spacious SUV designed for comfortable multi-day travel and premium outstation bookings.',
    theme: { primary: '991b1b', secondary: '450a0a', accent: 'fef2f2' }
  },
  {
    brand: 'Hyundai',
    model: 'Tucson',
    category: 'SUV',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2000cc',
    basePrice: 9800,
    features: ['Panoramic roof', 'Leather seats', 'Parking camera', 'Premium audio', 'Cruise control'],
    description: 'Refined SUV with generous cabin comfort for executive travel, family trips, and leisure bookings.',
    theme: { primary: '0369a1', secondary: '082f49', accent: 'f0f9ff' }
  },
  {
    brand: 'Kia',
    model: 'Sportage',
    category: 'SUV',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2000cc',
    basePrice: 9600,
    features: ['Leather seats', 'Touchscreen infotainment', 'Rear camera', 'Lane assist', 'Smart key'],
    description: 'Modern SUV option for premium personal trips and reliable intercity travel.',
    theme: { primary: '155e75', secondary: '083344', accent: 'ecfeff' }
  },
  {
    brand: 'Mazda',
    model: 'CX-5',
    category: 'SUV',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2000cc',
    basePrice: 9900,
    features: ['Premium cabin', 'Cruise control', 'Rear camera', 'Bluetooth audio', 'ABS braking'],
    description: 'Stylish crossover for comfort-focused reservations with balanced handling and luggage space.',
    theme: { primary: '7f1d1d', secondary: '450a0a', accent: 'fef2f2' }
  },
  {
    brand: 'MG',
    model: 'ZS EV',
    category: 'Electric SUV',
    fuelType: 'Electric',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: 'Electric',
    basePrice: 9400,
    features: ['EV drivetrain', 'Fast charging support', 'Digital cockpit', 'Rear camera', 'Cruise control'],
    description: 'Electric SUV suited for modern city travel and short-to-medium premium reservations.',
    theme: { primary: '166534', secondary: '14532d', accent: 'f0fdf4' }
  },
  {
    brand: 'Mitsubishi',
    model: 'Montero Sport',
    category: 'SUV',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    seats: 7,
    engineCapacity: '2400cc',
    basePrice: 12500,
    features: ['7 seats', 'Leather seats', 'All-wheel drive', 'Rear camera', 'Cruise control'],
    description: 'Large SUV with extra seating capacity for group travel, airport runs, and family holidays.',
    theme: { primary: '57534e', secondary: '292524', accent: 'fafaf9' }
  },
  {
    brand: 'Toyota',
    model: 'Hilux',
    category: 'Pickup',
    fuelType: 'Diesel',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2400cc',
    basePrice: 11800,
    features: ['4x4 capability', 'High ground clearance', 'Reverse camera', 'Bluetooth audio', 'Dual airbags'],
    description: 'Durable pickup suited for rugged routes, utility needs, and mixed city-outstation use.',
    theme: { primary: '3f3f46', secondary: '18181b', accent: 'fafafa' }
  },
  {
    brand: 'Toyota',
    model: 'KDH',
    category: 'Van',
    fuelType: 'Diesel',
    transmission: 'Manual',
    seats: 10,
    engineCapacity: '2500cc',
    basePrice: 13800,
    features: ['10 seats', 'Dual AC', 'Large luggage area', 'Comfort suspension', 'Sliding door access'],
    description: 'Passenger van for airport groups, business teams, and family tour reservations.',
    theme: { primary: '0f172a', secondary: '1e293b', accent: 'e2e8f0' }
  },
  {
    brand: 'Suzuki',
    model: 'Alto',
    category: 'Hatchback',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seats: 4,
    engineCapacity: '800cc',
    basePrice: 3900,
    features: ['Compact size', 'Fuel efficient', 'Air conditioning', 'Power steering', 'Easy parking'],
    description: 'Budget-friendly compact car for quick city runs and short reservations.',
    theme: { primary: '854d0e', secondary: '713f12', accent: 'fefce8' }
  },
  {
    brand: 'Suzuki',
    model: 'Swift',
    category: 'Hatchback',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '1200cc',
    basePrice: 5900,
    features: ['Sporty handling', 'Touch display', 'Bluetooth audio', 'Air conditioning', 'ABS braking'],
    description: 'Responsive hatchback with practical comfort for city use and short weekend trips.',
    theme: { primary: '9f1239', secondary: '500724', accent: 'fff1f2' }
  },
  {
    brand: 'Mercedes-Benz',
    model: 'C-Class',
    category: 'Luxury Sedan',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2000cc',
    basePrice: 16800,
    features: ['Leather seats', 'Premium audio', 'Ambient lighting', 'Rear camera', 'Cruise control'],
    description: 'Luxury sedan for executive transfers, weddings, and polished premium bookings.',
    theme: { primary: '1c1917', secondary: '0c0a09', accent: 'fafaf9' }
  },
  {
    brand: 'BMW',
    model: '3 Series',
    category: 'Luxury Sedan',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    engineCapacity: '2000cc',
    basePrice: 17200,
    features: ['Leather seats', 'Sport mode', 'Premium audio', 'Parking sensors', 'Dual-zone AC'],
    description: 'Driver-focused luxury sedan for premium reservations with sharp styling and refined comfort.',
    theme: { primary: '172554', secondary: '0f172a', accent: 'eff6ff' }
  }
]

const getPositiveInt = (value, fallback) => {
  const numeric = Number.parseInt(value, 10)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

const buildSeedTargets = () => {
  const requestedUsers = getPositiveInt(process.env.SEED_USER_COUNT, 200)
  const requestedVehicles = getPositiveInt(process.env.SEED_VEHICLE_COUNT, 100)
  const requestedDrivers = getPositiveInt(process.env.SEED_DRIVER_COUNT, 50)
  const staffCount = Math.max(1, Math.ceil(requestedVehicles / 5))
  const minimumUsers = 1 + staffCount + requestedDrivers
  const totalUsers = Math.max(requestedUsers, minimumUsers)
  const availableCustomerSlots = Math.max(0, totalUsers - 1 - staffCount - requestedDrivers)
  const pendingDriverApplicantCount = Math.min(6, availableCustomerSlots)
  const pendingStaffApplicantCount = Math.min(4, Math.max(0, availableCustomerSlots - pendingDriverApplicantCount))
  const pendingAccountCount = Math.min(3, Math.max(0, availableCustomerSlots - pendingDriverApplicantCount - pendingStaffApplicantCount))
  const suspendedAccountCount = Math.min(3, Math.max(0, availableCustomerSlots - pendingDriverApplicantCount - pendingStaffApplicantCount - pendingAccountCount))
  const deactivatedAccountCount = Math.min(3, Math.max(0, availableCustomerSlots - pendingDriverApplicantCount - pendingStaffApplicantCount - pendingAccountCount - suspendedAccountCount))
  const activeCustomerCount = Math.max(
    0,
    availableCustomerSlots
      - pendingDriverApplicantCount
      - pendingStaffApplicantCount
      - pendingAccountCount
      - suspendedAccountCount
      - deactivatedAccountCount
  )

  return {
    totalUsers,
    vehicleCount: requestedVehicles,
    driverCount: requestedDrivers,
    staffCount,
    customerCount: availableCustomerSlots,
    pendingDriverApplicantCount,
    pendingStaffApplicantCount,
    pendingAccountCount,
    suspendedAccountCount,
    deactivatedAccountCount,
    activeCustomerCount
  }
}

const pad = (value, size = 2) => String(value).padStart(size, '0')

const pick = (items, index, offset = 0) => items[(index + offset) % items.length]

const buildFullName = (index, offset = 0) => {
  const firstName = FIRST_NAMES[(index + offset) % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(Math.floor((index + offset) / FIRST_NAMES.length) + offset) % LAST_NAMES.length]
  return `${firstName} ${lastName}`
}

const buildPhoneNumber = (index, prefix = '7') => `0${prefix}${pad(10000000 + index, 8)}`

const buildAddress = (index, city) => `${12 + (index % 120)} ${pick(['Lake Road', 'Temple Road', 'Station Road', 'Main Street', 'Park Avenue', 'Galle Road'], index)}, ${city}`

const buildEmergencyContact = (index) => ({
  name: buildFullName(index + 11, 5),
  phone: buildPhoneNumber(index + 211, '7'),
  relationship: pick(['Parent', 'Sibling', 'Spouse', 'Friend', 'Guardian'], index, 2)
})

const buildAvatarUrl = (name, background = '0f172a', color = 'f8fafc') => (
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=${color}&bold=true&size=256`
)

const buildVehicleImageLinks = (name, theme) => ([
  `https://placehold.co/1200x800/${theme.primary}/${theme.accent}?text=${encodeURIComponent(`${name} | Front View`)}`,
  `https://placehold.co/1200x800/${theme.secondary}/${theme.accent}?text=${encodeURIComponent(`${name} | Side Profile`)}`,
  `https://placehold.co/1200x800/${theme.primary}/${theme.accent}?text=${encodeURIComponent(`${name} | Interior`)}`,
])

const buildDocumentMetadata = (reference, uploadedAt, reviewedAt) => ({
  reference,
  status: 'verified',
  uploadedAt,
  reviewedAt
})

const buildSubmittedDocumentMetadata = (reference, fileLabel, uploadedAt) => ({
  fileName: `${fileLabel}.pdf`,
  filePath: `/uploads/seed/${fileLabel}.pdf`,
  reference,
  status: 'submitted',
  uploadedAt
})

const createApprovedApplication = (roleKey, reviewedBy, submittedAt, reviewedAt, applicationData) => ({
  roleKey,
  status: 'approved',
  submittedAt,
  reviewedAt,
  reviewedBy,
  applicationData
})

const createPendingApplication = (roleKey, submittedAt, applicationData) => ({
  roleKey,
  status: 'pending',
  submittedAt,
  reviewedAt: null,
  reviewedBy: null,
  rejectionReason: '',
  applicationData
})

const buildSeedNotification = (type, title, message, link, createdAt, isRead = false) => ({
  type,
  title,
  message,
  link,
  isRead,
  readAt: isRead ? createdAt : null,
  createdAt
})

const createAdminUser = () => ({
  username: 'admin',
  email: 'admin@example.com',
  password: DEFAULT_PASSWORD,
  fullName: 'System Admin',
  role: 'admin',
  preferredLanguage: 'English',
  accountStatus: 'active',
  isSystemAdmin: true,
  verificationStatus: 'verified',
  profilePic: buildAvatarUrl('System Admin', '111827', 'f59e0b'),
  emergencyContact: {
    name: 'Platform Duty Manager',
    phone: '0110000000',
    relationship: 'Internal escalation'
  },
  roles: [buildRoleAssignment('admin', { isPrimary: true })],
  adminProfile: {
    accessScope: 'Platform administration',
    controlNotes: 'Bulk seeded administrator account'
  },
  notifications: [
    buildSeedNotification(
      'system',
      'Bulk seed completed',
      'Demo users, vehicles, and drivers were generated successfully.',
      '/admin/users',
      new Date('2026-04-05T06:30:00.000Z')
    )
  ]
})

const createStaffUser = (index, adminId) => {
  const sequence = index + 1
  const city = pick(CITIES, index, 1)
  const fullName = buildFullName(index, 4)
  const storeName = `${pick(STORE_PREFIXES, index)} ${pick(['Car Rentals', 'Mobility', 'Vehicle Hub', 'Drive Point', 'Auto Rent'], index, 3)}`
  const email = `staff${pad(sequence, 2)}@example.com`
  const submittedAt = new Date(Date.UTC(2026, 0, (sequence % 24) + 1))
  const reviewedAt = new Date(Date.UTC(2026, 0, (sequence % 24) + 2))

  return {
    username: `staff${pad(sequence, 2)}`,
    email,
    password: DEFAULT_PASSWORD,
    fullName,
    role: 'staff',
    city,
    address: buildAddress(index + 40, city),
    phone: buildPhoneNumber(sequence + 100, '1'),
    preferredLanguage: pick(['English', 'Sinhala', 'Tamil'], index),
    emergencyContact: buildEmergencyContact(index + 70),
    accountStatus: 'active',
    verificationStatus: 'verified',
    profilePic: buildAvatarUrl(fullName, '1d4ed8', 'eff6ff'),
    roles: [
      buildRoleAssignment('customer'),
      buildRoleAssignment('staff', { roleStatus: 'active', verificationStatus: 'verified', isPrimary: true })
    ],
    staffProfile: {
      storeName,
      storeOwner: fullName,
      businessRegistrationNumber: `BR-2026-${pad(sequence, 4)}`,
      storeAddress: `${storeName}, ${buildAddress(index + 140, city)}`,
      storeContactNumber: buildPhoneNumber(sequence + 500, '1'),
      storeEmail: email,
      documents: {
        businessRegistrationDocument: buildDocumentMetadata(`BRDOC-${pad(sequence, 4)}`, submittedAt, reviewedAt),
        proofOfAddressDocument: buildDocumentMetadata(`STFADDR-${pad(sequence, 4)}`, submittedAt, reviewedAt)
      }
    },
    providerApplications: [
      createApprovedApplication(
        'staff',
        adminId,
        submittedAt,
        reviewedAt,
        {
          storeName,
          businessRegistrationNumber: `BR-2026-${pad(sequence, 4)}`,
          storeAddress: `${storeName}, ${buildAddress(index + 140, city)}`,
          storeContactNumber: buildPhoneNumber(sequence + 500, '1'),
          storeEmail: email
        }
      )
    ]
  }
}

const createDriverUser = (index, adminId) => {
  const sequence = index + 1
  const city = pick(CITIES, index, 4)
  const fullName = buildFullName(index + 70, 6)
  const languages = pick(LANGUAGES, index)
  const serviceArea = `${city} and nearby areas`
  const submittedAt = new Date(Date.UTC(2026, 1, (sequence % 24) + 1))
  const reviewedAt = new Date(Date.UTC(2026, 1, (sequence % 24) + 2))
  const licenseNumber = `DL-${pad(2000 + sequence, 5)}`
  const nicId = `${90 + (sequence % 9)}${pad(1000000 + sequence, 7)}V`

  return {
    username: `driver${pad(sequence, 2)}`,
    email: `driver${pad(sequence, 2)}@example.com`,
    password: DEFAULT_PASSWORD,
    fullName,
    role: 'driver',
    city,
    address: buildAddress(index + 90, city),
    phone: buildPhoneNumber(sequence + 700, '7'),
    preferredLanguage: languages[0],
    emergencyContact: buildEmergencyContact(index + 120),
    accountStatus: 'active',
    verificationStatus: 'verified',
    profilePic: buildAvatarUrl(fullName, '166534', 'f0fdf4'),
    roles: [
      buildRoleAssignment('customer'),
      buildRoleAssignment('driver', { roleStatus: 'active', verificationStatus: 'verified', isPrimary: true })
    ],
    driverProfile: {
      drivingLicenseNumber: licenseNumber,
      licenseExpiryDate: new Date(Date.UTC(2028, (sequence % 12), (sequence % 27) + 1)),
      nicId,
      serviceArea,
      providerDetails: `${pick(DRIVER_SPECIALTIES, index)} with reliable local route knowledge and customer-focused service.`,
      documents: {
        nicDocument: buildDocumentMetadata(`NIC-${pad(sequence, 4)}`, submittedAt, reviewedAt),
        drivingLicenseDocument: buildDocumentMetadata(`LIC-${pad(sequence, 4)}`, submittedAt, reviewedAt),
        proofOfAddressDocument: buildDocumentMetadata(`DRVADDR-${pad(sequence, 4)}`, submittedAt, reviewedAt)
      }
    },
    providerApplications: [
      createApprovedApplication(
        'driver',
        adminId,
        submittedAt,
        reviewedAt,
        {
          drivingLicenseNumber: licenseNumber,
          nicId,
          serviceArea
        }
      )
    ]
  }
}

const createCustomerUser = (index) => {
  const sequence = index + 1
  const city = pick(CITIES, index, 8)
  const fullName = buildFullName(index + 140, 3)

  return {
    username: `customer${pad(sequence, 3)}`,
    email: `customer${pad(sequence, 3)}@example.com`,
    password: DEFAULT_PASSWORD,
    fullName,
    role: 'customer',
    city,
    address: buildAddress(index + 170, city),
    phone: buildPhoneNumber(sequence + 1200, '7'),
    preferredLanguage: pick(['English', 'Sinhala', 'Tamil'], index, 1),
    emergencyContact: buildEmergencyContact(index + 190),
    accountStatus: 'active',
    verificationStatus: 'verified',
    profilePic: buildAvatarUrl(fullName, '7c2d12', 'fff7ed'),
    roles: [buildRoleAssignment('customer', { isPrimary: true })]
  }
}

const createPendingDriverApplicantUser = (index) => {
  const sequence = index + 1
  const city = pick(CITIES, index, 10)
  const fullName = buildFullName(index + 220, 7)
  const submittedAt = new Date(Date.UTC(2026, 2, 3 + (sequence % 20)))
  const licenseNumber = `PDL-${pad(4000 + sequence, 5)}`
  const nicId = `${91 + (sequence % 8)}${pad(2000000 + sequence, 7)}V`

  return {
    username: `pendingdriver${pad(sequence, 2)}`,
    email: `pendingdriver${pad(sequence, 2)}@example.com`,
    password: DEFAULT_PASSWORD,
    fullName,
    role: 'customer',
    city,
    address: buildAddress(index + 230, city),
    phone: buildPhoneNumber(sequence + 1600, '7'),
    preferredLanguage: pick(['English', 'Sinhala', 'Tamil'], index),
    emergencyContact: buildEmergencyContact(index + 240),
    accountStatus: 'active',
    verificationStatus: 'verified',
    profilePic: buildAvatarUrl(fullName, '7c3aed', 'f5f3ff'),
    roles: [
      buildRoleAssignment('customer', { isPrimary: true }),
      buildRoleAssignment('driver', { roleStatus: 'pending', verificationStatus: 'pending' })
    ],
    driverProfile: {
      drivingLicenseNumber: licenseNumber,
      licenseExpiryDate: new Date(Date.UTC(2028, sequence % 12, (sequence % 27) + 1)),
      nicId,
      serviceArea: `${city} and nearby areas`,
      providerDetails: `${pick(DRIVER_SPECIALTIES, index)} with recent onboarding submission.`,
      documents: {
        nicDocument: buildSubmittedDocumentMetadata(`PNIC-${pad(sequence, 4)}`, `pending-driver-nic-${pad(sequence, 2)}`, submittedAt),
        drivingLicenseDocument: buildSubmittedDocumentMetadata(`PLIC-${pad(sequence, 4)}`, `pending-driver-license-${pad(sequence, 2)}`, submittedAt),
        proofOfAddressDocument: buildSubmittedDocumentMetadata(`PADDR-${pad(sequence, 4)}`, `pending-driver-address-${pad(sequence, 2)}`, submittedAt)
      }
    },
    providerApplications: [
      createPendingApplication(
        'driver',
        submittedAt,
        {
          drivingLicenseNumber: licenseNumber,
          nicId,
          serviceArea: `${city} and nearby areas`,
          documents: {
            nicDocument: buildSubmittedDocumentMetadata(`PNIC-${pad(sequence, 4)}`, `pending-driver-nic-${pad(sequence, 2)}`, submittedAt),
            drivingLicenseDocument: buildSubmittedDocumentMetadata(`PLIC-${pad(sequence, 4)}`, `pending-driver-license-${pad(sequence, 2)}`, submittedAt),
            proofOfAddressDocument: buildSubmittedDocumentMetadata(`PADDR-${pad(sequence, 4)}`, `pending-driver-address-${pad(sequence, 2)}`, submittedAt)
          }
        }
      )
    ],
    notifications: [
      buildSeedNotification(
        'role',
        'Driver application submitted',
        'Your driver application is waiting for admin review.',
        '/apply-roles',
        submittedAt
      )
    ]
  }
}

const createPendingStaffApplicantUser = (index) => {
  const sequence = index + 1
  const city = pick(CITIES, index, 12)
  const fullName = buildFullName(index + 260, 2)
  const storeName = `${pick(STORE_PREFIXES, index, 5)} ${pick(['Mobility Hub', 'Rentals', 'Auto Point', 'Drive Center'], index, 4)}`
  const submittedAt = new Date(Date.UTC(2026, 2, 8 + (sequence % 18)))
  const email = `pendingstaff${pad(sequence, 2)}@example.com`

  return {
    username: `pendingstaff${pad(sequence, 2)}`,
    email,
    password: DEFAULT_PASSWORD,
    fullName,
    role: 'customer',
    city,
    address: buildAddress(index + 270, city),
    phone: buildPhoneNumber(sequence + 1700, '1'),
    preferredLanguage: pick(['English', 'Sinhala', 'Tamil'], index, 1),
    emergencyContact: buildEmergencyContact(index + 280),
    accountStatus: 'active',
    verificationStatus: 'verified',
    profilePic: buildAvatarUrl(fullName, '0369a1', 'f0f9ff'),
    roles: [
      buildRoleAssignment('customer', { isPrimary: true }),
      buildRoleAssignment('staff', { roleStatus: 'pending', verificationStatus: 'pending' })
    ],
    staffProfile: {
      storeName,
      storeOwner: fullName,
      businessRegistrationNumber: `PBR-2026-${pad(sequence, 4)}`,
      storeAddress: `${storeName}, ${buildAddress(index + 290, city)}`,
      storeContactNumber: buildPhoneNumber(sequence + 1750, '1'),
      storeEmail: email,
      documents: {
        businessRegistrationDocument: buildSubmittedDocumentMetadata(`PBRDOC-${pad(sequence, 4)}`, `pending-staff-br-${pad(sequence, 2)}`, submittedAt),
        proofOfAddressDocument: buildSubmittedDocumentMetadata(`PSADDR-${pad(sequence, 4)}`, `pending-staff-address-${pad(sequence, 2)}`, submittedAt)
      }
    },
    providerApplications: [
      createPendingApplication(
        'staff',
        submittedAt,
        {
          storeName,
          businessRegistrationNumber: `PBR-2026-${pad(sequence, 4)}`,
          storeAddress: `${storeName}, ${buildAddress(index + 290, city)}`,
          storeContactNumber: buildPhoneNumber(sequence + 1750, '1'),
          storeEmail: email,
          documents: {
            businessRegistrationDocument: buildSubmittedDocumentMetadata(`PBRDOC-${pad(sequence, 4)}`, `pending-staff-br-${pad(sequence, 2)}`, submittedAt),
            proofOfAddressDocument: buildSubmittedDocumentMetadata(`PSADDR-${pad(sequence, 4)}`, `pending-staff-address-${pad(sequence, 2)}`, submittedAt)
          }
        }
      )
    ],
    notifications: [
      buildSeedNotification(
        'role',
        'Store application submitted',
        'Your store application is waiting for admin review.',
        '/apply-roles',
        submittedAt
      )
    ]
  }
}

const createRestrictedCustomerUser = (index, accountStatus) => {
  const sequence = index + 1
  const city = pick(CITIES, index, 14)
  const fullName = buildFullName(index + 320, 1)
  const statusLabel = accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1)

  return {
    username: `${accountStatus}user${pad(sequence, 2)}`,
    email: `${accountStatus}user${pad(sequence, 2)}@example.com`,
    password: DEFAULT_PASSWORD,
    fullName,
    role: 'customer',
    city,
    address: buildAddress(index + 330, city),
    phone: buildPhoneNumber(sequence + 1800, '7'),
    preferredLanguage: pick(['English', 'Sinhala', 'Tamil'], index, 2),
    emergencyContact: buildEmergencyContact(index + 340),
    accountStatus,
    verificationStatus: 'verified',
    profilePic: buildAvatarUrl(fullName, '7f1d1d', 'fef2f2'),
    roles: [buildRoleAssignment('customer', { isPrimary: true })],
    notifications: [
      buildSeedNotification(
        'system',
        `${statusLabel} account`,
        `This account is currently marked as ${accountStatus}.`,
        '/overview',
        new Date(Date.UTC(2026, 2, 15 + sequence))
      )
    ]
  }
}

const createVehicleRecord = (index, owner) => {
  const template = VEHICLE_CATALOG[index % VEHICLE_CATALOG.length]
  const iteration = Math.floor(index / VEHICLE_CATALOG.length)
  const year = 2018 + ((index + iteration) % 8)
  const pricePerDay = template.basePrice + (iteration * 300) + ((index % 3) * 150)
  const name = `${template.brand} ${template.model}`
  const status = index % 29 === 0
    ? 'maintenance'
    : index % 17 === 0
      ? 'reserved'
      : index % 41 === 0
        ? 'inactive'
        : 'available'

  return {
    owner: owner._id,
    vehicleCode: `CAR-${pad(1001 + index, 4)}`,
    name,
    brand: template.brand,
    model: template.model,
    year,
    category: template.category,
    fuelType: template.fuelType,
    transmission: template.transmission,
    seats: template.seats,
    location: owner.staffProfile?.storeAddress || owner.city,
    engineCapacity: template.engineCapacity,
    ownerContact: owner.staffProfile?.storeContactNumber || owner.phone || owner.email,
    description: template.description,
    features: template.features,
    images: buildVehicleImageLinks(`${name} ${year}`, template.theme),
    pricePerDay,
    status,
    featured: index < Math.min(12, Math.ceil(VEHICLE_CATALOG.length / 2))
  }
}

const createDriverAdRecord = (index, driver) => {
  const serviceLocation = driver.driverProfile?.serviceArea || driver.city
  const specialty = pick(DRIVER_SPECIALTIES, index)
  const availability = index % 11 === 0 ? 'limited' : index % 19 === 0 ? 'unavailable' : 'available'

  return {
    driver: driver._id,
    title: `${pick(['Reliable', 'Professional', 'Friendly', 'Experienced', 'Trusted'], index)} ${driver.city} Driver`,
    tagline: `${specialty} with local route knowledge and flexible schedules`,
    serviceLocation,
    languages: pick(LANGUAGES, index, 2),
    experienceYears: 3 + (index % 11),
    dailyRate: 7500 + (index * 175),
    maxGroupSize: 2 + (index % 5),
    availability,
    visibility: 'active',
    preferredContact: index % 2 === 0 ? 'Phone & Email' : 'Phone',
    specialties: [
      specialty,
      pick(DRIVER_SPECIALTIES, index, 3),
      pick(['Private tours', 'Hotel transfers', 'Outstation travel', 'Business transport'], index, 1)
    ],
    description: `${driver.fullName} is available for ${specialty.toLowerCase()} and private reservations around ${driver.city}.`,
    photo: driver.profilePic,
    completedTrips: 8 + (index * 3),
    ratingAverage: Number((4.4 + ((index % 6) * 0.1)).toFixed(1)),
    reviewCount: 4 + index
  }
}

const createVehicleBookingRecord = (index, customer, vehicle) => {
  const billableDays = 1 + (index % 4)
  const startDate = new Date(Date.UTC(2026, 2, 5 + index))
  const endDate = new Date(Date.UTC(2026, 2, 5 + index + billableDays - 1))
  const bookingStatus = pick(['pending', 'confirmed', 'completed', 'cancelled'], index)
  const paymentStatus = bookingStatus === 'completed' ? 'paid' : pick(['pending', 'paid'], index, 1)
  const baseAmount = vehicle.pricePerDay * billableDays

  return {
    bookingNo: `VB-${pad(index + 1, 5)}`,
    bookingType: 'vehicle',
    customer: customer._id,
    vehicle: vehicle._id,
    serviceTitle: vehicle.name,
    vehicleLabel: vehicle.name,
    pickupLocation: customer.city,
    destination: pick(CITIES, index, 6),
    notes: pick([
      'Airport pickup required',
      'Need child seat support',
      'Preferred morning handover',
      'Outstation travel with luggage',
      'Flexible return time requested'
    ], index),
    startDate,
    endDate,
    dailyRate: vehicle.pricePerDay,
    billableDays,
    baseAmount,
    serviceFee: 0,
    totalAmount: baseAmount,
    paymentStatus,
    bookingStatus
  }
}

const createDriverBookingRecord = (index, customer, driver, ad) => {
  const billableDays = 1 + (index % 3)
  const startDate = new Date(Date.UTC(2026, 3, 10 + index))
  const endDate = new Date(Date.UTC(2026, 3, 10 + index + billableDays - 1))
  const bookingStatus = pick(['pending', 'confirmed', 'completed', 'cancelled'], index, 2)
  const paymentStatus = bookingStatus === 'completed' ? 'paid' : pick(['pending', 'paid'], index)
  const baseAmount = ad.dailyRate * billableDays

  return {
    bookingNo: `DB-${pad(index + 1, 5)}`,
    bookingType: 'driver',
    customer: customer._id,
    driver: driver._id,
    driverAd: ad._id,
    serviceTitle: ad.title,
    vehicleLabel: ad.title,
    pickupLocation: customer.city,
    destination: pick(CITIES, index, 9),
    notes: pick([
      'Hotel transfer with luggage support',
      'Family day tour request',
      'Corporate airport transfer',
      'Need driver familiar with city traffic',
      'Private custom route booking'
    ], index, 1),
    startDate,
    endDate,
    dailyRate: ad.dailyRate,
    billableDays,
    baseAmount,
    serviceFee: 0,
    totalAmount: baseAmount,
    paymentStatus,
    bookingStatus
  }
}

const seed = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI

  if (!mongoUri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI or MONGO_URI in server/.env')
  }

  const targets = buildSeedTargets()

  try {
    await connectDB()
    console.log('MongoDB Connected for seeding...')
    console.log(`Target counts -> users: ${targets.totalUsers}, staff: ${targets.staffCount}, drivers: ${targets.driverCount}, vehicles: ${targets.vehicleCount}`)

    await Booking.deleteMany({})
    await DriverAd.deleteMany({})
    await Vehicle.deleteMany({})
    await User.deleteMany({})

    const admin = await User.create(createAdminUser())

    const staffUsers = await User.create(
      Array.from({ length: targets.staffCount }, (_, index) => createStaffUser(index, admin._id))
    )

    const driverUsers = await User.create(
      Array.from({ length: targets.driverCount }, (_, index) => createDriverUser(index, admin._id))
    )

    const customerUsers = await User.create([
      ...Array.from({ length: targets.activeCustomerCount }, (_, index) => createCustomerUser(index)),
      ...Array.from({ length: targets.pendingDriverApplicantCount }, (_, index) => createPendingDriverApplicantUser(index)),
      ...Array.from({ length: targets.pendingStaffApplicantCount }, (_, index) => createPendingStaffApplicantUser(index)),
      ...Array.from({ length: targets.pendingAccountCount }, (_, index) => createRestrictedCustomerUser(index, 'pending')),
      ...Array.from({ length: targets.suspendedAccountCount }, (_, index) => createRestrictedCustomerUser(index, 'suspended')),
      ...Array.from({ length: targets.deactivatedAccountCount }, (_, index) => createRestrictedCustomerUser(index, 'deactivated'))
    ])

    const vehicles = await Vehicle.insertMany(
      Array.from({ length: targets.vehicleCount }, (_, index) => createVehicleRecord(index, staffUsers[index % staffUsers.length]))
    )

    const driverAds = await DriverAd.insertMany(
      driverUsers.map((driver, index) => createDriverAdRecord(index, driver))
    )

    const vehicleBookings = Array.from(
      { length: Math.min(18, customerUsers.length, vehicles.length) },
      (_, index) => createVehicleBookingRecord(index, customerUsers[index], vehicles[index])
    )

    const driverBookings = Array.from(
      { length: Math.min(12, customerUsers.length, driverUsers.length, driverAds.length) },
      (_, index) => createDriverBookingRecord(index, customerUsers[index], driverUsers[index], driverAds[index])
    )

    await Booking.insertMany([...vehicleBookings, ...driverBookings])

    console.log('Seed complete')
    console.log(`Users created: ${1 + staffUsers.length + driverUsers.length + customerUsers.length}`)
    console.log(`Vehicles created: ${vehicles.length}`)
    console.log(`Driver ads created: ${driverAds.length}`)
    console.log(`Bookings created: ${vehicleBookings.length + driverBookings.length}`)
    console.log(`Pending approvals: ${targets.pendingDriverApplicantCount + targets.pendingStaffApplicantCount}`)
    console.log(`Restricted accounts: ${targets.pendingAccountCount + targets.suspendedAccountCount + targets.deactivatedAccountCount}`)
    console.log('Demo credentials:')
    console.log(`Admin: admin@example.com / ${DEFAULT_PASSWORD}`)
    console.log(`Staff: staff01@example.com / ${DEFAULT_PASSWORD}`)
    console.log(`Driver: driver01@example.com / ${DEFAULT_PASSWORD}`)
    console.log(`Customer: customer001@example.com / ${DEFAULT_PASSWORD}`)
    if (targets.pendingDriverApplicantCount > 0) {
      console.log(`Pending driver applicant: pendingdriver01@example.com / ${DEFAULT_PASSWORD}`)
    }
    if (targets.pendingStaffApplicantCount > 0) {
      console.log(`Pending staff applicant: pendingstaff01@example.com / ${DEFAULT_PASSWORD}`)
    }
    if (targets.pendingAccountCount > 0) {
      console.log(`Pending account: pendinguser01@example.com / ${DEFAULT_PASSWORD}`)
    }
    if (targets.suspendedAccountCount > 0) {
      console.log(`Suspended account: suspendeduser01@example.com / ${DEFAULT_PASSWORD}`)
    }
    if (targets.deactivatedAccountCount > 0) {
      console.log(`Deactivated account: deactivateduser01@example.com / ${DEFAULT_PASSWORD}`)
    }
  } finally {
    await mongoose.disconnect()
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed error:', error)
    process.exit(1)
  })
