const Maintenance = require('./maintenance.model')
const Inventory = require('./inventory.model')
const Vehicle = require('../vehicles/vehicle.model')
const { serializeVehicle } = require('../../utils/reservationHelpers')
const { serializeInventoryItem } = require('./inventory.service')
const {
  normalizeMaintenanceStatus,
  toNumber,
  hasBodyField
} = require('./maintenance.validation')

const {
  MAINTENANCE_TYPES,
  MAINTENANCE_STATUSES,
  ACTIVE_MAINTENANCE_STATUSES
} = Maintenance

const isActiveMaintenance = (status) => ACTIVE_MAINTENANCE_STATUSES.includes(status)

const shouldConsumeInventory = (inventoryItem, count, status) => (
  Boolean(inventoryItem) && Number(count || 0) > 0 && status !== 'cancelled'
)

const buildSearchQuery = (search) => {
  if (!search) {
    return null
  }

  const regex = new RegExp(search, 'i')

  return {
    $or: [
      { vehicleName: regex },
      { type: regex },
      { addedThings: regex },
      { inventoryItemName: regex }
    ]
  }
}

const maintenancePopulate = [
  { path: 'vehicle', select: 'vehicleCode name brand model status pricePerDay location' },
  { path: 'inventoryItem', select: 'itemName quantity price description' }
]

const serializeMaintenanceRecord = (record) => {
  const rawRecord = record?.toObject ? record.toObject() : { ...record }

  return {
    _id: rawRecord._id,
    vehicle: serializeVehicle(rawRecord.vehicle),
    vehicleId: rawRecord.vehicle?._id || rawRecord.vehicle,
    vehicleName: rawRecord.vehicleName,
    type: rawRecord.type,
    count: rawRecord.count || 0,
    addedThings: rawRecord.addedThings || '',
    inventoryItem: rawRecord.inventoryItem ? serializeInventoryItem(rawRecord.inventoryItem) : null,
    inventoryItemId: rawRecord.inventoryItem?._id || rawRecord.inventoryItem || '',
    inventoryItemName: rawRecord.inventoryItemName || '',
    inventoryConsumed: Boolean(rawRecord.inventoryConsumed),
    status: rawRecord.status,
    totalCost: rawRecord.totalCost || 0,
    active: isActiveMaintenance(rawRecord.status),
    createdAt: rawRecord.createdAt,
    updatedAt: rawRecord.updatedAt
  }
}

const buildMaintenanceStats = (records) => {
  const activeRecords = records.filter((record) => isActiveMaintenance(record.status))

  return {
    totalRecords: records.length,
    activeCount: activeRecords.length,
    completedCount: records.filter((record) => record.status === 'completed').length,
    cancelledCount: records.filter((record) => record.status === 'cancelled').length,
    unavailableVehicleCount: new Set(activeRecords.map((record) => String(record.vehicle?._id || record.vehicle))).size,
    totalCost: records.reduce((total, record) => total + Number(record.totalCost || 0), 0)
  }
}

const getOwnedVehicle = async (vehicleId, ownerId) => {
  if (!vehicleId) {
    return null
  }

  return Vehicle.findOne({ _id: vehicleId, owner: ownerId })
}

const getOwnedInventoryItem = async (inventoryItemId, ownerId) => {
  if (!inventoryItemId) {
    return null
  }

  return Inventory.findOne({ _id: inventoryItemId, owner: ownerId })
}

const getPreviousVehicleStatus = async (vehicle, ownerId, excludeRecordId) => {
  const existingActiveRecord = await Maintenance.findOne({
    owner: ownerId,
    vehicle: vehicle._id,
    status: { $in: ACTIVE_MAINTENANCE_STATUSES },
    ...(excludeRecordId ? { _id: { $ne: excludeRecordId } } : {})
  })

  if (existingActiveRecord?.previousVehicleStatus) {
    return existingActiveRecord.previousVehicleStatus
  }

  return vehicle.status === 'maintenance' ? 'available' : vehicle.status
}

const restoreVehicleIfClear = async (vehicleId, ownerId, previousVehicleStatus = 'available', excludeRecordId) => {
  if (!vehicleId) {
    return
  }

  const activeRecord = await Maintenance.exists({
    owner: ownerId,
    vehicle: vehicleId,
    status: { $in: ACTIVE_MAINTENANCE_STATUSES },
    ...(excludeRecordId ? { _id: { $ne: excludeRecordId } } : {})
  })

  if (!activeRecord) {
    await Vehicle.updateOne(
      { _id: vehicleId, owner: ownerId, status: 'maintenance' },
      { status: previousVehicleStatus && previousVehicleStatus !== 'maintenance' ? previousVehicleStatus : 'available' }
    )
  }
}

const syncVehicleStatusForRecord = async (record, ownerId, previousVehicleId = null, previousVehicleStatus = 'available') => {
  if (previousVehicleId && String(previousVehicleId) !== String(record.vehicle)) {
    await restoreVehicleIfClear(previousVehicleId, ownerId, previousVehicleStatus, record._id)
  }

  if (isActiveMaintenance(record.status)) {
    await Vehicle.updateOne(
      { _id: record.vehicle, owner: ownerId },
      { status: 'maintenance' }
    )
    return
  }

  await restoreVehicleIfClear(record.vehicle, ownerId, record.previousVehicleStatus, record._id)
}

const validateInventoryAvailability = async ({
  existingRecord,
  inventoryItem,
  count,
  status
}) => {
  const newConsumesInventory = shouldConsumeInventory(inventoryItem?._id, count, status)

  if (!newConsumesInventory) {
    return { inventoryConsumed: false }
  }

  let availableQuantity = Number(inventoryItem.quantity || 0)

  if (
    existingRecord?.inventoryConsumed
    && existingRecord.inventoryItem
    && String(existingRecord.inventoryItem) === String(inventoryItem._id)
  ) {
    availableQuantity += Number(existingRecord.count || 0)
  }

  if (Number(count || 0) > availableQuantity) {
    return { error: `Only ${availableQuantity} inventory units are available for ${inventoryItem.itemName}` }
  }

  return { inventoryConsumed: true }
}

const applyInventoryAdjustment = async ({
  ownerId,
  existingRecord,
  inventoryItem,
  count,
  inventoryConsumed
}) => {
  if (existingRecord?.inventoryConsumed && existingRecord.inventoryItem) {
    await Inventory.updateOne(
      { _id: existingRecord.inventoryItem, owner: ownerId },
      { $inc: { quantity: Number(existingRecord.count || 0) } }
    )
  }

  if (inventoryConsumed && inventoryItem?._id) {
    await Inventory.updateOne(
      { _id: inventoryItem._id, owner: ownerId },
      { $inc: { quantity: -Number(count || 0) } }
    )
  }
}

const buildMaintenancePayload = async ({ ownerId, body }, existingRecord = null) => {
  const vehicleId = body.vehicleId || body.vehicle || existingRecord?.vehicle
  const vehicle = await getOwnedVehicle(vehicleId, ownerId)

  if (!vehicle) {
    return { error: 'Select a vehicle from your store fleet' }
  }

  const status = normalizeMaintenanceStatus(body.status || existingRecord?.status || 'in_progress')

  if (!MAINTENANCE_STATUSES.includes(status)) {
    return { error: 'Invalid maintenance status' }
  }

  const type = String(body.type || existingRecord?.type || 'Routine Service').trim()

  if (!MAINTENANCE_TYPES.includes(type)) {
    return { error: 'Invalid maintenance type' }
  }

  const count = toNumber(body.count ?? existingRecord?.count ?? 0)
  const totalCost = toNumber(body.totalCost ?? body.totcost ?? existingRecord?.totalCost ?? 0)

  if (count < 0) {
    return { error: 'Maintenance quantity cannot be negative' }
  }

  if (totalCost < 0) {
    return { error: 'Maintenance cost cannot be negative' }
  }

  const inventoryFieldSubmitted = (
    hasBodyField(body, 'inventoryItemId')
    || hasBodyField(body, 'inventoryItem')
  )
  const inventoryItemId = inventoryFieldSubmitted
    ? (body.inventoryItemId || body.inventoryItem || '')
    : (existingRecord?.inventoryItem || '')
  const inventoryItem = inventoryItemId
    ? await getOwnedInventoryItem(inventoryItemId, ownerId)
    : null

  if (inventoryItemId && !inventoryItem) {
    return { error: 'Selected inventory item was not found' }
  }

  const inventoryAvailability = await validateInventoryAvailability({
    existingRecord,
    inventoryItem,
    count,
    status
  })

  if (inventoryAvailability.error) {
    return { error: inventoryAvailability.error }
  }

  const sameVehicleAsExistingRecord = existingRecord
    && String(existingRecord.vehicle) === String(vehicle._id)
  const previousVehicleStatus = isActiveMaintenance(status)
    ? (
      sameVehicleAsExistingRecord && existingRecord.previousVehicleStatus
        ? existingRecord.previousVehicleStatus
        : await getPreviousVehicleStatus(vehicle, ownerId, existingRecord?._id)
    )
    : (existingRecord?.previousVehicleStatus || 'available')

  return {
    payload: {
      vehicle: vehicle._id,
      vehicleName: `${vehicle.name} (${vehicle.vehicleCode})`,
      type,
      count,
      addedThings: String(body.addedThings ?? body.addedthings ?? existingRecord?.addedThings ?? '').trim(),
      inventoryItem: inventoryItem?._id || null,
      inventoryItemName: inventoryItem?.itemName || '',
      inventoryConsumed: inventoryAvailability.inventoryConsumed,
      status,
      totalCost,
      previousVehicleStatus
    },
    inventoryItem
  }
}

const listMaintenanceRecords = async ({ ownerId, status, search = '' } = {}) => {
  const query = { owner: ownerId }
  const searchQuery = buildSearchQuery(search)

  if (status && status !== 'all') {
    query.status = normalizeMaintenanceStatus(status)
  }

  const records = await Maintenance.find(searchQuery ? { ...query, ...searchQuery } : query)
    .populate(maintenancePopulate)
    .sort({ updatedAt: -1 })

  return {
    records: records.map(serializeMaintenanceRecord),
    stats: buildMaintenanceStats(records)
  }
}

const getMaintenanceRecordById = async ({ recordId, ownerId }) => {
  const record = await Maintenance.findOne({ _id: recordId, owner: ownerId })
    .populate(maintenancePopulate)

  if (!record) {
    return { error: 'Maintenance record not found', statusCode: 404 }
  }

  return { record: serializeMaintenanceRecord(record) }
}

const createMaintenanceRecord = async ({ ownerId, body }) => {
  const { payload, error, inventoryItem } = await buildMaintenancePayload({ ownerId, body })

  if (error) {
    return { error, statusCode: 400 }
  }

  await applyInventoryAdjustment({
    ownerId,
    inventoryItem,
    count: payload.count,
    inventoryConsumed: payload.inventoryConsumed
  })

  const record = await Maintenance.create({
    ...payload,
    owner: ownerId
  })

  await syncVehicleStatusForRecord(record, ownerId)

  const createdRecord = await Maintenance.findById(record._id).populate(maintenancePopulate)

  return {
    message: payload.status === 'cancelled'
      ? 'Maintenance record created'
      : 'Maintenance record created and vehicle availability updated',
    record: serializeMaintenanceRecord(createdRecord)
  }
}

const updateMaintenanceRecord = async ({ recordId, ownerId, body }) => {
  const record = await Maintenance.findOne({ _id: recordId, owner: ownerId })

  if (!record) {
    return { error: 'Maintenance record not found', statusCode: 404 }
  }

  const previousVehicleId = record.vehicle
  const previousVehicleStatus = record.previousVehicleStatus
  const existingRecordSnapshot = record.toObject()
  const { payload, error, inventoryItem } = await buildMaintenancePayload({ ownerId, body }, record)

  if (error) {
    return { error, statusCode: 400 }
  }

  await applyInventoryAdjustment({
    ownerId,
    existingRecord: existingRecordSnapshot,
    inventoryItem,
    count: payload.count,
    inventoryConsumed: payload.inventoryConsumed
  })

  Object.assign(record, payload)
  await record.save()
  await syncVehicleStatusForRecord(record, ownerId, previousVehicleId, previousVehicleStatus)

  const updatedRecord = await Maintenance.findById(record._id).populate(maintenancePopulate)

  return {
    message: 'Maintenance record updated',
    record: serializeMaintenanceRecord(updatedRecord)
  }
}

const deleteMaintenanceRecord = async ({ recordId, ownerId }) => {
  const record = await Maintenance.findOne({ _id: recordId, owner: ownerId })

  if (!record) {
    return { error: 'Maintenance record not found', statusCode: 404 }
  }

  const vehicleId = record.vehicle
  const previousVehicleStatus = record.previousVehicleStatus

  if (record.inventoryConsumed && record.inventoryItem) {
    await Inventory.updateOne(
      { _id: record.inventoryItem, owner: ownerId },
      { $inc: { quantity: Number(record.count || 0) } }
    )
  }

  await record.deleteOne()
  await restoreVehicleIfClear(vehicleId, ownerId, previousVehicleStatus)

  return { message: 'Maintenance record deleted' }
}

module.exports = {
  ACTIVE_MAINTENANCE_STATUSES,
  serializeMaintenanceRecord,
  listMaintenanceRecords,
  getMaintenanceRecordById,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord
}
