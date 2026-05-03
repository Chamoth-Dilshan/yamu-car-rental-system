const { sendServerError } = require('../../utils/errorResponses')
const {
  removeUploadedFiles,
  sendProtectedUpload
} = require('../../utils/fileHelpers')
const {
  getProfile: getProfileService,
  getMyRoleHistory: getMyRoleHistoryService,
  updateProfile: updateProfileService,
  updateDriverProfile: updateDriverProfileService,
  updateStaffProfile: updateStaffProfileService,
  updateAdminProfile: updateAdminProfileService,
  applyForProviderRole: applyForProviderRoleService,
  withdrawProviderApplication: withdrawProviderApplicationService,
  getProviderDocument,
  getNotifications: getNotificationsService,
  markNotificationRead: markNotificationReadService,
  markAllNotificationsRead: markAllNotificationsReadService
} = require('./user.service')
const { parseStructuredBody } = require('./user.validation')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const handleProfileError = (res, error, fallbackMessage) => {
  if (error.code === 11000 || error.message === 'Email or username is already in use') {
    return res.status(400).json({ message: 'Email or username is already in use' })
  }

  if (
    error.message?.includes('must be a valid email address')
    || error.message?.includes('must be 3-30 characters')
    || error.message?.includes('is required')
  ) {
    return res.status(400).json({ message: error.message })
  }

  return sendServerError(res, error, fallbackMessage)
}

const getProfile = async (req, res) => {
  try {
    const result = await getProfileService(req.user._id)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.user)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load profile')
  }
}

const getMyRoleHistory = async (req, res) => {
  try {
    const result = await getMyRoleHistoryService({
      userId: req.user._id,
      limit: req.query.limit
    })

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load role history')
  }
}

const updateProfile = async (req, res) => {
  try {
    const result = await updateProfileService({
      userId: req.user._id,
      body: req.body,
      file: req.file
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.user)
  } catch (error) {
    return handleProfileError(res, error, 'Failed to update profile')
  }
}

const updateDriverProfile = async (req, res) => {
  try {
    const parsedBody = parseStructuredBody(req.body)
    if (parsedBody.error) {
      removeUploadedFiles(req.files)
      return res.status(400).json({ message: parsedBody.error })
    }

    const result = await updateDriverProfileService({
      userId: req.user._id,
      payload: parsedBody.payload,
      files: req.files,
      uploadDir: req.uploadDir
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update driver profile')
  }
}

const updateStaffProfile = async (req, res) => {
  try {
    const parsedBody = parseStructuredBody(req.body)
    if (parsedBody.error) {
      removeUploadedFiles(req.files)
      return res.status(400).json({ message: parsedBody.error })
    }

    const result = await updateStaffProfileService({
      userId: req.user._id,
      payload: parsedBody.payload,
      files: req.files,
      uploadDir: req.uploadDir
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update store profile')
  }
}

const updateAdminProfile = async (req, res) => {
  try {
    const result = await updateAdminProfileService({
      userId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update admin profile')
  }
}

const applyForProviderRole = async (req, res) => {
  try {
    const parsedBody = parseStructuredBody(req.body)
    if (parsedBody.error) {
      removeUploadedFiles(req.files)
      return res.status(400).json({ message: parsedBody.error })
    }

    const result = await applyForProviderRoleService({
      userId: req.user._id,
      roleKey: req.params.roleKey,
      payload: parsedBody.payload,
      files: req.files,
      uploadDir: req.uploadDir
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to submit provider application')
  }
}

const withdrawProviderApplication = async (req, res) => {
  try {
    const result = await withdrawProviderApplicationService({
      userId: req.user._id,
      roleKey: req.params.roleKey
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to withdraw provider application')
  }
}

const getNotifications = async (req, res) => {
  try {
    const result = await getNotificationsService(req.user._id)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load notifications')
  }
}

const getMyProviderDocument = async (req, res) => {
  try {
    const result = await getProviderDocument({
      userId: req.user._id,
      roleKey: req.params.roleKey,
      documentKey: req.params.documentKey
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return sendProtectedUpload(res, result.document)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load document')
  }
}

const markNotificationRead = async (req, res) => {
  try {
    const result = await markNotificationReadService({
      userId: req.user._id,
      notificationId: req.params.notificationId
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update notification')
  }
}

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markAllNotificationsReadService(req.user._id)

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update notifications')
  }
}

module.exports = {
  getProfile,
  getMyRoleHistory,
  updateProfile,
  updateDriverProfile,
  updateStaffProfile,
  updateAdminProfile,
  applyForProviderRole,
  withdrawProviderApplication,
  getMyProviderDocument,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
}
