import { useEffect, useMemo, useState } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { formatCurrency, formatDate, getBadgeClass } from '../../../utils/formatters'

const emptyForm = {
  vehicleId: '',
  type: 'Routine Service',
  inventoryItemId: '',
  count: '',
  addedThings: '',
  status: 'in_progress',
  totalCost: ''
}

const statusLabels = {
  all: 'All Statuses',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

const maintenanceTypes = ['Routine Service', 'Repair', 'Inspection', 'Other']

const formatStatusLabel = (status) => statusLabels[status] || status

export default function MaintenanceManagement() {
  const [records, setRecords] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all'
  })
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [referenceLoading, setReferenceLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/maintenance', { params: filters })
      .then((res) => {
        setRecords(res.data.records || [])
        setStats(res.data.stats || null)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load maintenance records'))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  useEffect(() => {
    setReferenceLoading(true)

    Promise.all([
      API.get('/vehicles/mine/list'),
      API.get('/maintenance/inventory')
    ])
      .then(([vehiclesRes, inventoryRes]) => {
        setVehicles(vehiclesRes.data.vehicles || [])
        setInventoryItems(inventoryRes.data.items || [])
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load maintenance form data'))
      .finally(() => setReferenceLoading(false))
  }, [reloadKey])

  const selectedInventoryItem = useMemo(() => (
    inventoryItems.find((item) => item._id === form.inventoryItemId) || null
  ), [form.inventoryItemId, inventoryItems])

  useEffect(() => {
    if (!isRecordModalOpen) {
      return undefined
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) {
        setIsRecordModalOpen(false)
        setForm(emptyForm)
        setEditingId('')
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, isRecordModalOpen])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId('')
  }

  const openAddModal = () => {
    resetForm()
    setMessage('')
    setError('')
    setIsRecordModalOpen(true)
  }

  const openEditForm = (record) => {
    setEditingId(record._id)
    setForm({
      vehicleId: record.vehicleId || record.vehicle?._id || '',
      type: record.type || 'Routine Service',
      inventoryItemId: record.inventoryItemId || record.inventoryItem?._id || '',
      count: record.count ?? '',
      addedThings: record.addedThings || '',
      status: record.status || 'in_progress',
      totalCost: record.totalCost ?? ''
    })
    setMessage('')
    setError('')
    setIsRecordModalOpen(true)
  }

  const closeRecordModal = () => {
    if (busy) {
      return
    }

    setIsRecordModalOpen(false)
    resetForm()
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')

    try {
      const payload = {
        vehicleId: form.vehicleId,
        type: form.type,
        inventoryItemId: form.inventoryItemId,
        count: Number(form.count || 0),
        addedThings: form.addedThings,
        status: form.status,
        totalCost: Number(form.totalCost || 0)
      }

      if (editingId) {
        await API.put(`/maintenance/${editingId}`, payload)
      } else {
        await API.post('/maintenance', payload)
      }

      setMessage(`Maintenance record ${editingId ? 'updated' : 'created'} successfully`)
      resetForm()
      setIsRecordModalOpen(false)
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save maintenance record')
    } finally {
      setBusy(false)
    }
  }

  const deleteRecord = async (recordId) => {
    if (!window.confirm('Delete this maintenance record?')) {
      return
    }

    setBusyAction(recordId)
    setMessage('')
    setError('')

    try {
      await API.delete(`/maintenance/${recordId}`)
      setMessage('Maintenance record deleted')
      if (editingId === recordId) {
        resetForm()
        setIsRecordModalOpen(false)
      }
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete maintenance record')
    } finally {
      setBusyAction('')
    }
  }

  const summaryCards = [
    { label: 'Maintenance Records', value: stats?.totalRecords || 0 },
    { label: 'Active Maintenance', value: stats?.activeCount || 0 },
    { label: 'Unavailable Vehicles', value: stats?.unavailableVehicleCount || 0 },
    { label: 'Total Cost', value: formatCurrency(stats?.totalCost || 0) }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Maintenance Records</h2>
          <p style={{ color: 'var(--text-light)' }}>Record vehicle service work and mark vehicles unavailable while maintenance is active.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          {summaryCards.map((item) => (
            <div key={item.label} className="stat-card">
              <div className="stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Service History</h3>
              <p style={{ color: 'var(--text-light)' }}>Filter maintenance records by vehicle, inventory item, or status.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={openAddModal}>
              <FaPlus /> Add Record
            </button>
          </div>

          <div className="filter-grid filter-grid-3">
            <input
              value={filters.search}
              placeholder="Search vehicle, type, parts..."
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', status: 'all' })}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading maintenance records...</div>
          ) : records.length > 0 ? (
            <div className="table-shell" style={{ marginTop: '1.5rem' }}>
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Inventory / Parts</th>
                    <th>Status</th>
                    <th>Cost</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong>{record.vehicle?.name || record.vehicleName}</strong>
                        <span>{record.vehicle?.vehicleCode || 'Vehicle code pending'}</span>
                        {record.active && <span>Vehicle unavailable</span>}
                      </td>
                      <td>{record.type}</td>
                      <td>
                        <strong>{record.inventoryItemName || 'No inventory item'}</strong>
                        <span>{record.addedThings || 'No parts note'}</span>
                        <span>Quantity / count: {record.count}</span>
                      </td>
                      <td>
                        <span className={`badge ${getBadgeClass(record.status)}`}>
                          {formatStatusLabel(record.status)}
                        </span>
                        {record.vehicle?.status && <span>Fleet status: {record.vehicle.status}</span>}
                      </td>
                      <td>{formatCurrency(record.totalCost)}</td>
                      <td>{formatDate(record.updatedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditForm(record)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={busyAction === record._id}
                            onClick={() => deleteRecord(record._id)}
                          >
                            {busyAction === record._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reservation-empty">No maintenance records matched the current filters.</div>
          )}
        </section>

        {isRecordModalOpen && (
          <div className="payment-modal-overlay" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRecordModal()
            }
          }}>
            <section
              className="form-card payment-modal maintenance-record-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="maintenance-record-modal-title"
            >
              <div className="payment-modal-header">
                <div>
                  <h3 id="maintenance-record-modal-title">{editingId ? 'Edit Record' : 'Add Record'}</h3>
                  <p>Active records change the selected vehicle status to maintenance.</p>
                </div>
                <button
                  className="payment-icon-button"
                  type="button"
                  aria-label="Close"
                  onClick={closeRecordModal}
                  disabled={busy}
                >
                  <FaTimes />
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={submitForm}>
                <div className="form-group">
                  <label>Vehicle</label>
                  <select
                    value={form.vehicleId}
                    onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                    disabled={referenceLoading}
                    required
                  >
                    <option value="">{referenceLoading ? 'Loading vehicles...' : 'Select vehicle'}</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.name} - {vehicle.vehicleCode} ({vehicle.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                      {maintenanceTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Inventory Item</label>
                  <select
                    value={form.inventoryItemId}
                    onChange={(e) => setForm((prev) => ({ ...prev, inventoryItemId: e.target.value }))}
                  >
                    <option value="">No inventory item</option>
                    {inventoryItems.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.itemName} ({item.quantity} units)
                      </option>
                    ))}
                  </select>
                  {selectedInventoryItem && (
                    <small className="form-help">
                      Available: {selectedInventoryItem.quantity} units at {formatCurrency(selectedInventoryItem.price)}
                    </small>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity / Count</label>
                    <input
                      type="number"
                      min="0"
                      value={form.count}
                      onChange={(e) => setForm((prev) => ({ ...prev, count: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.totalCost}
                      onChange={(e) => setForm((prev) => ({ ...prev, totalCost: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Parts Added / Notes</label>
                  <textarea
                    rows="4"
                    value={form.addedThings}
                    onChange={(e) => setForm((prev) => ({ ...prev, addedThings: e.target.value }))}
                    placeholder="Oil filter, brake pads, service notes..."
                  />
                </div>

                <div className="payment-modal-footer">
                  <button className="btn btn-outline" type="button" onClick={closeRecordModal} disabled={busy}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={busy || referenceLoading}>
                    {busy ? 'Saving...' : editingId ? 'Update Record' : 'Create Record'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
