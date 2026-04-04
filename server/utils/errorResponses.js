const getPublicError = (error, fallbackMessage = 'Server error') => {
  if (error?.name === 'MongooseServerSelectionError') {
    return {
      status: 503,
      message: 'Database unavailable. Check the MongoDB connection and Atlas IP allowlist, then try again.'
    };
  }

  if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        status: 400,
        message: 'Each uploaded image must be 5 MB or smaller.'
      };
    }

    return {
      status: 400,
      message: error.message || 'File upload failed.'
    };
  }

  if (error?.message === 'Only image files are allowed') {
    return {
      status: 400,
      message: error.message
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
