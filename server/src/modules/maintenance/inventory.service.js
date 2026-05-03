const Inventory = require('./inventory.model')

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

const listInventoryItems = async ({ ownerId, search = '' } = {}) => {
  const query = { owner: ownerId }
  const searchQuery = buildSearchQuery(search)
  const items = await Inventory.find(searchQuery ? { ...query, ...searchQuery } : query)
    .sort({ updatedAt: -1 })

  return {
    items: items.map(serializeInventoryItem),
    stats: buildInventoryStats(items)
  }
}

const getInventoryItemById = async ({ itemId, ownerId }) => {
  const item = await Inventory.findOne({ _id: itemId, owner: ownerId })

  if (!item) {
    return { error: 'Inventory item not found', statusCode: 404 }
  }

  return { item: serializeInventoryItem(item) }
}

const createInventoryItem = async ({ ownerId, body }) => {
  const { payload, error } = buildInventoryPayload(body)

  if (error) {
    return { error, statusCode: 400 }
  }

  const item = await Inventory.create({
    ...payload,
    owner: ownerId
  })

  return {
    message: 'Inventory item created successfully',
    item: serializeInventoryItem(item)
  }
}

const updateInventoryItem = async ({ itemId, ownerId, body }) => {
  const item = await Inventory.findOne({ _id: itemId, owner: ownerId })

  if (!item) {
    return { error: 'Inventory item not found', statusCode: 404 }
  }

  const { payload, error } = buildInventoryPayload(body)

  if (error) {
    return { error, statusCode: 400 }
  }

  Object.assign(item, payload)
  await item.save()

  return {
    message: 'Inventory item updated successfully',
    item: serializeInventoryItem(item)
  }
}

const deleteInventoryItem = async ({ itemId, ownerId }) => {
  const item = await Inventory.findOne({ _id: itemId, owner: ownerId })

  if (!item) {
    return { error: 'Inventory item not found', statusCode: 404 }
  }

  await item.deleteOne()

  return { message: 'Inventory item deleted' }
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  serializeInventoryItem,
  listInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
}
