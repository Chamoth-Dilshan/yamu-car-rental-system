const Booking = require('../reservations/booking.model')
const DriverAd = require('./driverAd.model')
const Review = require('../reviews/review.model')
const User = require('../users/user.model')
const {
  serializeDriverAd,
  DRIVER_AD_AVAILABILITY,
  DRIVER_AD_VISIBILITY,
  parseListField
} = require('../../utils/reservationHelpers')

const driverSummaryFields = 'fullName email phone city profilePic'
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const roundRating = (value) => Number((Number(value || 0)).toFixed(1))

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

const buildDriverAdReviewStatsMap = async (ads) => {
  const adIds = ads.map((ad) => ad._id).filter(Boolean)

  if (!adIds.length) {
    return new Map()
  }

  const stats = await Review.aggregate([
    {
      $match: {
        status: 'approved',
        driverAd: { $in: adIds },
        driverRating: { $gte: 1, $lte: 5 }
      }
    },
    {
      $group: {
        _id: '$driverAd',
        ratingAverage: { $avg: '$driverRating' },
        reviewCount: { $sum: 1 }
      }
    }
  ])

  return new Map(stats.map((item) => [String(item._id), {
    ratingAverage: roundRating(item.ratingAverage),
    reviewCount: item.reviewCount
  }]))
}

const applyDriverAdReviewStats = (ad, statsMap) => {
  const stats = statsMap.get(String(ad._id))

  if (!stats) {
    return ad
  }

  const rawAd = ad?.toObject ? ad.toObject() : { ...ad }
  return {
    ...rawAd,
    ...stats
  }
}

const serializeAdsWithReviewStats = async (ads) => {
  const reviewStatsMap = await buildDriverAdReviewStatsMap(ads)
  return ads.map((ad) => serializeDriverAd(applyDriverAdReviewStats(ad, reviewStatsMap)))
}

const listPublicDriverAds = async ({ search = '', location, availability } = {}) => {
  const normalizedSearch = String(search || '').trim()
  const normalizedLocation = String(location || '').trim()
  const query = { visibility: 'active' }

  if (availability && availability !== 'all') {
    query.availability = availability
  }

  if (normalizedLocation && normalizedLocation !== 'all') {
    query.serviceLocation = new RegExp(escapeRegex(normalizedLocation), 'i')
  }

  if (normalizedSearch) {
    const regex = new RegExp(escapeRegex(normalizedSearch), 'i')
    const matchingDriverIds = await User.find({
      $or: [
        { fullName: regex },
        { username: regex },
        { email: regex },
        { city: regex }
      ]
    }).distinct('_id')

    query.$or = [
      { title: regex },
      { tagline: regex },
      { serviceLocation: regex },
      { languages: regex },
      { specialties: regex },
      { driver: { $in: matchingDriverIds } }
    ]
  }

  const ads = await DriverAd.find(query)
    .populate('driver', driverSummaryFields)
    .sort({ availability: 1, createdAt: -1 })

  return serializeAdsWithReviewStats(ads)
}

const getPublicDriverAdById = async (adId) => {
  const ad = await DriverAd.findById(adId).populate('driver', driverSummaryFields)

  if (!ad || ad.visibility !== 'active') {
    return { error: 'Driver advertisement not found', statusCode: 404 }
  }

  const [serializedAd] = await serializeAdsWithReviewStats([ad])
  return { ad: serializedAd }
}

const listDriverAdsForDriver = async ({
  driverId,
  search = '',
  availability,
  visibility
} = {}) => {
  const normalizedSearch = String(search || '').trim()
  const query = { driver: driverId }

  if (availability && availability !== 'all') {
    query.availability = availability
  }

  if (visibility && visibility !== 'all') {
    query.visibility = visibility
  }

  if (normalizedSearch) {
    const regex = new RegExp(escapeRegex(normalizedSearch), 'i')
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
    .sort({ updatedAt: -1 })

  return {
    ads: await serializeAdsWithReviewStats(ads),
    stats: buildStats(ads)
  }
}

const createDriverAd = async ({ user, body, file }) => {
  const existingAd = await DriverAd.findOne({ driver: user._id }).select('_id')

  if (existingAd) {
    return {
      error: 'You already have a driver advertisement. Update the existing ad instead.',
      statusCode: 400
    }
  }

  const { payload, error } = getDriverAdPayload(body, file, null, user)

  if (error) {
    return { error, statusCode: 400 }
  }

  const ad = await DriverAd.create({
    ...payload,
    driver: user._id
  })

  const createdAd = await DriverAd.findById(ad._id).populate('driver', driverSummaryFields)

  return {
    message: 'Driver advertisement created successfully',
    ad: serializeDriverAd(createdAd)
  }
}

const updateDriverAd = async ({ adId, user, body, file }) => {
  const ad = await DriverAd.findOne({ _id: adId, driver: user._id })

  if (!ad) {
    return { error: 'Driver advertisement not found', statusCode: 404 }
  }

  const { payload, error } = getDriverAdPayload(body, file, ad, user)

  if (error) {
    return { error, statusCode: 400 }
  }

  Object.assign(ad, payload)
  await ad.save()

  const updatedAd = await DriverAd.findById(ad._id).populate('driver', driverSummaryFields)

  return {
    message: 'Driver advertisement updated successfully',
    ad: serializeDriverAd(updatedAd)
  }
}

const deleteDriverAd = async ({ adId, driverId }) => {
  const ad = await DriverAd.findOne({ _id: adId, driver: driverId })

  if (!ad) {
    return { error: 'Driver advertisement not found', statusCode: 404 }
  }

  const activeBooking = await Booking.findOne({
    driverAd: ad._id,
    bookingStatus: { $in: ['pending', 'confirmed'] }
  })

  if (activeBooking) {
    return { error: 'This advertisement still has active booking requests', statusCode: 400 }
  }

  await ad.deleteOne()

  return { message: 'Driver advertisement deleted' }
}

module.exports = {
  listPublicDriverAds,
  getPublicDriverAdById,
  listDriverAdsForDriver,
  createDriverAd,
  updateDriverAd,
  deleteDriverAd
}
