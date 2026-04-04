const express = require('express')
const {
  getVehicles,
  getVehicleById,
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController')
const { protect, authorize } = require('../middleware/auth')
const upload = require('../middleware/upload')

const router = express.Router()

router.get('/', getVehicles)
router.get('/mine/list', protect, authorize('staff'), getMyVehicles)
router.post(
  '/',
  protect,
  authorize('staff'),
  (req, res, next) => { req.uploadDir = 'vehicles'; next() },
  upload.array('images', 6),
  createVehicle
)
router.put(
  '/:id',
  protect,
  authorize('staff'),
  (req, res, next) => { req.uploadDir = 'vehicles'; next() },
  upload.array('images', 6),
  updateVehicle
)
router.delete('/:id', protect, authorize('staff'), deleteVehicle)
router.get('/:id', getVehicleById)

module.exports = router
