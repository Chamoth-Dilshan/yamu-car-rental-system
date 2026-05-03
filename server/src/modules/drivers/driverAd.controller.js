const { sendServerError } = require('../../utils/errorResponses')
const {
  listPublicDriverAds,
  getPublicDriverAdById,
  listDriverAdsForDriver,
  createDriverAd: createDriverAdService,
  updateDriverAd: updateDriverAdService,
  deleteDriverAd: deleteDriverAdService
} = require('./driverAd.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getDriverAds = async (req, res) => {
  try {
    const ads = await listPublicDriverAds(req.query)
    res.json({ ads })
  } catch (error) {
    sendServerError(res, error, 'Failed to load driver advertisements')
  }
}

const getDriverAdById = async (req, res) => {
  try {
    const result = await getPublicDriverAdById(req.params.id)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.ad)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load driver advertisement')
  }
}

const getMyDriverAds = async (req, res) => {
  try {
    const result = await listDriverAdsForDriver({
      driverId: req.user._id,
      ...req.query
    })

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load your driver advertisements')
  }
}

const createDriverAd = async (req, res) => {
  try {
    const result = await createDriverAdService({
      user: req.user,
      body: req.body,
      file: req.file
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to create driver advertisement')
  }
}

const updateDriverAd = async (req, res) => {
  try {
    const result = await updateDriverAdService({
      adId: req.params.id,
      user: req.user,
      body: req.body,
      file: req.file
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update driver advertisement')
  }
}

const deleteDriverAd = async (req, res) => {
  try {
    const result = await deleteDriverAdService({
      adId: req.params.id,
      driverId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json({ message: result.message })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete driver advertisement')
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
