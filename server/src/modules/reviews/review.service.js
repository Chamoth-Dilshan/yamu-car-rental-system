const Review = require('./review.model')
const Booking = require('../reservations/booking.model')
const DriverAd = require('../drivers/driverAd.model')
const User = require('../users/user.model')
const Vehicle = require('../vehicles/vehicle.model')
const { serializeBooking } = require('../../utils/reservationHelpers')
const { addNotificationToAdmins } = require('../../utils/notificationHelpers')
const {
  isValidObjectId,
  getNumericRating,
  normalizeReviewStatus,
  canReviewBooking
} = require('./review.validation')

const reviewPopulate = [
  { path: 'customer', select: 'fullName email profilePic' },
  { path: 'driver', select: 'fullName email profilePic' },
  { path: 'vehicle', select: 'name brand model category images owner' },
  { path: 'driverAd', select: 'title driver photo serviceLocation' },
  { path: 'reviewedBy', select: 'fullName email' }
]

const bookingPopulate = [
  { path: 'customer', select: 'fullName email phone city profilePic' },
  { path: 'driver', select: 'fullName email phone city profilePic' },
  {
    path: 'vehicle',
    populate: {
      path: 'owner',
      select: 'fullName email phone city profilePic staffProfile.storeName'
    }
  },
  {
    path: 'driverAd',
    populate: {
      path: 'driver',
      select: 'fullName email phone city profilePic'
    }
  }
]

const ratingDistributionTemplate = () => ({
  1: { driver: 0, vehicle: 0 },
  2: { driver: 0, vehicle: 0 },
  3: { driver: 0, vehicle: 0 },
  4: { driver: 0, vehicle: 0 },
  5: { driver: 0, vehicle: 0 }
})

const toPlain = (value) => (value?.toObject ? value.toObject() : value)

const roundRating = (value) => Number((Number(value || 0)).toFixed(1))

const activeProviderRoleQuery = (roleKey) => ({
  accountStatus: 'active',
  roles: {
    $elemMatch: {
      roleKey,
      roleStatus: 'active',
      verificationStatus: 'verified'
    }
  }
})

const getDriverFromBooking = (booking) => booking.driver || booking.driverAd?.driver || null

const getDriverId = (review) => {
  const rawReview = toPlain(review)
  const driver = rawReview.driver
  return driver?._id || driver || null
}

const getVehicleId = (review) => {
  const rawReview = toPlain(review)
  const vehicle = rawReview.vehicle
  return vehicle?._id || vehicle || null
}

const getDriverAdId = (review) => {
  const rawReview = toPlain(review)
  const driverAd = rawReview.driverAd
  return driverAd?._id || driverAd || null
}

const serializeReview = (review) => {
  const rawReview = toPlain(review)

  return {
    _id: rawReview._id,
    booking: rawReview.booking,
    bookingNo: rawReview.bookingNo,
    bookingType: rawReview.bookingType,
    customer: rawReview.customer,
    driver: rawReview.driver,
    vehicle: rawReview.vehicle,
    driverAd: rawReview.driverAd,
    passengerName: rawReview.passengerName,
    driverName: rawReview.driverName || '',
    vehicleName: rawReview.vehicleName || '',
    vehicleRating: rawReview.vehicleRating,
    driverRating: rawReview.driverRating,
    feedback: rawReview.feedback,
    status: rawReview.status,
    reviewedBy: rawReview.reviewedBy || null,
    reviewedAt: rawReview.reviewedAt || null,
    rejectionReason: rawReview.rejectionReason || '',
    createdAt: rawReview.createdAt,
    updatedAt: rawReview.updatedAt
  }
}

const calculateApprovedRatingStats = async (match, ratingField) => {
  const [stats] = await Review.aggregate([
    {
      $match: {
        ...match,
        status: 'approved',
        [ratingField]: { $gte: 1, $lte: 5 }
      }
    },
    {
      $group: {
        _id: null,
        ratingAverage: { $avg: `$${ratingField}` },
        reviewCount: { $sum: 1 }
      }
    }
  ])

  return {
    ratingAverage: stats ? roundRating(stats.ratingAverage) : 0,
    reviewCount: stats?.reviewCount || 0
  }
}

const refreshVehicleRatingStats = async (vehicleId) => {
  if (!vehicleId) {
    return null
  }

  const stats = await calculateApprovedRatingStats({ vehicle: vehicleId }, 'vehicleRating')
  return Vehicle.findByIdAndUpdate(vehicleId, stats, { new: true })
}

const refreshDriverAdRatingStats = async (driverAdId) => {
  if (!driverAdId) {
    return null
  }

  const stats = await calculateApprovedRatingStats({ driverAd: driverAdId }, 'driverRating')
  return DriverAd.findByIdAndUpdate(driverAdId, stats, { new: true })
}

const refreshReviewTargetStats = async (review) => Promise.all([
  refreshVehicleRatingStats(getVehicleId(review)),
  refreshDriverAdRatingStats(getDriverAdId(review))
])

const addToRanking = (rankingMap, key, payload) => {
  if (!key) {
    return
  }

  const existing = rankingMap.get(String(key)) || {
    _id: String(key),
    name: payload.name || 'Unknown',
    subtitle: payload.subtitle || '',
    image: payload.image || '',
    link: payload.link || '',
    ratingSum: 0,
    reviewCount: 0
  }

  if (!existing.image && payload.image) {
    existing.image = payload.image
  }

  if (!existing.link && payload.link) {
    existing.link = payload.link
  }

  existing.ratingSum += payload.rating
  existing.reviewCount += 1
  existing.ratingAverage = roundRating(existing.ratingSum / existing.reviewCount)
  rankingMap.set(String(key), existing)
}

const buildReviewSummary = (reviews) => {
  const driverMap = new Map()
  const vehicleMap = new Map()
  const distribution = ratingDistributionTemplate()
  let driverRatingSum = 0
  let driverRatingCount = 0
  let vehicleRatingSum = 0
  let vehicleRatingCount = 0

  reviews.forEach((review) => {
    const rawReview = toPlain(review)
    const driverRating = getNumericRating(rawReview.driverRating)
    const vehicleRating = getNumericRating(rawReview.vehicleRating)
    const driverAdId = getDriverAdId(rawReview)
    const driverId = getDriverId(rawReview)
    const vehicleId = getVehicleId(rawReview)

    if (driverRating) {
      driverRatingSum += driverRating
      driverRatingCount += 1
      distribution[Math.round(driverRating)].driver += 1

      addToRanking(driverMap, driverAdId || driverId, {
        name: rawReview.driver?.fullName || rawReview.driverName || 'Driver',
        subtitle: rawReview.driverAd?.title || rawReview.driverAd?.serviceLocation || 'Driver',
        image: rawReview.driverAd?.photo || rawReview.driver?.profilePic || '',
        link: driverAdId ? `/drivers/${driverAdId}` : '/drivers',
        rating: driverRating
      })
    }

    if (vehicleRating) {
      vehicleRatingSum += vehicleRating
      vehicleRatingCount += 1
      distribution[Math.round(vehicleRating)].vehicle += 1

      addToRanking(vehicleMap, vehicleId, {
        name: rawReview.vehicle?.name || rawReview.vehicleName || 'Vehicle',
        subtitle: rawReview.vehicle?.category || rawReview.vehicle?.brand || 'Vehicle',
        image: rawReview.vehicle?.images?.[0] || '',
        link: vehicleId ? `/cars/${vehicleId}` : '/cars',
        rating: vehicleRating
      })
    }
  })

  const toTopList = (map) => [...map.values()]
    .map((item) => ({
      _id: item._id,
      name: item.name,
      subtitle: item.subtitle,
      image: item.image,
      link: item.link,
      ratingAverage: item.ratingAverage || 0,
      reviewCount: item.reviewCount
    }))
    .sort((left, right) => (
      right.ratingAverage - left.ratingAverage
      || right.reviewCount - left.reviewCount
      || left.name.localeCompare(right.name)
    ))
    .slice(0, 5)

  return {
    averageDriverRating: driverRatingCount ? roundRating(driverRatingSum / driverRatingCount) : 0,
    averageVehicleRating: vehicleRatingCount ? roundRating(vehicleRatingSum / vehicleRatingCount) : 0,
    driverRatingCount,
    vehicleRatingCount,
    totalApprovedReviews: reviews.length,
    topDrivers: toTopList(driverMap),
    topVehicles: toTopList(vehicleMap),
    ratingDistribution: Object.entries(distribution).map(([rating, counts]) => ({
      rating: Number(rating),
      ...counts
    }))
  }
}

const buildReviewFromBooking = (booking, reqBody, customer) => {
  const driver = getDriverFromBooking(booking)
  const hasDriver = Boolean(driver?._id || driver)
  const hasVehicle = Boolean(booking.vehicle?._id || booking.vehicle)
  const vehicleRating = hasVehicle ? getNumericRating(reqBody.vehicleRating) : null
  const driverRating = hasDriver ? getNumericRating(reqBody.driverRating) : null
  const feedback = String(reqBody.feedback || reqBody.overallFeedback || '').trim()

  if (!canReviewBooking(booking)) {
    return { error: 'Reviews are available after the trip is completed and paid.' }
  }

  if (!hasDriver && !hasVehicle) {
    return { error: 'This booking does not have a reviewable driver or vehicle' }
  }

  if (hasVehicle && !vehicleRating) {
    return { error: 'Vehicle rating must be between 1 and 5' }
  }

  if (hasDriver && !driverRating) {
    return { error: 'Driver rating must be between 1 and 5' }
  }

  if (!feedback) {
    return { error: 'Feedback is required' }
  }

  return {
    payload: {
      booking: booking._id,
      bookingNo: booking.bookingNo,
      bookingType: booking.bookingType,
      customer: booking.customer?._id || booking.customer || customer._id,
      driver: hasDriver ? (driver._id || driver) : null,
      vehicle: hasVehicle ? (booking.vehicle._id || booking.vehicle) : null,
      driverAd: booking.driverAd?._id || booking.driverAd || null,
      passengerName: customer.fullName || booking.customer?.fullName || 'Customer',
      driverName: hasDriver ? (driver.fullName || booking.driverAd?.driver?.fullName || 'Driver') : '',
      vehicleName: hasVehicle ? (booking.vehicle.name || booking.vehicleLabel || booking.serviceTitle || 'Vehicle') : '',
      vehicleRating,
      driverRating,
      feedback
    }
  }
}

const createReview = async ({ customer, body }) => {
  const bookingId = body.bookingId || body.booking
  const booking = await Booking.findOne({ _id: bookingId, customer: customer._id }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Booking not found', statusCode: 404 }
  }

  const existingReview = await Review.findOne({ booking: booking._id })
  if (existingReview) {
    return { error: 'A review has already been submitted for this booking', statusCode: 400 }
  }

  const reviewDraft = buildReviewFromBooking(booking, body, customer)
  if (reviewDraft.error) {
    return { error: reviewDraft.error, statusCode: 400 }
  }

  const review = await Review.create(reviewDraft.payload)
  const populatedReview = await Review.findById(review._id).populate(reviewPopulate)

  await addNotificationToAdmins({
    type: 'review',
    title: 'Review waiting for approval',
    message: `${customer.fullName} submitted feedback for booking ${booking.bookingNo}.`,
    link: '/admin/reviews'
  })

  return {
    message: 'Review submitted for admin approval',
    review: serializeReview(populatedReview)
  }
}

const listCustomerReviews = async (customerId) => {
  const reviews = await Review.find({ customer: customerId })
    .populate(reviewPopulate)
    .sort({ updatedAt: -1, createdAt: -1 })

  return {
    reviews: reviews.map(serializeReview)
  }
}

const updateCustomerReview = async ({ reviewId, customer, body }) => {
  if (!isValidObjectId(reviewId)) {
    return { error: 'Invalid review id', statusCode: 400 }
  }

  const review = await Review.findOne({ _id: reviewId, customer: customer._id })

  if (!review) {
    return { error: 'Review not found', statusCode: 404 }
  }

  const hasVehicle = Boolean(review.vehicle)
  const hasDriver = Boolean(review.driver || review.driverAd)
  const vehicleRating = hasVehicle ? getNumericRating(body.vehicleRating) : null
  const driverRating = hasDriver ? getNumericRating(body.driverRating) : null
  const feedback = String(body.feedback || body.overallFeedback || '').trim()

  if (hasVehicle && !vehicleRating) {
    return { error: 'Vehicle rating must be between 1 and 5', statusCode: 400 }
  }

  if (hasDriver && !driverRating) {
    return { error: 'Driver rating must be between 1 and 5', statusCode: 400 }
  }

  if (!feedback) {
    return { error: 'Feedback is required', statusCode: 400 }
  }

  review.vehicleRating = vehicleRating
  review.driverRating = driverRating
  review.feedback = feedback
  review.status = 'pending'
  review.reviewedBy = null
  review.reviewedAt = null
  review.rejectionReason = ''
  await review.save()
  await refreshReviewTargetStats(review)

  const populatedReview = await Review.findById(review._id).populate(reviewPopulate)

  await addNotificationToAdmins({
    type: 'review',
    title: 'Edited review waiting for approval',
    message: `${customer.fullName} updated feedback for booking ${review.bookingNo}.`,
    link: '/admin/reviews'
  })

  return {
    message: 'Review updated and sent for admin approval',
    review: serializeReview(populatedReview)
  }
}

const deleteCustomerReview = async ({ reviewId, customerId }) => {
  if (!isValidObjectId(reviewId)) {
    return { error: 'Invalid review id', statusCode: 400 }
  }

  const review = await Review.findOne({ _id: reviewId, customer: customerId })

  if (!review) {
    return { error: 'Review not found', statusCode: 404 }
  }

  await review.deleteOne()
  await refreshReviewTargetStats(review)

  return { message: 'Review deleted' }
}

const getCustomerDashboard = async () => {
  const reviews = await Review.find({ status: 'approved' })
    .populate(reviewPopulate)
    .sort({ createdAt: -1 })

  const summary = buildReviewSummary(reviews)

  return {
    ...summary,
    newestReviews: reviews.slice(0, 6).map(serializeReview)
  }
}

const listAdminReviews = async () => {
  const reviews = await Review.find()
    .populate(reviewPopulate)
    .sort({ createdAt: -1 })

  return {
    reviews: reviews.map(serializeReview)
  }
}

const updateReviewStatus = async ({ reviewId, adminId, body }) => {
  const status = normalizeReviewStatus(body.status)
  if (!Review.REVIEW_STATUSES.includes(status)) {
    return { error: 'Invalid review status', statusCode: 400 }
  }

  const review = await Review.findById(reviewId)
  if (!review) {
    return { error: 'Review not found', statusCode: 404 }
  }

  review.status = status
  review.reviewedBy = adminId
  review.reviewedAt = new Date()
  review.rejectionReason = status === 'rejected' ? String(body.rejectionReason || '').trim() : ''
  await review.save()
  await refreshReviewTargetStats(review)

  const populatedReview = await Review.findById(review._id).populate(reviewPopulate)

  return {
    message: `Review ${status}`,
    review: serializeReview(populatedReview)
  }
}

const getAdminAnalytics = async () => {
  const [approvedReviews, allReviews, activeDrivers, activeStores] = await Promise.all([
    Review.find({ status: 'approved' }).populate(reviewPopulate).sort({ createdAt: -1 }),
    Review.find().select('status'),
    User.countDocuments(activeProviderRoleQuery('driver')),
    User.countDocuments(activeProviderRoleQuery('staff'))
  ])

  const summary = buildReviewSummary(approvedReviews)

  return {
    ...summary,
    activeDrivers,
    activeStores,
    totalReviews: allReviews.length,
    pendingReviews: allReviews.filter((review) => review.status === 'pending').length,
    rejectedReviews: allReviews.filter((review) => review.status === 'rejected').length,
    newestReviews: approvedReviews.slice(0, 6).map(serializeReview)
  }
}

const buildTargetReviewSummary = (reviews, ratingField) => {
  const ratings = reviews
    .map((review) => getNumericRating(toPlain(review)[ratingField]))
    .filter(Boolean)
  const ratingSum = ratings.reduce((total, rating) => total + rating, 0)

  return {
    ratingAverage: ratings.length ? roundRating(ratingSum / ratings.length) : 0,
    reviewCount: ratings.length
  }
}

const getVehicleReviews = async (vehicleId) => {
  if (!isValidObjectId(vehicleId)) {
    return { error: 'Invalid vehicle id', statusCode: 400 }
  }

  const reviews = await Review.find({
    status: 'approved',
    vehicle: vehicleId,
    vehicleRating: { $gte: 1, $lte: 5 }
  })
    .populate(reviewPopulate)
    .sort({ createdAt: -1 })

  return {
    ...buildTargetReviewSummary(reviews, 'vehicleRating'),
    reviews: reviews.map(serializeReview)
  }
}

const getDriverAdReviews = async (driverAdId) => {
  if (!isValidObjectId(driverAdId)) {
    return { error: 'Invalid driver advertisement id', statusCode: 400 }
  }

  const reviews = await Review.find({
    status: 'approved',
    driverAd: driverAdId,
    driverRating: { $gte: 1, $lte: 5 }
  })
    .populate(reviewPopulate)
    .sort({ createdAt: -1 })

  return {
    ...buildTargetReviewSummary(reviews, 'driverRating'),
    reviews: reviews.map(serializeReview)
  }
}

const getReviewContext = async ({ bookingId, customerId }) => {
  const booking = await Booking.findOne({ _id: bookingId, customer: customerId }).populate(bookingPopulate)

  if (!booking) {
    return { error: 'Booking not found', statusCode: 404 }
  }

  const existingReview = await Review.findOne({ booking: booking._id }).populate(reviewPopulate)
  const driver = getDriverFromBooking(booking)
  const hasDriver = Boolean(driver?._id || driver)
  const hasVehicle = Boolean(booking.vehicle?._id || booking.vehicle)

  return {
    booking: serializeBooking(booking),
    existingReview: existingReview ? serializeReview(existingReview) : null,
    reviewEligibility: {
      canReview: canReviewBooking(booking) && !existingReview && (hasDriver || hasVehicle),
      hasDriver,
      hasVehicle
    }
  }
}

module.exports = {
  createReview,
  listCustomerReviews,
  updateCustomerReview,
  deleteCustomerReview,
  getCustomerDashboard,
  listAdminReviews,
  updateReviewStatus,
  getAdminAnalytics,
  getVehicleReviews,
  getDriverAdReviews,
  getReviewContext,
  serializeReview,
  buildReviewSummary
}
