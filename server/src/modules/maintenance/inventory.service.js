const Inventory = require('./inventory.model')
const {
  buildInventoryPayload,
  escapeRegex,
  validateInventoryItemId,
  validateInventorySearch
} = require('./inventory.validation')

const LOW_STOCK_THRESHOLD = 10

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

const buildSearchQuery = (search) => {
  if (!search) {
    return null
  }

  const regex = new RegExp(escapeRegex(search), 'i')

  return {
    $or: [
      { itemName: regex },
      { description: regex }
    ]
  }
}

const listInventoryItems = async ({ ownerId, search = '' } = {}) => {
  const validatedQuery = validateInventorySearch(search)
  const query = { owner: ownerId }
  const searchQuery = buildSearchQuery(validatedQuery.search)
  const items = await Inventory.find(searchQuery ? { ...query, ...searchQuery } : query)
    .sort({ updatedAt: -1 })

  return {
    items: items.map(serializeInventoryItem),
    stats: buildInventoryStats(items)
  }
}

const getInventoryItemById = async ({ itemId, ownerId }) => {
  const itemIdValidation = validateInventoryItemId(itemId)
  if (itemIdValidation.error) {
    return { error: itemIdValidation.error, statusCode: 400 }
  }

  const item = await Inventory.findOne({ _id: itemIdValidation.value, owner: ownerId })

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
  const itemIdValidation = validateInventoryItemId(itemId)
  if (itemIdValidation.error) {
    return { error: itemIdValidation.error, statusCode: 400 }
  }

  const item = await Inventory.findOne({ _id: itemIdValidation.value, owner: ownerId })

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
  const itemIdValidation = validateInventoryItemId(itemId)
  if (itemIdValidation.error) {
    return { error: itemIdValidation.error, statusCode: 400 }
  }

  const item = await Inventory.findOne({ _id: itemIdValidation.value, owner: ownerId })

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
