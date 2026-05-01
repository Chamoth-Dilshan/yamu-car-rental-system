const express = require('express')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'promotions',
    message: 'promotions module ready'
  })
})

module.exports = router
