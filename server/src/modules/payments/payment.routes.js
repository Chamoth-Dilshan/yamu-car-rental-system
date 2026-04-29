const express = require('express')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'payments',
    message: 'payments module ready'
  })
})

module.exports = router
