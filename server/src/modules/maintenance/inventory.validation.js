const mongoose = require('mongoose')

const MAX_SEARCH_LENGTH = 100
const MAX_TEXT_LENGTH = 500

const trimValue = (value = '') => String(value || '').trim()

const escapeRegex = (value = '') => trimValue(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

const validateInventoryItemId = (itemId) => {
  const id = trimValue(itemId)

  if (!id) {
    return { error: 'Inventory item ID is required' }
  }

  if (!mongoose.isValidObjectId(id)) {
    return { error: 'Invalid inventory item ID' }
  }

  return { value: id }
}

const validateInventorySearch = (search = '') => ({
  search: trimValue(search).slice(0, MAX_SEARCH_LENGTH)
})

const buildInventoryPayload = (body = {}) => {
  const itemName = trimValue(body.itemName || body.itemname)
  const quantity = toNumber(body.quantity)
  const price = toNumber(body.price)
  const description = trimValue(body.description)

  if (!itemName) {
    return { error: 'Inventory item name is required' }
  }

  if (itemName.length > 120) {
    return { error: 'Inventory item name must be 120 characters or fewer' }
  }

  if (quantity < 0) {
    return { error: 'Inventory quantity cannot be negative' }
  }

  if (price < 0) {
    return { error: 'Inventory price cannot be negative' }
  }

  if (description.length > MAX_TEXT_LENGTH) {
    return { error: `Inventory description must be ${MAX_TEXT_LENGTH} characters or fewer` }
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

module.exports = {
  buildInventoryPayload,
  escapeRegex,
  toNumber,
  validateInventoryItemId,
  validateInventorySearch
}
