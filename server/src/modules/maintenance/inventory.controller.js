const { sendServerError } = require('../../utils/errorResponses')
const {
  listInventoryItems,
  getInventoryItemById: getInventoryItemByIdService,
  createInventoryItem: createInventoryItemService,
  updateInventoryItem: updateInventoryItemService,
  deleteInventoryItem: deleteInventoryItemService
} = require('./inventory.service')

const sendServiceError = (res, result) => (
  res.status(result.statusCode || 400).json({ message: result.error })
)

const getInventoryItems = async (req, res) => {
  try {
    const result = await listInventoryItems({
      ownerId: req.user._id,
      search: req.query.search
    })

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load inventory items')
  }
}

const getInventoryItemById = async (req, res) => {
  try {
    const result = await getInventoryItemByIdService({
      itemId: req.params.id,
      ownerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result.item)
  } catch (error) {
    return sendServerError(res, error, 'Failed to load inventory item')
  }
}

const createInventoryItem = async (req, res) => {
  try {
    const result = await createInventoryItemService({
      ownerId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.status(201).json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to create inventory item')
  }
}

const updateInventoryItem = async (req, res) => {
  try {
    const result = await updateInventoryItemService({
      itemId: req.params.id,
      ownerId: req.user._id,
      body: req.body
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json(result)
  } catch (error) {
    return sendServerError(res, error, 'Failed to update inventory item')
  }
}

const deleteInventoryItem = async (req, res) => {
  try {
    const result = await deleteInventoryItemService({
      itemId: req.params.id,
      ownerId: req.user._id
    })

    if (result.error) {
      return sendServiceError(res, result)
    }

    return res.json({ message: result.message })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete inventory item')
  }
}

module.exports = {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
}
