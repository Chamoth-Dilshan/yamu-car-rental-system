const Booking = require('../models/Booking')
const DriverAd = require('../models/DriverAd')
const { sendServerError } = require('../utils/errorResponses')
const { serializeDriverAd, DRIVER_AD_AVAILABILITY, DRIVER_AD_VISIBILITY, parseListField } = require('../utils/reservationHelpers')

const driverSummaryFields = 'fullName email phone city profilePic'

const getDriverAdPayload = (body, file, existingAd, user) => {
  const title = String(body.title || existingAd?.title || '').trim()
  const dailyRate = Number(body.dailyRate ?? existingAd?.dailyRate ?? 0)
  const maxGroupSize = Number(body.maxGroupSize ?? existingAd?.maxGroupSize ?? 1)
  const experienceYears = Number(body.experienceYears ?? existingAd?.experienceYears ?? 0)
  const availability = body.availability || existingAd?.availability || 'available'
  const visibility = body.visibility || existingAd?.visibility || 'active'

  if (!title) {
    return { error: 'Advertisement title is required' }
  }

  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    return { error: 'Daily rate must be greater than zero' }
  }

  if (!DRIVER_AD_AVAILABILITY.includes(availability)) {
    return { error: 'Invalid ad availability value' }
  }

  if (!DRIVER_AD_VISIBILITY.includes(visibility)) {
    return { error: 'Invalid ad visibility value' }
  }

  return {
    payload: {
      title,
      tagline: String(body.tagline || existingAd?.tagline || '').trim(),
      serviceLocation: String(
        body.serviceLocation
        || existingAd?.serviceLocation
        || user.driverProfile?.serviceArea
        || user.staffProfile?.storeAddress
        || user.city
        || ''
      ).trim(),
      languages: parseListField(body.languages || existingAd?.languages || []),
      experienceYears: Number.isFinite(experienceYears) && experienceYears >= 0 ? experienceYears : 0,
      dailyRate,
      maxGroupSize: Number.isFinite(maxGroupSize) && maxGroupSize > 0 ? maxGroupSize : 1,
      availability,
      visibility,
      preferredContact: String(body.preferredContact || existingAd?.preferredContact || '').trim(),
      specialties: parseListField(body.specialties || existingAd?.specialties || []),
      description: String(body.description || existingAd?.description || '').trim(),
      photo: file ? `driver-ads/${file.filename}` : (existingAd?.photo || (user.profilePic !== 'avatar.png' ? user.profilePic : ''))
    }
  }
}

const buildStats = (ads) => ({
  totalAds: ads.length,
  activeAds: ads.filter((ad) => ad.visibility === 'active').length,
  availableAds: ads.filter((ad) => ad.availability === 'available').length,
  pausedAds: ads.filter((ad) => ad.visibility === 'paused').length
})

const getDriverAds = async (req, res) => {
  try {
    const { search = '', location, availability } = req.query
    const query = { visibility: 'active' }

    if (availability && availability !== 'all') {
      query.availability = availability
    }

    if (location && location !== 'all') {
      query.serviceLocation = new RegExp(location, 'i')
    }

    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { title: regex },
        { tagline: regex },
        { serviceLocation: regex },
        { languages: regex },
        { specialties: regex }
      ]
    }

    const ads = await DriverAd.find(query)
      .populate('driver', driverSummaryFields)
      .sort({ availability: 1, createdAt: -1 })

    res.json({
      ads: ads.map(serializeDriverAd)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load driver advertisements')
  }
}

const getDriverAdById = async (req, res) => {
  try {
    const ad = await DriverAd.findById(req.params.id).populate('driver', driverSummaryFields)

    if (!ad || ad.visibility !== 'active') {
      return res.status(404).json({ message: 'Driver advertisement not found' })
    }

    res.json(serializeDriverAd(ad))
  } catch (error) {
    sendServerError(res, error, 'Failed to load driver advertisement')
  }
}

const getMyDriverAds = async (req, res) => {
  try {
    const { search = '', availability, visibility } = req.query
    const query = { driver: req.user._id }

    if (availability && availability !== 'all') {
      query.availability = availability
    }

    if (visibility && visibility !== 'all') {
      query.visibility = visibility
    }

    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { title: regex },
        { tagline: regex },
        { serviceLocation: regex },
        { languages: regex }
      ]
    }

    const ads = await DriverAd.find(query)
      .populate('driver', driverSummaryFields)
      .sort({ updatedAt: -1 })

    res.json({
      ads: ads.map(serializeDriverAd),
      stats: buildStats(ads)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load your driver advertisements')
  }
}

const createDriverAd = async (req, res) => {
  try {
    const { payload, error } = getDriverAdPayload(req.body, req.file, null, req.user)

    if (error) {
      return res.status(400).json({ message: error })
    }

    const ad = await DriverAd.create({
      ...payload,
      driver: req.user._id
    })

    const createdAd = await DriverAd.findById(ad._id).populate('driver', driverSummaryFields)

    res.status(201).json({
      message: 'Driver advertisement created successfully',
      ad: serializeDriverAd(createdAd)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to create driver advertisement')
  }
}

const updateDriverAd = async (req, res) => {
  try {
    const ad = await DriverAd.findOne({ _id: req.params.id, driver: req.user._id })

    if (!ad) {
      return res.status(404).json({ message: 'Driver advertisement not found' })
    }

    const { payload, error } = getDriverAdPayload(req.body, req.file, ad, req.user)

    if (error) {
      return res.status(400).json({ message: error })
    }

    Object.assign(ad, payload)
    await ad.save()

    const updatedAd = await DriverAd.findById(ad._id).populate('driver', driverSummaryFields)

    res.json({
      message: 'Driver advertisement updated successfully',
      ad: serializeDriverAd(updatedAd)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to update driver advertisement')
  }
}

const deleteDriverAd = async (req, res) => {
  try {
    const ad = await DriverAd.findOne({ _id: req.params.id, driver: req.user._id })

    if (!ad) {
      return res.status(404).json({ message: 'Driver advertisement not found' })
    }

    const activeBooking = await Booking.findOne({
      driverAd: ad._id,
      bookingStatus: { $in: ['pending', 'confirmed'] }
    })

    if (activeBooking) {
      return res.status(400).json({ message: 'This advertisement still has active booking requests' })
    }

    await ad.deleteOne()

    res.json({ message: 'Driver advertisement deleted' })
  } catch (error) {
    sendServerError(res, error, 'Failed to delete driver advertisement')
  }
}

module.exports = {
  getDriverAds,
  getDriverAdById,
  getMyDriverAds,
  createDriverAd,
  updateDriverAd,
  deleteDriverAd
}
