import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/axios'
import { buildUploadUrl } from '../api/config'
import { formatCurrency, getBadgeClass } from '../utils/formatters'

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    status: 'available'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/vehicles', { params: filters })
      .then((res) => setVehicles(res.data.vehicles || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load vehicles'))
      .finally(() => setLoading(false))
  }, [filters])

  return (
    <div className="page-content reservation-page">
      <section className="page-banner">
        <div className="container">
          <div className="page-banner-copy">
            <span className="page-banner-tag">Explore Cars</span>
            <h1>Find a vehicle that fits your next reservation</h1>
            <p>Browse the current fleet, compare features, and move straight into booking from the detail page.</p>
          </div>
        </div>
      </section>

      <section className="reservation-section">
        <div className="container">
          <div className="filter-card">
            <div className="filter-grid filter-grid-3">
              <input
                value={filters.search}
                placeholder="Search by vehicle, brand, location..."
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', status: 'available' })}>
                Reset
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {loading && <div className="form-card reservation-empty">Loading vehicles...</div>}

          {!loading && !error && (
            vehicles.length > 0 ? (
              <div className="vehicle-grid">
                {vehicles.map((vehicle) => (
                  <article key={vehicle._id} className="vehicle-card">
                    <img
                      className="vehicle-card-image"
                      src={buildUploadUrl(vehicle.images?.[0])}
                      alt={vehicle.name}
                    />
                    <div className="vehicle-card-body">
                      <div className="vehicle-card-head">
                        <div>
                          <h3>{vehicle.name}</h3>
                          <p>{vehicle.location}</p>
                        </div>
                        <span className={`badge ${getBadgeClass(vehicle.status)}`}>{vehicle.status}</span>
                      </div>
                      <div className="vehicle-meta-grid">
                        <div>
                          <span>Transmission</span>
                          <strong>{vehicle.transmission}</strong>
                        </div>
                        <div>
                          <span>Fuel</span>
                          <strong>{vehicle.fuelType}</strong>
                        </div>
                        <div>
                          <span>Seats</span>
                          <strong>{vehicle.seats}</strong>
                        </div>
                      </div>
                      <div className="vehicle-card-footer">
                        <strong>{formatCurrency(vehicle.pricePerDay)} <span>/ day</span></strong>
                        <Link className="btn btn-primary btn-sm" to={`/cars/${vehicle._id}`}>View Details</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="form-card reservation-empty">No vehicles matched the current filters.</div>
            )
          )}
        </div>
      </section>
    </div>
  )
}
