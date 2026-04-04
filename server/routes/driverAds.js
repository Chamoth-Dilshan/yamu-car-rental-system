const express = require('express')
const {
  getDriverAds,
  getDriverAdById,
  getMyDriverAds,
  createDriverAd,
  updateDriverAd,
  deleteDriverAd
} = require('../controllers/driverAdController')
const { protect, authorize } = require('../middleware/auth')
const upload = require('../middleware/upload')

const router = express.Router()

router.get('/', getDriverAds)
router.get('/mine/list', protect, authorize('driver'), getMyDriverAds)
router.get('/:id', getDriverAdById)
router.post(
  '/',
  protect,
  authorize('driver'),
  (req, res, next) => { req.uploadDir = 'driver-ads'; next() },
  upload.single('photo'),
  createDriverAd
)
router.put(
  '/:id',
  protect,
  authorize('driver'),
  (req, res, next) => { req.uploadDir = 'driver-ads'; next() },
  upload.single('photo'),
  updateDriverAd
)
router.delete('/:id', protect, authorize('driver'), deleteDriverAd)

module.exports = router
