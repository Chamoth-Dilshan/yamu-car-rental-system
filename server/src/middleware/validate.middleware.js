const validate = (validator) => (req, res, next) => {
  if (typeof validator !== 'function') {
    return next()
  }

  const validationResult = validator(req)

  if (validationResult?.error) {
    return res.status(400).json({
      message: validationResult.error.message || 'Validation failed',
      errors: validationResult.error.details || []
    })
  }

  return next()
}

module.exports = validate
