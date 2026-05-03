const { VEHICLE_STATUSES, parseListField } = require('../../utils/reservationHelpers')

const buildVehiclePayload = async (body, files = [], existingVehicle, user, generateVehicleCode) => {
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

module.exports = {
  buildVehiclePayload
}
