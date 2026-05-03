const { sendServerError } = require('../../utils/errorResponses')
const {
  createReview: createReviewService,
  listCustomerReviews,
  updateCustomerReview,
  deleteCustomerReview,
  getCustomerDashboard: getCustomerDashboardService,
  listAdminReviews,
  updateReviewStatus: updateReviewStatusService,
  getAdminAnalytics: getAdminAnalyticsService,
  getVehicleReviews: getVehicleReviewsService,
  getDriverAdReviews: getDriverAdReviewsService,
  getReviewContext,
  serializeReview,
  buildReviewSummary
} = require('./review.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const createReview = async (req, res) => {
  try {
    const result = await createReviewService({
      customer: req.user,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A review has already been submitted for this booking' })
    }

    return sendServerError(res, error, 'Failed to submit review')
  }
}

const getMyReviews = async (req, res) => {
  try {
    const result = await listCustomerReviews(req.user._id)
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load your reviews')
  }
}

const updateMyReview = async (req, res) => {
  try {
    const result = await updateCustomerReview({
      reviewId: req.params.id,
      customer: req.user,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update review')
  }
}

const deleteMyReview = async (req, res) => {
  try {
    const result = await deleteCustomerReview({
      reviewId: req.params.id,
      customerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json({ message: result.message })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete review')
  }
}

const getCustomerDashboard = async (_req, res) => {
  try {
    const result = await getCustomerDashboardService()
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load customer dashboard')
  }
}

const getAdminReviews = async (_req, res) => {
  try {
    const result = await listAdminReviews()
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load reviews')
  }
}

const updateReviewStatus = async (req, res) => {
  try {
    const result = await updateReviewStatusService({
      reviewId: req.params.id,
      adminId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update review')
  }
}

const getAdminAnalytics = async (_req, res) => {
  try {
    const result = await getAdminAnalyticsService()
    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load review analytics')
  }
}

const getVehicleReviews = async (req, res) => {
  try {
    const result = await getVehicleReviewsService(req.params.vehicleId)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load vehicle reviews')
  }
}

const getDriverAdReviews = async (req, res) => {
  try {
    const result = await getDriverAdReviewsService(req.params.driverAdId)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load driver reviews')
  }
}

const getMyReviewContext = async (req, res) => {
  try {
    const result = await getReviewContext({
      bookingId: req.params.bookingId,
      customerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load review context')
  }
}

module.exports = {
  createReview,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
  getCustomerDashboard,
  getAdminReviews,
  updateReviewStatus,
  getAdminAnalytics,
  getVehicleReviews,
  getDriverAdReviews,
  getMyReviewContext,
  serializeReview,
  buildReviewSummary
}
