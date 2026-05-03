const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = require('../config/db')
const User = require('../modules/users/user.model')
const Vehicle = require('../modules/vehicles/vehicle.model')
const DriverAd = require('../modules/drivers/driverAd.model')
const Booking = require('../modules/reservations/booking.model')
const Payment = require('../modules/payments/payment.model')
const PaymentMethod = require('../modules/payments/paymentMethod.model')
const UserPaymentCard = require('../modules/payments/userPaymentCard.model')
const Review = require('../modules/reviews/review.model')
const Complaint = require('../modules/reviews/complaint.model')
const Inventory = require('../modules/maintenance/inventory.model')
const Maintenance = require('../modules/maintenance/maintenance.model')
const AuditLog = require('../modules/admin/auditLog.model')
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

const INVENTORY_CATALOG = [
  {
    itemName: 'Engine Oil 5W-30',
    price: 4200,
    description: 'Synthetic oil stock for routine service intervals.'
  },
  {
    itemName: 'Oil Filter',
    price: 1850,
    description: 'Replacement filters for compact and mid-size vehicles.'
  },
  {
    itemName: 'Brake Pads Set',
    price: 14800,
    description: 'Front brake pad kits for scheduled brake service.'
  },
  {
    itemName: 'Air Filter',
    price: 3200,
    description: 'Cabin and engine air filter stock for service work.'
  },
  {
    itemName: 'Wiper Blade Pair',
    price: 2600,
    description: 'All-weather wiper replacements for fleet vehicles.'
  },
  {
    itemName: 'Coolant Bottle',
    price: 2900,
    description: 'Coolant bottles for inspection and repair jobs.'
  },
  {
    itemName: 'Tyre Repair Kit',
    price: 5200,
    description: 'Emergency repair kits and valve replacements.'
  },
  {
    itemName: 'Battery Terminal Set',
    price: 1800,
    description: 'Electrical consumables for battery maintenance.'
  }
]

const MAINTENANCE_NOTES = [
  'Oil and filter replacement completed',
  'Brake inspection and pad replacement',
  'Cabin cleaning and AC filter replacement',
  'Tyre pressure check and alignment',
  'Battery terminals cleaned and tightened',
  'Coolant topped up after inspection',
  'Wiper blades replaced before rain season',
  'Diagnostic scan and road test completed'
]

const REVIEW_FEEDBACK = [
  'Clean vehicle, clear handover, and a smooth booking experience.',
  'The provider was punctual and communication was easy throughout the trip.',
  'Good value for the booking amount and the service matched the listing.',
  'Comfortable ride with helpful support before pickup.',
  'The reservation was handled professionally from confirmation to return.',
  'Driver knew the routes well and kept the trip on schedule.',
  'Vehicle condition was solid and the checkout flow was straightforward.',
  'The service was reliable for a family day trip.'
]

const COMPLAINT_SUBJECTS = [
  'Late handover follow-up',
  'Billing clarification required',
  'Vehicle cleanliness concern',
  'Driver communication issue',
  'Refund status check',
  'Route change dispute'
]

const CARD_BRANDS = [
  { brand: 'Visa', prefix: '4' },
  { brand: 'Mastercard', prefix: '5' },
  { brand: 'Card', prefix: '6' }
]

const VEHICLE_BOOKING_FLOW_STATUSES = [
  'pending',
  'pending',
  'confirmed',
  'confirmed',
  'completed',
  'completed',
  'completed',
  'completed',
  'closed',
  'cancelled'
]

const DRIVER_BOOKING_FLOW_STATUSES = [
  'pending',
  'confirmed',
  'confirmed',
  'completed',
  'completed',
  'completed',
  'closed',
  'cancelled'
]

const PAYMENT_FLOW_OUTCOMES = [
  { method: 'saved_card', status: 'paid' },
  { method: 'bank_transfer', status: 'processing' },
  { method: 'card', status: 'paid' },
  { method: 'cash', status: 'processing' },
  { method: 'admin_manual', status: 'paid' },
  { method: 'saved_card', status: 'refunded' },
  { method: 'card', status: 'failed' },
  { method: 'cash', status: 'cancelled' },
  { method: 'bank_transfer', status: 'paid' },
  { method: 'card', status: 'pending' }
]

const CLOSED_PAYMENT_FLOW_OUTCOMES = [
  { method: 'saved_card', status: 'paid' },
  { method: 'admin_manual', status: 'paid' },
  { method: 'bank_transfer', status: 'paid' },
  { method: 'saved_card', status: 'refunded' }
]

const getPositiveInt = (value, fallback) => {
  const numeric = Number.parseInt(value, 10)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

const buildSeedTargets = () => {
  const requestedUsers = getPositiveInt(process.env.SEED_USER_COUNT, 200)
  const requestedVehicles = getPositiveInt(process.env.SEED_VEHICLE_COUNT, 100)
  const requestedDrivers = getPositiveInt(process.env.SEED_DRIVER_COUNT, 50)
  const requestedVehicleBookings = getPositiveInt(process.env.SEED_VEHICLE_BOOKING_COUNT, 72)
  const requestedDriverBookings = getPositiveInt(process.env.SEED_DRIVER_BOOKING_COUNT, 44)
  const requestedCards = getPositiveInt(process.env.SEED_SAVED_CARD_COUNT, 80)
  const requestedMaintenanceRecords = getPositiveInt(process.env.SEED_MAINTENANCE_RECORD_COUNT, 28)
  const requestedReviews = getPositiveInt(process.env.SEED_REVIEW_COUNT, 40)
  const requestedComplaints = getPositiveInt(process.env.SEED_COMPLAINT_COUNT, 24)
  const inventoryItemsPerStaff = getPositiveInt(process.env.SEED_INVENTORY_ITEMS_PER_STAFF, 6)
  const staffCount = Math.max(1, Math.ceil(requestedVehicles / 5))
  const minimumActiveCustomers = Math.max(1, Math.min(12, Math.ceil((requestedVehicleBookings + requestedDriverBookings) / 4)))
  const minimumUsers = 1 + staffCount + requestedDrivers + minimumActiveCustomers
  const totalUsers = Math.max(requestedUsers, minimumUsers)
  const availableCustomerSlots = Math.max(0, totalUsers - 1 - staffCount - requestedDrivers)
  const reservedActiveCustomerCount = Math.min(availableCustomerSlots, minimumActiveCustomers)
  const nonActiveCustomerSlots = Math.max(0, availableCustomerSlots - reservedActiveCustomerCount)
  const pendingDriverApplicantCount = Math.min(6, nonActiveCustomerSlots)
  const pendingStaffApplicantCount = Math.min(4, Math.max(0, nonActiveCustomerSlots - pendingDriverApplicantCount))
  const pendingAccountCount = Math.min(3, Math.max(0, nonActiveCustomerSlots - pendingDriverApplicantCount - pendingStaffApplicantCount))
  const suspendedAccountCount = Math.min(3, Math.max(0, nonActiveCustomerSlots - pendingDriverApplicantCount - pendingStaffApplicantCount - pendingAccountCount))
  const deactivatedAccountCount = Math.min(3, Math.max(0, nonActiveCustomerSlots - pendingDriverApplicantCount - pendingStaffApplicantCount - pendingAccountCount - suspendedAccountCount))
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
    activeCustomerCount,
    vehicleBookingCount: requestedVehicleBookings,
    driverBookingCount: requestedDriverBookings,
    savedCardCount: requestedCards,
    maintenanceRecordCount: requestedMaintenanceRecords,
    reviewCount: requestedReviews,
    complaintCount: requestedComplaints,
    inventoryItemsPerStaff
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

const buildApprovedDocumentMetadata = (reference, fileLabel, uploadedAt, reviewedAt) => ({
  fileName: `${fileLabel}.pdf`,
  filePath: `/uploads/seed/${fileLabel}.pdf`,
  reference,
  status: 'approved',
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

const buildBookingSnapshot = (booking) => ({
  bookingNo: booking.bookingNo,
  bookingType: booking.bookingType,
  serviceName: booking.serviceTitle || booking.vehicleLabel || '',
  vehicleOrDriverName: booking.vehicleLabel || booking.serviceTitle || '',
  startDate: booking.startDate,
  endDate: booking.endDate
})

const buildCustomerSnapshot = (customer) => ({
  fullName: customer.fullName || '',
  email: customer.email || '',
  phone: customer.phone || ''
})

const buildCardSnapshot = (card) => {
  if (!card) {
    return {
      cardholderName: 'Seed Customer',
      brand: 'Visa',
      last4: '4242',
      maskedNumber: '**** **** **** 4242',
      expiryMonth: '12',
      expiryYear: '2029',
      token: ''
    }
  }

  return {
    cardholderName: card.cardholderName,
    brand: card.brand,
    last4: card.last4,
    maskedNumber: card.maskedNumber,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    token: card.token
  }
}

const createAuditSnapshot = (user) => ({
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  phone: user.phone || '',
  address: user.address || '',
  city: user.city || '',
  accountStatus: user.accountStatus,
  activeRole: user.role,
  primaryRole: user.roles?.find((role) => role.isPrimary)?.roleKey || user.role,
  roles: (user.roles || []).map((role) => ({
    roleKey: role.roleKey,
    roleStatus: role.roleStatus,
    verificationStatus: role.verificationStatus,
    isPrimary: Boolean(role.isPrimary)
  })),
  providerApplications: (user.providerApplications || []).map((application) => ({
    roleKey: application.roleKey,
    status: application.status,
    submittedAt: application.submittedAt || null,
    reviewedAt: application.reviewedAt || null,
    rejectionReason: application.rejectionReason || '',
    applicationData: application.applicationData || {}
  }))
})

const groupByStringId = (items, getKey) => items.reduce((groups, item) => {
  const key = String(getKey(item) || '')

  if (!key) {
    return groups
  }

  if (!groups.has(key)) {
    groups.set(key, [])
  }

  groups.get(key).push(item)
  return groups
}, new Map())

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
        businessRegistrationDocument: buildApprovedDocumentMetadata(`BRDOC-${pad(sequence, 4)}`, `staff-br-${pad(sequence, 2)}`, submittedAt, reviewedAt),
        proofOfAddressDocument: buildApprovedDocumentMetadata(`STFADDR-${pad(sequence, 4)}`, `staff-address-${pad(sequence, 2)}`, submittedAt, reviewedAt)
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
  const licenseNumber = pad(2000000000 + sequence, 10)
  const licenseExpiryDate = new Date(Date.UTC(2028, (sequence % 12), (sequence % 27) + 1))
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
      licenseExpiryDate,
      nicId,
      serviceArea,
      providerDetails: `${pick(DRIVER_SPECIALTIES, index)} with reliable local route knowledge and customer-focused service.`,
      documents: {
        nicDocument: buildApprovedDocumentMetadata(`NIC-${pad(sequence, 4)}`, `driver-nic-${pad(sequence, 2)}`, submittedAt, reviewedAt),
        drivingLicenseDocument: buildApprovedDocumentMetadata(`LIC-${pad(sequence, 4)}`, `driver-license-${pad(sequence, 2)}`, submittedAt, reviewedAt),
        proofOfAddressDocument: buildApprovedDocumentMetadata(`DRVADDR-${pad(sequence, 4)}`, `driver-address-${pad(sequence, 2)}`, submittedAt, reviewedAt)
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
          licenseExpiryDate,
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
  const licenseNumber = pad(2000100000 + sequence, 10)
  const licenseExpiryDate = new Date(Date.UTC(2028, sequence % 12, (sequence % 27) + 1))
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
      licenseExpiryDate,
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
          licenseExpiryDate,
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
    ratingAverage: 0,
    reviewCount: 0
  }
}

const createInventoryRecord = (index, owner) => {
  const template = INVENTORY_CATALOG[index % INVENTORY_CATALOG.length]
  const quantity = index % 7 === 0 ? 4 + (index % 4) : 14 + ((index * 3) % 36)

  return {
    owner: owner._id,
    itemName: template.itemName,
    quantity,
    price: template.price + ((index % 3) * 250),
    description: template.description
  }
}

const createMaintenanceRecord = (index, vehicle, inventoryItem) => {
  const status = vehicle.status === 'maintenance'
    ? pick(['scheduled', 'in_progress'], index)
    : pick(['scheduled', 'in_progress', 'completed', 'cancelled'], index, 1)
  const count = status === 'cancelled' ? 0 : 1 + (index % 3)
  const inventoryConsumed = Boolean(inventoryItem && count > 0 && status !== 'cancelled')
  const previousVehicleStatus = vehicle.status === 'maintenance' ? 'available' : vehicle.status

  return {
    owner: vehicle.owner,
    vehicle: vehicle._id,
    vehicleName: `${vehicle.name} (${vehicle.vehicleCode})`,
    type: pick(['Routine Service', 'Repair', 'Inspection', 'Other'], index),
    count,
    addedThings: pick(MAINTENANCE_NOTES, index),
    inventoryItem: inventoryItem?._id || null,
    inventoryItemName: inventoryItem?.itemName || '',
    inventoryConsumed,
    status,
    totalCost: (inventoryItem ? inventoryItem.price * count : 0) + 3500 + (index * 425),
    previousVehicleStatus
  }
}

const createPaymentCardRecord = (index, customer, isDefault = false) => {
  const cardBrand = pick(CARD_BRANDS, index)
  const last4 = pad(4200 + index, 4).slice(-4)
  const status = index % 13 === 0 && !isDefault ? 'expired' : 'active'
  const expiryYear = status === 'expired' ? '2024' : String(2028 + (index % 4))
  const expiryMonth = pad(1 + (index % 12))

  return {
    customer: customer._id,
    type: 'card',
    cardholderName: customer.fullName,
    brand: cardBrand.brand,
    last4,
    maskedNumber: `**** **** **** ${last4}`,
    expiryMonth,
    expiryYear,
    token: `card_tok_seed_${pad(index + 1, 5)}`,
    isDefault,
    status
  }
}

const createPaymentRecord = (index, booking, customer, card, admin) => {
  const outcome = pick(
    booking.bookingStatus === 'closed' ? CLOSED_PAYMENT_FLOW_OUTCOMES : PAYMENT_FLOW_OUTCOMES,
    index
  )
  const method = outcome.method === 'saved_card' && !card ? 'card' : outcome.method
  const paidLike = ['paid', 'refunded'].includes(outcome.status)
  const paymentDate = new Date(new Date(booking.endDate).getTime() + (1000 * 60 * 60 * (8 + (index % 36))))
  const bankTransferReference = `BANK-${pad(index + 1, 5)}`
  const payment = {
    paymentNo: `PAY-SEED-${pad(index + 1, 5)}`,
    booking: booking._id,
    customer: customer._id,
    amount: booking.totalAmount,
    currency: 'LKR',
    method,
    status: outcome.status,
    paymentMethod: method === 'saved_card' ? card?._id || null : null,
    transactionId: paidLike ? `TXN-SEED-${pad(index + 1, 6)}` : '',
    bookingSnapshot: buildBookingSnapshot(booking),
    customerSnapshot: buildCustomerSnapshot(customer),
    verifiedBy: ['cash', 'bank_transfer', 'admin_manual'].includes(method) && paidLike ? admin._id : null,
    verifiedAt: paidLike ? paymentDate : null,
    adminNote: outcome.status === 'processing'
      ? 'Seeded payment waiting for admin verification.'
      : outcome.status === 'failed'
        ? 'Seeded failed payment for dashboard testing.'
        : outcome.status === 'cancelled'
          ? 'Seeded cancelled payment attempt.'
          : outcome.status === 'refunded'
            ? 'Seeded refund completed by admin.'
            : '',
    failureReason: outcome.status === 'failed' ? 'Card authorization was declined by the test processor.' : '',
    refund: outcome.status === 'refunded'
      ? {
          amount: booking.totalAmount,
          reason: 'Customer cancellation after payment in seeded data.',
          refundedBy: admin._id,
          refundedAt: new Date(paymentDate.getTime() + (1000 * 60 * 60 * 24))
        }
      : undefined
  }

  if (['card', 'saved_card'].includes(method)) {
    payment.cardSnapshot = buildCardSnapshot(card)
  }

  if (method === 'bank_transfer') {
    payment.bankTransfer = {
      accountName: customer.fullName,
      bankName: pick(['Bank of Ceylon', 'Commercial Bank', 'Sampath Bank', 'HNB'], index),
      referenceNo: bankTransferReference,
      depositedAt: paymentDate,
      note: outcome.status === 'processing'
        ? 'Seeded transfer awaiting verification.'
        : 'Seeded transfer verified by admin.',
      proofFile: {
        fileName: `bank-transfer-${pad(index + 1, 5)}.pdf`,
        filePath: `/uploads/seed/bank-transfer-${pad(index + 1, 5)}.pdf`,
        reference: bankTransferReference,
        mimeType: 'application/pdf',
        size: 120000 + (index * 137),
        uploadedAt: paymentDate
      }
    }
  }

  if (method === 'cash' || method === 'admin_manual') {
    payment.cash = {
      payerName: customer.fullName,
      collectedBy: paidLike || method === 'admin_manual' ? admin.fullName : '',
      note: method === 'cash'
        ? 'Seeded cash payment awaiting collection check.'
        : 'Seeded admin manual payment.'
    }
  }

  return {
    payment,
    bookingPaymentStatus: outcome.status === 'refunded'
      ? 'refunded'
      : outcome.status === 'paid'
        ? 'paid'
        : 'pending'
  }
}

const createReviewRecord = (index, booking, customer, admin) => {
  const status = pick(['approved', 'approved', 'approved', 'pending', 'rejected'], index)
  const reviewedAt = status === 'pending' ? null : new Date(Date.UTC(2026, 4, 5 + (index % 18), 7, 30))
  const baseRating = 5 - (index % 3)

  return {
    booking: booking._id,
    bookingNo: booking.bookingNo,
    bookingType: booking.bookingType,
    customer: customer._id,
    driver: booking.driver || null,
    vehicle: booking.vehicle || null,
    driverAd: booking.driverAd || null,
    passengerName: customer.fullName,
    driverName: booking.bookingType === 'driver' ? booking.serviceTitle : '',
    vehicleName: booking.bookingType === 'vehicle' ? booking.vehicleLabel : '',
    vehicleRating: booking.bookingType === 'vehicle' ? baseRating : null,
    driverRating: booking.bookingType === 'driver' ? baseRating : null,
    feedback: pick(REVIEW_FEEDBACK, index),
    status,
    reviewedBy: status === 'pending' ? null : admin._id,
    reviewedAt,
    rejectionReason: status === 'rejected' ? 'Seeded rejected review used for moderation workflow testing.' : ''
  }
}

const createComplaintRecord = (index, booking, customer, admin) => {
  const status = pick(['pending', 'under_review', 'solved'], index)
  const createdAt = new Date(Date.UTC(2026, 4, 1 + (index % 22), 9, 0))
  const statusHistory = [{
    status: 'pending',
    message: 'Complaint submitted by customer',
    updatedBy: customer._id,
    updatedAt: createdAt
  }]

  if (status !== 'pending') {
    statusHistory.push({
      status: 'under_review',
      message: 'Support team is reviewing the booking details.',
      updatedBy: admin._id,
      updatedAt: new Date(createdAt.getTime() + (1000 * 60 * 60 * 6))
    })
  }

  if (status === 'solved') {
    statusHistory.push({
      status: 'solved',
      message: 'Issue resolved in seeded support workflow.',
      updatedBy: admin._id,
      updatedAt: new Date(createdAt.getTime() + (1000 * 60 * 60 * 24))
    })
  }

  return {
    customer: customer._id,
    booking: booking._id,
    bookingNo: booking.bookingNo,
    subject: pick(COMPLAINT_SUBJECTS, index),
    category: pick(['vehicle', 'billing', 'service', 'other'], index),
    priority: pick(['low', 'medium', 'high'], index, 1),
    description: `Seeded complaint for ${booking.bookingNo}. This record keeps the dispute dashboard populated for testing.`,
    attachment: index % 5 === 0 ? `/uploads/seed/complaint-${pad(index + 1, 2)}.pdf` : '',
    status,
    latestAdminMessage: status === 'pending' ? '' : statusHistory[statusHistory.length - 1].message,
    lastStatusUpdatedBy: status === 'pending' ? null : admin._id,
    lastStatusUpdatedAt: status === 'pending' ? null : statusHistory[statusHistory.length - 1].updatedAt,
    statusHistory
  }
}

const createVehicleBookingRecord = (index, customer, vehicle) => {
  const billableDays = 1 + (index % 4)
  const startDate = new Date(Date.UTC(2026, 2, 5 + index))
  const endDate = new Date(Date.UTC(2026, 2, 5 + index + billableDays - 1))
  const bookingStatus = pick(VEHICLE_BOOKING_FLOW_STATUSES, index)
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
    paymentStatus: 'pending',
    bookingStatus,
    adminNote: bookingStatus === 'cancelled'
      ? 'Seeded cancellation for admin workflow testing.'
      : bookingStatus === 'closed'
        ? 'Seeded closed booking after payment workflow.'
        : '',
    driverResponseNote: ''
  }
}

const createDriverBookingRecord = (index, customer, driver, ad) => {
  const billableDays = 1 + (index % 3)
  const startDate = new Date(Date.UTC(2026, 3, 10 + index))
  const endDate = new Date(Date.UTC(2026, 3, 10 + index + billableDays - 1))
  const bookingStatus = pick(DRIVER_BOOKING_FLOW_STATUSES, index, 2)
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
    paymentStatus: 'pending',
    bookingStatus,
    adminNote: '',
    driverResponseNote: bookingStatus === 'cancelled'
      ? 'Schedule conflict in seeded driver workflow.'
      : bookingStatus === 'confirmed'
        ? 'Driver confirmed this seeded request.'
        : bookingStatus === 'completed'
          ? 'Driver completed this seeded trip.'
          : ''
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

    await Payment.deleteMany({})
    await PaymentMethod.deleteMany({})
    await UserPaymentCard.deleteMany({})
    await Review.deleteMany({})
    await Complaint.deleteMany({})
    await Maintenance.deleteMany({})
    await Inventory.deleteMany({})
    await AuditLog.deleteMany({})
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

    const activeCustomerPayloads = Array.from({ length: targets.activeCustomerCount }, (_, index) => createCustomerUser(index))
    const pendingDriverPayloads = Array.from({ length: targets.pendingDriverApplicantCount }, (_, index) => createPendingDriverApplicantUser(index))
    const pendingStaffPayloads = Array.from({ length: targets.pendingStaffApplicantCount }, (_, index) => createPendingStaffApplicantUser(index))
    const restrictedCustomerPayloads = [
      ...Array.from({ length: targets.pendingAccountCount }, (_, index) => createRestrictedCustomerUser(index, 'pending')),
      ...Array.from({ length: targets.suspendedAccountCount }, (_, index) => createRestrictedCustomerUser(index, 'suspended')),
      ...Array.from({ length: targets.deactivatedAccountCount }, (_, index) => createRestrictedCustomerUser(index, 'deactivated'))
    ]

    const customerUsers = await User.create([
      ...activeCustomerPayloads,
      ...pendingDriverPayloads,
      ...pendingStaffPayloads,
      ...restrictedCustomerPayloads
    ])
    const activeCustomerUsers = customerUsers.slice(0, activeCustomerPayloads.length)

    const vehicles = await Vehicle.insertMany(
      Array.from({ length: targets.vehicleCount }, (_, index) => createVehicleRecord(index, staffUsers[index % staffUsers.length]))
    )

    const driverAds = await DriverAd.insertMany(
      driverUsers.map((driver, index) => createDriverAdRecord(index, driver))
    )

    const inventoryItems = await Inventory.insertMany(
      staffUsers.flatMap((staffUser, staffIndex) => (
        Array.from(
          { length: targets.inventoryItemsPerStaff },
          (_, itemIndex) => createInventoryRecord((staffIndex * targets.inventoryItemsPerStaff) + itemIndex, staffUser)
        )
      ))
    )
    const inventoryByOwner = groupByStringId(inventoryItems, (item) => item.owner)

    const paymentCards = activeCustomerUsers.length
      ? await UserPaymentCard.insertMany(
          Array.from(
            { length: Math.min(targets.savedCardCount, activeCustomerUsers.length * 2) },
            (_, index) => {
              const customer = activeCustomerUsers[index % activeCustomerUsers.length]
              const isDefault = index < activeCustomerUsers.length
              return createPaymentCardRecord(index, customer, isDefault)
            }
          )
        )
      : []
    const cardsByCustomer = groupByStringId(paymentCards, (card) => card.customer)

    const vehicleBookings = Array.from(
      { length: activeCustomerUsers.length && vehicles.length ? targets.vehicleBookingCount : 0 },
      (_, index) => createVehicleBookingRecord(index, activeCustomerUsers[index % activeCustomerUsers.length], vehicles[index % vehicles.length])
    )

    const driverBookings = Array.from(
      { length: activeCustomerUsers.length && driverUsers.length && driverAds.length ? targets.driverBookingCount : 0 },
      (_, index) => createDriverBookingRecord(
        index,
        activeCustomerUsers[(index + 3) % activeCustomerUsers.length],
        driverUsers[index % driverUsers.length],
        driverAds[index % driverAds.length]
      )
    )

    const bookings = await Booking.insertMany([...vehicleBookings, ...driverBookings])
    const eligiblePaymentBookings = bookings.filter((booking, index) => (
      ['completed', 'closed'].includes(booking.bookingStatus) && index % 7 !== 0
    ))
    const paymentPlans = eligiblePaymentBookings.map((booking, index) => {
      const customer = activeCustomerUsers.find((user) => String(user._id) === String(booking.customer))
      const customerCards = cardsByCustomer.get(String(booking.customer)) || []
      const defaultCard = customerCards.find((card) => card.isDefault && card.status === 'active')
        || customerCards.find((card) => card.status === 'active')

      return createPaymentRecord(index, booking, customer, defaultCard, admin)
    })
    const payments = paymentPlans.length
      ? await Payment.insertMany(paymentPlans.map((plan) => plan.payment))
      : []

    if (paymentPlans.length) {
      await Promise.all(paymentPlans.map((plan) => (
        Booking.updateOne(
          { _id: plan.payment.booking },
          { $set: { paymentStatus: plan.bookingPaymentStatus } }
        )
      )))
    }

    const paidReviewableBookings = await Booking.find({
      _id: { $in: paymentPlans
        .filter((plan) => plan.bookingPaymentStatus === 'paid')
        .map((plan) => plan.payment.booking) }
    })
    const paidReviewableById = new Map(paidReviewableBookings.map((booking) => [String(booking._id), booking]))
    const reviewSourceBookings = paymentPlans
      .filter((plan) => plan.bookingPaymentStatus === 'paid')
      .map((plan) => paidReviewableById.get(String(plan.payment.booking)))
      .filter(Boolean)
      .slice(0, targets.reviewCount)
    const reviews = reviewSourceBookings.length
      ? await Review.insertMany(reviewSourceBookings.map((booking, index) => {
          const customer = activeCustomerUsers.find((user) => String(user._id) === String(booking.customer))
          return createReviewRecord(index, booking, customer, admin)
        }))
      : []

    const approvedReviews = reviews.filter((review) => review.status === 'approved')
    const vehicleReviewGroups = groupByStringId(
      approvedReviews.filter((review) => review.vehicle && review.vehicleRating),
      (review) => review.vehicle
    )
    const driverAdReviewGroups = groupByStringId(
      approvedReviews.filter((review) => review.driverAd && review.driverRating),
      (review) => review.driverAd
    )

    await Promise.all([
      ...[...vehicleReviewGroups.entries()].map(([vehicleId, vehicleReviews]) => (
        Vehicle.updateOne(
          { _id: vehicleId },
          {
            $set: {
              ratingAverage: Number((vehicleReviews.reduce((total, review) => total + Number(review.vehicleRating || 0), 0) / vehicleReviews.length).toFixed(1)),
              reviewCount: vehicleReviews.length
            }
          }
        )
      )),
      ...[...driverAdReviewGroups.entries()].map(([driverAdId, adReviews]) => (
        DriverAd.updateOne(
          { _id: driverAdId },
          {
            $set: {
              ratingAverage: Number((adReviews.reduce((total, review) => total + Number(review.driverRating || 0), 0) / adReviews.length).toFixed(1)),
              reviewCount: adReviews.length
            }
          }
        )
      ))
    ])

    const complaintSourceBookings = bookings.slice(0, targets.complaintCount)
    const complaints = complaintSourceBookings.length
      ? await Complaint.insertMany(complaintSourceBookings.map((booking, index) => {
          const customer = activeCustomerUsers.find((user) => String(user._id) === String(booking.customer))
          return createComplaintRecord(index, booking, customer, admin)
        }))
      : []

    const maintenanceCandidateVehicles = [
      ...vehicles.filter((vehicle) => vehicle.status === 'maintenance'),
      ...vehicles.filter((vehicle) => vehicle.status !== 'maintenance')
    ]
    const maintenanceSourceVehicles = maintenanceCandidateVehicles.slice(0, Math.min(targets.maintenanceRecordCount, vehicles.length))
    const maintenanceRecords = maintenanceSourceVehicles.map((vehicle, index) => {
      const ownerInventoryItems = inventoryByOwner.get(String(vehicle.owner)) || []
      const inventoryItem = ownerInventoryItems[index % Math.max(ownerInventoryItems.length, 1)] || null
      return createMaintenanceRecord(index, vehicle, inventoryItem)
    })
    const maintenance = maintenanceRecords.length
      ? await Maintenance.insertMany(maintenanceRecords)
      : []
    const activeMaintenanceVehicleIds = maintenance
      .filter((record) => Maintenance.ACTIVE_MAINTENANCE_STATUSES.includes(record.status))
      .map((record) => record.vehicle)

    if (activeMaintenanceVehicleIds.length) {
      await Vehicle.updateMany(
        { _id: { $in: activeMaintenanceVehicleIds } },
        { $set: { status: 'maintenance' } }
      )
    }

    const consumedInventoryById = maintenance.reduce((consumed, record) => {
      if (record.inventoryConsumed && record.inventoryItem && record.count > 0) {
        const key = String(record.inventoryItem)
        consumed.set(key, (consumed.get(key) || 0) + Number(record.count || 0))
      }

      return consumed
    }, new Map())

    if (consumedInventoryById.size) {
      await Promise.all([...consumedInventoryById.entries()].map(([inventoryItemId, count]) => (
        Inventory.updateOne(
          { _id: inventoryItemId },
          { $inc: { quantity: -count } }
        )
      )))
    }

    const auditLogs = [
      ...staffUsers.slice(0, 8).map((user) => ({
        actorUserId: admin._id,
        targetUserId: user._id,
        actionType: 'admin.provider_application.approved',
        beforeSnapshot: {
          ...createAuditSnapshot(user),
          roles: [buildRoleAssignment('customer', { isPrimary: true }), buildRoleAssignment('staff')]
        },
        afterSnapshot: createAuditSnapshot(user),
        reason: 'staff'
      })),
      ...driverUsers.slice(0, 8).map((user) => ({
        actorUserId: admin._id,
        targetUserId: user._id,
        actionType: 'admin.provider_application.approved',
        beforeSnapshot: {
          ...createAuditSnapshot(user),
          roles: [buildRoleAssignment('customer', { isPrimary: true }), buildRoleAssignment('driver')]
        },
        afterSnapshot: createAuditSnapshot(user),
        reason: 'driver'
      })),
      ...customerUsers
        .filter((user) => user.accountStatus !== 'active')
        .slice(0, 6)
        .map((user) => ({
          actorUserId: admin._id,
          targetUserId: user._id,
          actionType: 'admin.account_status.updated',
          beforeSnapshot: {
            ...createAuditSnapshot(user),
            accountStatus: 'active'
          },
          afterSnapshot: createAuditSnapshot(user),
          reason: user.accountStatus
        }))
    ]

    if (auditLogs.length) {
      await AuditLog.insertMany(auditLogs)
    }

    console.log('Seed complete')
    console.log(`Users created: ${1 + staffUsers.length + driverUsers.length + customerUsers.length}`)
    console.log(`Vehicles created: ${vehicles.length}`)
    console.log(`Driver ads created: ${driverAds.length}`)
    console.log(`Inventory items created: ${inventoryItems.length}`)
    console.log(`Maintenance records created: ${maintenance.length}`)
    console.log(`Bookings created: ${bookings.length}`)
    console.log(`Saved cards created: ${paymentCards.length}`)
    console.log(`Payments created: ${payments.length}`)
    console.log(`Reviews created: ${reviews.length}`)
    console.log(`Complaints created: ${complaints.length}`)
    console.log(`Audit logs created: ${auditLogs.length}`)
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
