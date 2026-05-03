const { sendServerError } = require('../../utils/errorResponses')
const { sendProtectedUpload } = require('../../utils/fileHelpers')
const {
  listUsers,
  getUserRoleHistory: getUserRoleHistoryService,
  getUserProviderDocument: getUserProviderDocumentService,
  updateUser: updateUserService,
  reviewProviderApplication: reviewProviderApplicationService,
  deactivateUser: deactivateUserService,
  restoreUser: restoreUserService
} = require('./admin.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getAllUsers = async (_req, res) => {
  try {
    const users = await listUsers()
    return res.json(users)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load users')
  }
}

const getUserRoleHistory = async (req, res) => {
  try {
    const result = await getUserRoleHistoryService({
      userId: req.params.id,
      limit: req.query.limit
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load role history')
  }
}

const getUserProviderDocument = async (req, res) => {
  try {
    const result = await getUserProviderDocumentService({
      userId: req.params.id,
      roleKey: req.params.roleKey,
      documentKey: req.params.documentKey
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return sendProtectedUpload(res, result.document)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load provider document')
  }
}

const updateUser = async (req, res) => {
  try {
    const result = await updateUserService({
      targetUserId: req.params.id,
      actorUserId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.user)
  } catch (error) {
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

    return sendServerError(res, error, 'Failed to update user')
  }
}

const reviewProviderApplication = async (req, res) => {
  try {
    const result = await reviewProviderApplicationService({
      targetUserId: req.params.id,
      actorUserId: req.user._id,
      roleKey: req.params.roleKey,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to review provider application')
  }
}

const deactivateUser = async (req, res) => {
  try {
    const result = await deactivateUserService({
      targetUserId: req.params.id,
      actorUserId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to deactivate user')
  }
}

const restoreUser = async (req, res) => {
  try {
    const result = await restoreUserService({
      targetUserId: req.params.id,
      actorUserId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to restore user')
  }
}

module.exports = {
  getAllUsers,
  getUserRoleHistory,
  getUserProviderDocument,
  updateUser,
  reviewProviderApplication,
  deactivateUser,
  restoreUser
}
