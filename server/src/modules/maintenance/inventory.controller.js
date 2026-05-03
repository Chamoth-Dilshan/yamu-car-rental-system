const Inventory = require('./inventory.model')
const { sendServerError } = require('../../utils/errorResponses')

const LOW_STOCK_THRESHOLD = 10

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const serializeInventoryItem = (item) => {
  const rawItem = item?.toObject ? item.toObject() : { ...item }

  return {
    _id: rawItem._id,
    itemName: rawItem.itemName,
    quantity: rawItem.quantity,
    price: rawItem.price,
    description: rawItem.description || '',
    lowStock: Number(rawItem.quantity || 0) < LOW_STOCK_THRESHOLD,
    createdAt: rawItem.createdAt,
    updatedAt: rawItem.updatedAt
  }
}

const buildInventoryStats = (items) => ({
  totalItems: items.length,
  lowStockCount: items.filter((item) => Number(item.quantity || 0) < LOW_STOCK_THRESHOLD).length,
  totalQuantity: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
  inventoryValue: items.reduce((total, item) => total + (Number(item.quantity || 0) * Number(item.price || 0)), 0)
})

const buildInventoryPayload = (body) => {
  const itemName = String(body.itemName || body.itemname || '').trim()
  const quantity = toNumber(body.quantity)
  const price = toNumber(body.price)
  const description = String(body.description || '').trim()

  if (!itemName) {
    return { error: 'Inventory item name is required' }
  }

  if (quantity < 0) {
    return { error: 'Inventory quantity cannot be negative' }
  }

  if (price < 0) {
    return { error: 'Inventory price cannot be negative' }
  }

  return {
    payload: {
      itemName,
      quantity,
      price,
      description
    }
  }
}

const buildSearchQuery = (search) => {
  if (!search) {
    return null
  }

  const regex = new RegExp(search, 'i')

  return {
    $or: [
      { itemName: regex },
      { description: regex }
    ]
  }
}

const getInventoryItems = async (req, res) => {
  try {
    const { search = '' } = req.query
    const query = { owner: req.user._id }
    const searchQuery = buildSearchQuery(search)
    const items = await Inventory.find(searchQuery ? { ...query, ...searchQuery } : query)
      .sort({ updatedAt: -1 })

    res.json({
      items: items.map(serializeInventoryItem),
      stats: buildInventoryStats(items)
    })
  } catch (error) {
    sendServerError(res, error, 'Failed to load inventory items')
  }
}

const getInventoryItemById = async (req, res) => {
  try {
    const item = await Inventory.findOne({ _id: req.params.id, owner: req.user._id })

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' })
    }

    return res.json(serializeInventoryItem(item))
  } catch (error) {
    return sendServerError(res, error, 'Failed to load inventory item')
  }
}

const createInventoryItem = async (req, res) => {
  try {
    const { payload, error } = buildInventoryPayload(req.body)

    if (error) {
      return res.status(400).json({ message: error })
    }

    const item = await Inventory.create({
      ...payload,
      owner: req.user._id
    })

    return res.status(201).json({
      message: 'Inventory item created successfully',
      item: serializeInventoryItem(item)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to create inventory item')
  }
}

const updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({ _id: req.params.id, owner: req.user._id })

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' })
    }

    const { payload, error } = buildInventoryPayload(req.body)

    if (error) {
      return res.status(400).json({ message: error })
    }

    Object.assign(item, payload)
    await item.save()

    return res.json({
      message: 'Inventory item updated successfully',
      item: serializeInventoryItem(item)
    })
  } catch (error) {
    return sendServerError(res, error, 'Failed to update inventory item')
  }
}

const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({ _id: req.params.id, owner: req.user._id })

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' })
    }

    await item.deleteOne()

    return res.json({ message: 'Inventory item deleted' })
  } catch (error) {
    return sendServerError(res, error, 'Failed to delete inventory item')
  }
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  serializeInventoryItem,
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
}
