const BOOKING_TYPES = ['vehicle', 'driver']
const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'closed']
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded']
const VEHICLE_STATUSES = ['available', 'reserved', 'maintenance', 'inactive']
const DRIVER_AD_AVAILABILITY = ['available', 'limited', 'unavailable']
const DRIVER_AD_VISIBILITY = ['active', 'draft', 'paused']

const parseListField = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeDateOnly = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    const year = value.getUTCFullYear()
    const month = `${value.getUTCMonth() + 1}`.padStart(2, '0')
    const day = `${value.getUTCDate()}`.padStart(2, '0')

    return new Date(`${year}-${month}-${day}T00:00:00.000Z`)
  }

  return new Date(`${value}T00:00:00.000Z`)
}

const calculateBillableDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0
  }

  const start = normalizeDateOnly(startDate)
  const end = normalizeDateOnly(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0
  }

  const diffInMs = end.getTime() - start.getTime()
  return Math.max(1, Math.round(diffInMs / (1000 * 60 * 60 * 24)) + 1)
}

const validateDateRange = (startDate, endDate) => {
  const normalizedStart = normalizeDateOnly(startDate)
  const normalizedEnd = normalizeDateOnly(endDate || startDate)

  if (!normalizedStart || Number.isNaN(normalizedStart.getTime())) {
    return { error: 'A valid start date is required' }
  }

  if (!normalizedEnd || Number.isNaN(normalizedEnd.getTime())) {
    return { error: 'A valid end date is required' }
  }

  if (normalizedEnd < normalizedStart) {
    return { error: 'End date must be the same day or after the start date' }
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    billableDays: calculateBillableDays(normalizedStart, normalizedEnd)
  }
}

const serializeUserSummary = (user) => {
  if (!user) {
    return null
  }

  const rawUser = user?.toObject ? user.toObject() : { ...user }

  return {
    _id: rawUser._id,
    fullName: rawUser.fullName,
    email: rawUser.email,
    phone: rawUser.phone || '',
    city: rawUser.city || '',
    profilePic: rawUser.profilePic || 'avatar.png'
  }
}

const serializeVehicle = (vehicle) => {
  if (!vehicle) {
    return null
  }

  const rawVehicle = vehicle?.toObject ? vehicle.toObject() : { ...vehicle }

  return {
    _id: rawVehicle._id,
    vehicleCode: rawVehicle.vehicleCode,
    name: rawVehicle.name,
    brand: rawVehicle.brand,
    model: rawVehicle.model,
    year: rawVehicle.year,
    category: rawVehicle.category || '',
    fuelType: rawVehicle.fuelType,
    transmission: rawVehicle.transmission,
    seats: rawVehicle.seats,
    location: rawVehicle.location,
    engineCapacity: rawVehicle.engineCapacity || '',
    ownerContact: rawVehicle.ownerContact || '',
    description: rawVehicle.description || '',
    features: rawVehicle.features || [],
    images: rawVehicle.images || [],
    pricePerDay: rawVehicle.pricePerDay,
    status: rawVehicle.status,
    featured: Boolean(rawVehicle.featured),
    createdAt: rawVehicle.createdAt,
    updatedAt: rawVehicle.updatedAt
  }
}

const serializeDriverAd = (ad) => {
  if (!ad) {
    return null
  }

  const rawAd = ad?.toObject ? ad.toObject() : { ...ad }

  return {
    _id: rawAd._id,
    title: rawAd.title,
    tagline: rawAd.tagline || '',
    serviceLocation: rawAd.serviceLocation || '',
    languages: rawAd.languages || [],
    experienceYears: rawAd.experienceYears || 0,
    dailyRate: rawAd.dailyRate || 0,
    maxGroupSize: rawAd.maxGroupSize || 1,
    availability: rawAd.availability,
    visibility: rawAd.visibility,
    preferredContact: rawAd.preferredContact || '',
    specialties: rawAd.specialties || [],
    description: rawAd.description || '',
    photo: rawAd.photo || '',
    completedTrips: rawAd.completedTrips || 0,
    ratingAverage: rawAd.ratingAverage || 0,
    reviewCount: rawAd.reviewCount || 0,
    driver: serializeUserSummary(rawAd.driver),
    createdAt: rawAd.createdAt,
    updatedAt: rawAd.updatedAt
  }
}

const serializeBooking = (booking) => {
  if (!booking) {
    return null
  }

  const rawBooking = booking?.toObject ? booking.toObject() : { ...booking }
  const relatedDriver = rawBooking.driver || rawBooking.driverAd?.driver || null
  const vehicleSummary = serializeVehicle(rawBooking.vehicle)
  const driverAdSummary = serializeDriverAd(rawBooking.driverAd)
  const displayVehicle = vehicleSummary?.name || rawBooking.vehicleLabel || rawBooking.serviceTitle || 'Booking request'

  return {
    _id: rawBooking._id,
    bookingNo: rawBooking.bookingNo,
    bookingType: rawBooking.bookingType,
    bookingStatus: rawBooking.bookingStatus,
    paymentStatus: rawBooking.paymentStatus,
    startDate: rawBooking.startDate,
    endDate: rawBooking.endDate,
    pickupLocation: rawBooking.pickupLocation || '',
    destination: rawBooking.destination || '',
    notes: rawBooking.notes || '',
    serviceTitle: rawBooking.serviceTitle || '',
    vehicleLabel: rawBooking.vehicleLabel || '',
    dailyRate: rawBooking.dailyRate || 0,
    billableDays: rawBooking.billableDays || 0,
    baseAmount: rawBooking.baseAmount || 0,
    serviceFee: rawBooking.serviceFee || 0,
    totalAmount: rawBooking.totalAmount || 0,
    adminNote: rawBooking.adminNote || '',
    driverResponseNote: rawBooking.driverResponseNote || '',
    customer: serializeUserSummary(rawBooking.customer),
    driver: serializeUserSummary(relatedDriver),
    vehicle: vehicleSummary,
    driverAd: driverAdSummary,
    displayVehicle,
    createdAt: rawBooking.createdAt,
    updatedAt: rawBooking.updatedAt
  }
}

module.exports = {
  BOOKING_TYPES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  VEHICLE_STATUSES,
  DRIVER_AD_AVAILABILITY,
  DRIVER_AD_VISIBILITY,
  parseListField,
  normalizeDateOnly,
  calculateBillableDays,
  validateDateRange,
  serializeUserSummary,
  serializeVehicle,
  serializeDriverAd,
  serializeBooking
}
