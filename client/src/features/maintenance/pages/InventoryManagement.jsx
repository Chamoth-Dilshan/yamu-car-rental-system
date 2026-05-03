import { useEffect, useState } from 'react'
import { FaPlus, FaTimes } from 'react-icons/fa'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { formatCurrency, formatDate, getBadgeClass } from '../../../utils/formatters'

const emptyForm = {
  itemName: '',
  quantity: '',
  price: '',
  description: ''
}

export default function InventoryManagement() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/maintenance/inventory', { params: filters })
      .then((res) => {
        setItems(res.data.items || [])
        setStats(res.data.stats || null)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load inventory items'))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  useEffect(() => {
    if (!isItemModalOpen) {
      return undefined
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) {
        setIsItemModalOpen(false)
        setForm(emptyForm)
        setEditingId('')
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, isItemModalOpen])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId('')
  }

  const openAddModal = () => {
    resetForm()
    setMessage('')
    setError('')
    setIsItemModalOpen(true)
  }

  const openEditForm = (item) => {
    setEditingId(item._id)
    setForm({
      itemName: item.itemName || '',
      quantity: item.quantity ?? '',
      price: item.price ?? '',
      description: item.description || ''
    })
    setMessage('')
    setError('')
    setIsItemModalOpen(true)
  }

  const closeItemModal = () => {
    if (busy) {
      return
    }

    setIsItemModalOpen(false)
    resetForm()
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')

    try {
      const payload = {
        itemName: form.itemName,
        quantity: Number(form.quantity || 0),
        price: Number(form.price || 0),
        description: form.description
      }

      if (editingId) {
        await API.put(`/maintenance/inventory/${editingId}`, payload)
      } else {
        await API.post('/maintenance/inventory', payload)
      }

      setMessage(`Inventory item ${editingId ? 'updated' : 'created'} successfully`)
      resetForm()
      setIsItemModalOpen(false)
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save inventory item')
    } finally {
      setBusy(false)
    }
  }

  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this inventory item?')) {
      return
    }

    setBusyAction(itemId)
    setMessage('')
    setError('')

    try {
      await API.delete(`/maintenance/inventory/${itemId}`)
      setMessage('Inventory item deleted')
      if (editingId === itemId) {
        resetForm()
        setIsItemModalOpen(false)
      }
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete inventory item')
    } finally {
      setBusyAction('')
    }
  }

  const summaryCards = [
    { label: 'Inventory Items', value: stats?.totalItems || 0 },
    { label: 'Total Quantity', value: stats?.totalQuantity || 0 },
    { label: 'Low Stock', value: stats?.lowStockCount || 0 },
    { label: 'Stock Value', value: formatCurrency(stats?.inventoryValue || 0) }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Inventory Items</h2>
          <p style={{ color: 'var(--text-light)' }}>Track spare parts and consumables used in vehicle maintenance.</p>
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
              <h3>Inventory List</h3>
              <p style={{ color: 'var(--text-light)' }}>Search stock records, then edit quantities or item details.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={openAddModal}>
              <FaPlus /> Add Item
            </button>
          </div>

          <div className="filter-grid filter-grid-3">
            <input
              value={filters.search}
              placeholder="Search item name or description..."
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '' })}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading inventory items...</div>
          ) : items.length > 0 ? (
            <div className="table-shell" style={{ marginTop: '1.5rem' }}>
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.itemName}</strong>
                        <span>{item.description || 'No description'}</span>
                      </td>
                      <td>
                        <span className={`badge ${getBadgeClass(item.lowStock ? 'unavailable' : 'available')}`}>
                          {item.quantity} units
                        </span>
                        {item.lowStock && <span>Low stock</span>}
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatDate(item.updatedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditForm(item)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={busyAction === item._id}
                            onClick={() => deleteItem(item._id)}
                          >
                            {busyAction === item._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reservation-empty">No inventory items matched the current filters.</div>
          )}
        </section>

        {isItemModalOpen && (
          <div className="payment-modal-overlay" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeItemModal()
            }
          }}>
            <section
              className="form-card payment-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="inventory-item-modal-title"
            >
              <div className="payment-modal-header">
                <div>
                  <h3 id="inventory-item-modal-title">{editingId ? 'Edit Item' : 'Add Item'}</h3>
                  <p>Keep item details current for maintenance records.</p>
                </div>
                <button
                  className="payment-icon-button"
                  type="button"
                  aria-label="Close"
                  onClick={closeItemModal}
                  disabled={busy}
                >
                  <FaTimes />
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={submitForm}>
                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    value={form.itemName}
                    onChange={(e) => setForm((prev) => ({ ...prev, itemName: e.target.value }))}
                    placeholder="Engine oil, brake pads..."
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brand, compatibility, storage notes..."
                  />
                </div>
                <div className="payment-modal-footer">
                  <button className="btn btn-outline" type="button" onClick={closeItemModal} disabled={busy}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    {busy ? 'Saving...' : editingId ? 'Update Item' : 'Create Item'}
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
