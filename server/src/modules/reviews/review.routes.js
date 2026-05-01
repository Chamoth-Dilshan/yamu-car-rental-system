const express = require('express')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'reviews',
    message: 'reviews module ready'
  })
})

module.exports = router
