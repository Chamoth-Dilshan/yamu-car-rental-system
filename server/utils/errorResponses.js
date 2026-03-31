const getPublicError = (error, fallbackMessage = 'Server error') => {
  if (error?.name === 'MongooseServerSelectionError') {
    return {
      status: 503,
      message: 'Database unavailable. Check the MongoDB connection and Atlas IP allowlist, then try again.'
    };
  }

  return {
    status: 500,
    message: error?.message || fallbackMessage
  };
};

const sendServerError = (res, error, fallbackMessage) => {
  const { status, message } = getPublicError(error, fallbackMessage);
  return res.status(status).json({ message });
};

module.exports = {
  getPublicError,
  sendServerError
};
