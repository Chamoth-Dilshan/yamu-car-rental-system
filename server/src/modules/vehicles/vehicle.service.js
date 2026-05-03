const Vehicle = require('./vehicle.model')
const Booking = require('../reservations/booking.model')
const Maintenance = require('../maintenance/maintenance.model')
const Review = require('../reviews/review.model')
const { canUseRole, getRoleAssignment } = require('../../utils/roleHelpers')
const { serializeVehicle } = require('../../utils/reservationHelpers')
const { buildVehiclePayload } = require('./vehicle.validation')

const DISTRICT_LOCATION_ALIASES = {
  Ampara: ['Ampara', 'Kalmunai', 'Akkaraipattu', 'Sainthamaruthu'],
  Anuradhapura: ['Anuradhapura', 'Kekirawa', 'Tambuttegama'],
  Badulla: ['Badulla', 'Bandarawela', 'Ella', 'Haputale'],
  Batticaloa: ['Batticaloa', 'Kattankudy', 'Eravur'],
  Colombo: ['Colombo', 'Dehiwala', 'Mount Lavinia', 'Moratuwa', 'Nugegoda', 'Maharagama', 'Battaramulla', 'Rajagiriya'],
  Galle: ['Galle', 'Ambalangoda', 'Hikkaduwa', 'Elpitiya'],
  Gampaha: ['Gampaha', 'Negombo', 'Ja-Ela', 'Wattala', 'Kadawatha', 'Kiribathgoda', 'Kelaniya'],
  Hambantota: ['Hambantota', 'Tangalle', 'Beliatta'],
  Jaffna: ['Jaffna', 'Chavakachcheri', 'Point Pedro', 'Nallur'],
  Kalutara: ['Kalutara', 'Panadura', 'Beruwala', 'Horana', 'Matugama'],
  Kandy: ['Kandy', 'Peradeniya', 'Katugastota', 'Gampola'],
  Kegalle: ['Kegalle', 'Mawanella', 'Warakapola', 'Rambukkana'],
  Kilinochchi: ['Kilinochchi', 'Pallai'],
  Kurunegala: ['Kurunegala', 'Kuliyapitiya', 'Narammala', 'Pannala'],
  Mannar: ['Mannar', 'Murunkan'],
  Matale: ['Matale', 'Dambulla', 'Galewela'],
  Matara: ['Matara', 'Weligama', 'Akuressa', 'Dikwella'],
  Monaragala: ['Monaragala', 'Wellawaya', 'Bibile'],
  Mullaitivu: ['Mullaitivu', 'Oddusuddan'],
  'Nuwara Eliya': ['Nuwara Eliya', 'Hatton', 'Talawakele'],
  Polonnaruwa: ['Polonnaruwa', 'Kaduruwela', 'Medirigiriya'],
  Puttalam: ['Puttalam', 'Chilaw', 'Wennappuwa', 'Nattandiya'],
  Ratnapura: ['Ratnapura', 'Balangoda', 'Embilipitiya'],
  Trincomalee: ['Trincomalee', 'Kinniya'],
  Vavuniya: ['Vavuniya', 'Nedunkeni']
}

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const roundRating = (value) => Number((Number(value || 0)).toFixed(1))

const vehicleSummaryPopulate = {
  path: 'owner',
  select: 'fullName email phone city profilePic staffProfile.storeName'
}

const publicVehiclePopulate = {
  path: 'owner',
  select: 'fullName email phone city profilePic staffProfile.storeName accountStatus roles',
  match: {
    accountStatus: 'active',
    roles: {
      $elemMatch: {
        roleKey: 'staff',
        roleStatus: 'active',
        verificationStatus: 'verified'
      }
    }
  }
}

const hasBookableStoreOwner = (vehicle) => {
  const owner = vehicle?.owner

  if (!owner || owner.accountStatus !== 'active') {
    return false
  }

  return canUseRole(getRoleAssignment(owner, 'staff'))
}

const generateVehicleCode = async () => {
  let vehicleCode = ''

  do {
    vehicleCode = `CAR-${Math.floor(1000 + Math.random() * 9000)}`
  } while (await Vehicle.exists({ vehicleCode }))

  return vehicleCode
}

const buildVehicleStats = (vehicles) => ({
  totalVehicles: vehicles.length,
  availableCount: vehicles.filter((vehicle) => vehicle.status === 'available').length,
  reservedCount: vehicles.filter((vehicle) => vehicle.status === 'reserved').length,
  maintenanceCount: vehicles.filter((vehicle) => vehicle.status === 'maintenance').length,
  inactiveCount: vehicles.filter((vehicle) => vehicle.status === 'inactive').length
})

const buildVehicleReviewStatsMap = async (vehicles) => {
  const vehicleIds = vehicles.map((vehicle) => vehicle._id).filter(Boolean)

  if (!vehicleIds.length) {
    return new Map()
  }

  const stats = await Review.aggregate([
    {
      $match: {
        status: 'approved',
        vehicle: { $in: vehicleIds },
        vehicleRating: { $gte: 1, $lte: 5 }
      }
    },
    {
      $group: {
        _id: '$vehicle',
        ratingAverage: { $avg: '$vehicleRating' },
        reviewCount: { $sum: 1 }
      }
    }
  ])

  return new Map(stats.map((item) => [String(item._id), {
    ratingAverage: roundRating(item.ratingAverage),
    reviewCount: item.reviewCount
  }]))
}

const applyVehicleReviewStats = (vehicle, statsMap) => {
  const stats = statsMap.get(String(vehicle._id))

  if (!stats) {
    return vehicle
  }

  const rawVehicle = vehicle?.toObject ? vehicle.toObject() : { ...vehicle }
  return {
    ...rawVehicle,
    ...stats
  }
}

const serializeVehiclesWithReviewStats = async (vehicles) => {
  const reviewStatsMap = await buildVehicleReviewStatsMap(vehicles)
  return vehicles.map((vehicle) => serializeVehicle(applyVehicleReviewStats(vehicle, reviewStatsMap)))
}

const listPublicVehicles = async ({
  search = '',
  status,
  district,
  featured,
  limit
} = {}) => {
  const query = {}

  if (status && status !== 'all') {
    query.status = status
  }

  if (district && district !== 'all') {
    const aliases = DISTRICT_LOCATION_ALIASES[district] || [district]
    query.location = new RegExp(aliases.map(escapeRegex).join('|'), 'i')
  }

  if (featured === 'true') {
    query.featured = true
  }

  if (search) {
    const regex = new RegExp(search, 'i')
    query.$or = [
      { name: regex },
      { brand: regex },
      { model: regex },
      { category: regex },
      { location: regex },
      { vehicleCode: regex }
    ]
  }

  const vehicleQuery = Vehicle.find(query)
    .populate(publicVehiclePopulate)
    .sort({ featured: -1, createdAt: -1 })

  if (limit) {
    vehicleQuery.limit(Number(limit))
  }

  const vehicles = (await vehicleQuery).filter(hasBookableStoreOwner)

  return {
    vehicles: await serializeVehiclesWithReviewStats(vehicles)
  }
}

const getPublicVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).populate(publicVehiclePopulate)

  if (!vehicle || !hasBookableStoreOwner(vehicle)) {
    return { error: 'Vehicle not found or no longer available for booking', statusCode: 404 }
  }

  const [serializedVehicle] = await serializeVehiclesWithReviewStats([vehicle])
  return { vehicle: serializedVehicle }
}

const listOwnerVehicles = async ({ ownerId, search = '', status } = {}) => {
  const query = { owner: ownerId }

  if (status && status !== 'all') {
    query.status = status
  }

  if (search) {
    const regex = new RegExp(search, 'i')
    query.$or = [
      { name: regex },
      { brand: regex },
      { model: regex },
      { category: regex },
      { location: regex },
      { vehicleCode: regex }
    ]
  }

  const vehicles = await Vehicle.find(query)
    .populate(vehicleSummaryPopulate)
    .sort({ updatedAt: -1 })

  return {
    vehicles: await serializeVehiclesWithReviewStats(vehicles),
    stats: buildVehicleStats(vehicles)
  }
}

const createVehicle = async ({ owner, body, files = [] }) => {
  const { payload, error } = await buildVehiclePayload(body, files, null, owner, generateVehicleCode)

  if (error) {
    return { error, statusCode: 400 }
  }

  const vehicle = await Vehicle.create({
    ...payload,
    owner: owner._id
  })

  const createdVehicle = await Vehicle.findById(vehicle._id).populate(vehicleSummaryPopulate)

  return {
    message: 'Vehicle created successfully',
    vehicle: serializeVehicle(createdVehicle)
  }
}

const updateVehicle = async ({ vehicleId, owner, body, files = [] }) => {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: owner._id })

  if (!vehicle) {
    return { error: 'Vehicle not found', statusCode: 404 }
  }

  const { payload, error } = await buildVehiclePayload(body, files, vehicle, owner, generateVehicleCode)

  if (error) {
    return { error, statusCode: 400 }
  }

  const activeMaintenance = await Maintenance.exists({
    vehicle: vehicle._id,
    status: { $in: Maintenance.ACTIVE_MAINTENANCE_STATUSES }
  })

  if (activeMaintenance) {
    payload.status = 'maintenance'
  }

  Object.assign(vehicle, payload)
  await vehicle.save()

  const updatedVehicle = await Vehicle.findById(vehicle._id).populate(vehicleSummaryPopulate)

  return {
    message: 'Vehicle updated successfully',
    vehicle: serializeVehicle(updatedVehicle)
  }
}

const deleteVehicle = async ({ vehicleId, ownerId }) => {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId })

  if (!vehicle) {
    return { error: 'Vehicle not found', statusCode: 404 }
  }

  const activeBooking = await Booking.findOne({
    vehicle: vehicle._id,
    bookingType: 'vehicle',
    bookingStatus: { $in: ['pending', 'confirmed'] }
  })

  if (activeBooking) {
    return { error: 'This vehicle still has active booking requests', statusCode: 400 }
  }

  await vehicle.deleteOne()

  return { message: 'Vehicle deleted' }
}

module.exports = {
  listPublicVehicles,
  getPublicVehicleById,
  listOwnerVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
}
