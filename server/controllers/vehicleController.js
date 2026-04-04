const Vehicle = require('../models/Vehicle')
const Booking = require('../models/Booking')
const { sendServerError } = require('../utils/errorResponses')
const { serializeVehicle, VEHICLE_STATUSES, parseListField } = require('../utils/reservationHelpers')

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

const vehicleSummaryPopulate = {
  path: 'owner',
  select: 'fullName email phone city profilePic staffProfile.storeName'
}

const generateVehicleCode = async () => {
  let vehicleCode = ''

  do {
    vehicleCode = `CAR-${Math.floor(1000 + Math.random() * 9000)}`
  } while (await Vehicle.exists({ vehicleCode }))

  return vehicleCode
}

const buildVehiclePayload = async (body, files = [], existingVehicle, user) => {
  const name = String(body.name || existingVehicle?.name || '').trim()
  const brand = String(body.brand || existingVehicle?.brand || '').trim()
  const model = String(body.model || existingVehicle?.model || '').trim()
  const year = Number(body.year ?? existingVehicle?.year ?? 0)
  const fuelType = String(body.fuelType || existingVehicle?.fuelType || '').trim()
  const transmission = String(body.transmission || existingVehicle?.transmission || '').trim()
  const seats = Number(body.seats ?? existingVehicle?.seats ?? 0)
  const pricePerDay = Number(body.pricePerDay ?? existingVehicle?.pricePerDay ?? 0)
  const status = body.status || existingVehicle?.status || 'available'

  if (!name || !brand || !model) {
    return { error: 'Vehicle name, brand, and model are required' }
  }

  if (!Number.isFinite(year) || year < 1900) {
    return { error: 'A valid vehicle year is required' }
  }

  if (!fuelType || !transmission) {
    return { error: 'Fuel type and transmission are required' }
  }

  if (!Number.isFinite(seats) || seats < 1) {
    return { error: 'Seat count must be at least 1' }
  }

  if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
    return { error: 'Price per day must be greater than zero' }
  }

  if (!VEHICLE_STATUSES.includes(status)) {
    return { error: 'Invalid vehicle status' }
  }

  const images = files.length > 0
    ? files.map((file) => `vehicles/${file.filename}`)
    : (existingVehicle?.images || [])

  if (!images.length) {
    return { error: 'At least one vehicle image is required' }
  }

  return {
    payload: {
      vehicleCode: existingVehicle?.vehicleCode || await generateVehicleCode(),
      name,
      brand,
      model,
      year,
      category: String(body.category || existingVehicle?.category || '').trim(),
      fuelType,
      transmission,
      seats,
      location: String(
        body.location
        || existingVehicle?.location
        || user.staffProfile?.storeAddress
        || user.city
        || ''
      ).trim(),
      engineCapacity: String(body.engineCapacity || existingVehicle?.engineCapacity || '').trim(),
      ownerContact: String(
        body.ownerContact
        || existingVehicle?.ownerContact
        || user.staffProfile?.storeContactNumber
        || user.staffProfile?.storeEmail
        || user.phone
        || user.email
        || ''
      ).trim(),
      description: String(body.description || existingVehicle?.description || '').trim(),
      features: parseListField(body.features || existingVehicle?.features || []),
      images,
      pricePerDay,
      status,
      featured: body.featured === 'true' || body.featured === true || existingVehicle?.featured === true
    }
  }
}

const buildVehicleStats = (vehicles) => ({
  totalVehicles: vehicles.length,
  availableCount: vehicles.filter((vehicle) => vehicle.status === 'available').length,
  reservedCount: vehicles.filter((vehicle) => vehicle.status === 'reserved').length,
  maintenanceCount: vehicles.filter((vehicle) => vehicle.status === 'maintenance').length,
  inactiveCount: vehicles.filter((vehicle) => vehicle.status === 'inactive').length
})

const getVehicles = async (req, res) => {
  try {
    const { search = '', status, district, featured, limit } = req.query
    const query = { owner: { $ne: null } }

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
      .populate(vehicleSummaryPopulate)
      .sort({ featured: -1, createdAt: -1 })

    if (limit) {
      vehicleQuery.limit(Number(limit))
    }

    const vehicles = await vehicleQuery

    res.json({
      vehicles: vehicles.map(serializeVehicle)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load vehicles')
  }
}

const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate(vehicleSummaryPopulate)

    if (!vehicle || !vehicle.owner) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    res.json(serializeVehicle(vehicle))
  } catch (error) {
    sendServerError(res, error, 'Failed to load vehicle details')
  }
}

const getMyVehicles = async (req, res) => {
  try {
    const { search = '', status } = req.query
    const query = { owner: req.user._id }

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

    res.json({
      vehicles: vehicles.map(serializeVehicle),
      stats: buildVehicleStats(vehicles)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load your vehicles')
  }
}

const createVehicle = async (req, res) => {
  try {
    const { payload, error } = await buildVehiclePayload(req.body, req.files || [], null, req.user)

    if (error) {
      return res.status(400).json({ message: error })
    }

    const vehicle = await Vehicle.create({
      ...payload,
      owner: req.user._id
    })

    const createdVehicle = await Vehicle.findById(vehicle._id).populate(vehicleSummaryPopulate)

    res.status(201).json({
      message: 'Vehicle created successfully',
      vehicle: serializeVehicle(createdVehicle)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to create vehicle')
  }
}

const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id })

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    const { payload, error } = await buildVehiclePayload(req.body, req.files || [], vehicle, req.user)

    if (error) {
      return res.status(400).json({ message: error })
    }

    Object.assign(vehicle, payload)
    await vehicle.save()

    const updatedVehicle = await Vehicle.findById(vehicle._id).populate(vehicleSummaryPopulate)

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: serializeVehicle(updatedVehicle)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update vehicle')
  }
}

const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id })

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    const activeBooking = await Booking.findOne({
      vehicle: vehicle._id,
      bookingType: 'vehicle',
      bookingStatus: { $in: ['pending', 'confirmed'] }
    })

    if (activeBooking) {
      return res.status(400).json({ message: 'This vehicle still has active booking requests' })
    }

    await vehicle.deleteOne()

    res.json({ message: 'Vehicle deleted' })
  } catch (error) {
    sendServerError(res, error, 'Failed to delete vehicle')
  }
}

module.exports = {
  getVehicles,
  getVehicleById,
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
}
