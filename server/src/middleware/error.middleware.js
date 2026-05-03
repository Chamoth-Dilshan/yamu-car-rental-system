const { sendServerError } = require('../utils/errorResponses')

const errorMiddleware = (error, req, res, next) => {
  if (!error) {
    return next()
  }

  return sendServerError(res, error, 'Server error')
}

module.exports = errorMiddleware
