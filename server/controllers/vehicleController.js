const Vehicle = require('../models/Vehicle')
const { sendServerError } = require('../utils/errorResponses')
const { serializeVehicle } = require('../utils/reservationHelpers')

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

const getVehicles = async (req, res) => {
  try {
    const { search = '', status, district, featured, limit } = req.query
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

    const vehicleQuery = Vehicle.find(query).sort({ featured: -1, createdAt: -1 })

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
    const vehicle = await Vehicle.findById(req.params.id)

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    res.json(serializeVehicle(vehicle))
  } catch (error) {
    sendServerError(res, error, 'Failed to load vehicle details')
  }
}

module.exports = {
  getVehicles,
  getVehicleById
}
