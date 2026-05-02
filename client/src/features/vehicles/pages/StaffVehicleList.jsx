import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { formatCurrency, formatDate, getBadgeClass } from '../../../utils/formatters'

export default function StaffVehicleList() {
  const [vehicles, setVehicles] = useState([])
  const [stats, setStats] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all'
  })
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/vehicles/mine/list', { params: filters })
      .then((res) => {
        setVehicles(res.data.vehicles || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your vehicles'))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  const deleteVehicle = async (vehicleId) => {
    if (!window.confirm('Delete this vehicle listing?')) {
      return
    }

    setBusyAction(vehicleId)
    setMessage('')
    setError('')

    try {
      await API.delete(`/vehicles/${vehicleId}`)
      setMessage('Vehicle deleted')
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete vehicle')
    } finally {
      setBusyAction('')
    }
  }

  const summaryCards = [
    { label: 'Total Vehicles', value: stats?.totalVehicles || 0 },
    { label: 'Available', value: stats?.availableCount || 0 },
    { label: 'Reserved', value: stats?.reservedCount || 0 },
    { label: 'Maintenance', value: stats?.maintenanceCount || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>My Vehicles</h2>
          <p style={{ color: 'var(--text-light)' }}>Create and manage the store vehicle listings customers can reserve.</p>
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
              <h3>Vehicle Listings</h3>
              <p style={{ color: 'var(--text-light)' }}>Filter by status, then edit or remove vehicle listings from the store workspace.</p>
            </div>
            <Link className="btn btn-primary btn-sm" to="/staff/vehicles/new">Add Vehicle</Link>
          </div>

          <div className="filter-grid filter-grid-3">
            <input
              value={filters.search}
              placeholder="Search vehicle, brand, model, code..."
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', status: 'all' })}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading your vehicles...</div>
          ) : vehicles.length > 0 ? (
            <div className="table-shell">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle._id}>
                      <td>
                        <strong>{vehicle.name}</strong>
                        <span>{vehicle.brand} {vehicle.model}</span>
                      </td>
                      <td>{vehicle.vehicleCode}</td>
                      <td>{vehicle.location}</td>
                      <td>{formatCurrency(vehicle.pricePerDay)}</td>
                      <td><span className={`badge ${getBadgeClass(vehicle.status)}`}>{vehicle.status}</span></td>
                      <td>{formatDate(vehicle.updatedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link className="btn btn-outline btn-sm" to={`/cars/${vehicle._id}`}>View</Link>
                          <Link className="btn btn-secondary btn-sm" to={`/staff/vehicles/${vehicle._id}/edit`}>Edit</Link>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={busyAction === vehicle._id}
                            onClick={() => deleteVehicle(vehicle._id)}
                          >
                            {busyAction === vehicle._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reservation-empty">No vehicle listings matched the current filters.</div>
          )}
        </section>
      </main>
    </div>
  )
}
