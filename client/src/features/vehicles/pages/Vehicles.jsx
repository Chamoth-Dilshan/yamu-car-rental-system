import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../../../api/axios'
import { buildUploadUrl } from '../../../api/config'
import { formatCurrency, getBadgeClass } from '../../../utils/formatters'

const DISTRICT_LOCATION_ALIASES = {
  Ampara: ['Ampara', 'Kalmunai', 'Akkaraipattu', 'Sainthamaruthu'],
  Anuradhapura: ['Anuradhapura', 'Kekirawa', 'Tambuttegama'],
  Badulla: ['Badulla', 'Bandarawela', 'Ella', 'Haputale'],
  Batticaloa: ['Batticaloa', 'Kattankudy', 'Eravur'],
  Colombo: ['Colombo', 'Dehiwala', 'Mount Lavinia', 'Moratuwa', 'Nugegoda', 'Maharagama', 'Battaramulla', 'Rajagiriya'],
  Galle: ['Galle', 'Ambalangoda', 'Hikkaduwa', 'Elpitiya'],
  Gampaha: ['Gampaha', 'Negombo', 'Ja-Ela', 'Wattala', 'Kadawatha', 'Kiribathgoda', 'Kelaniya'],
  Hambantota: ['Hambantota', 'Tangalle', 'Beliatta'],
  Jaffna: ['Jaffna', 'Chavakachcheri', 'Point Pedro', 'Nallur'],
  Kalutara: ['Kalutara', 'Panadura', 'Beruwala', 'Horana', 'Matugama'],
  Kandy: ['Kandy', 'Peradeniya', 'Katugastota', 'Gampola'],
  Kegalle: ['Kegalle', 'Mawanella', 'Warakapola', 'Rambukkana'],
  Kilinochchi: ['Kilinochchi', 'Pallai'],
  Kurunegala: ['Kurunegala', 'Kuliyapitiya', 'Narammala', 'Pannala'],
  Mannar: ['Mannar', 'Murunkan'],
  Matale: ['Matale', 'Dambulla', 'Galewela'],
  Matara: ['Matara', 'Weligama', 'Akuressa', 'Dikwella'],
  Monaragala: ['Monaragala', 'Wellawaya', 'Bibile'],
  Mullaitivu: ['Mullaitivu', 'Oddusuddan'],
  'Nuwara Eliya': ['Nuwara Eliya', 'Hatton', 'Talawakele'],
  Polonnaruwa: ['Polonnaruwa', 'Kaduruwela', 'Medirigiriya'],
  Puttalam: ['Puttalam', 'Chilaw', 'Wennappuwa', 'Nattandiya'],
  Ratnapura: ['Ratnapura', 'Balangoda', 'Embilipitiya'],
  Trincomalee: ['Trincomalee', 'Kinniya'],
  Vavuniya: ['Vavuniya', 'Nedunkeni']
}

const DISTRICT_KEYWORDS = Object.entries(DISTRICT_LOCATION_ALIASES).flatMap(([district, aliases]) => (
  [district, ...aliases].map((alias) => ({
    district,
    alias: alias.toLowerCase()
  }))
))

const normalizeLocationSegment = (value = '') => value
  .trim()
  .toLowerCase()
  .replace(/\bdistrict\b/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const getDistrictFromLocation = (location = '') => {
  const normalizedLocation = normalizeLocationSegment(location)

  if (!normalizedLocation) {
    return null
  }

  const locationParts = location
    .split(',')
    .map((part) => normalizeLocationSegment(part))
    .filter(Boolean)

  const matchedFromParts = [...locationParts].reverse().find((part) => (
    DISTRICT_KEYWORDS.some(({ alias }) => alias === part)
  ))

  if (matchedFromParts) {
    return DISTRICT_KEYWORDS.find(({ alias }) => alias === matchedFromParts)?.district || null
  }

  const matchedFromWholeValue = DISTRICT_KEYWORDS.find(({ alias }) => alias === normalizedLocation)

  if (matchedFromWholeValue) {
    return matchedFromWholeValue.district
  }

  return null
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [districtOptions, setDistrictOptions] = useState([])
  const defaultFilters = {
    search: '',
    district: 'all',
    status: 'available'
  }
  const [filters, setFilters] = useState(defaultFilters)
  const [draftFilters, setDraftFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    API.get('/vehicles', {
      params: {
        status: 'available'
      }
    })
      .then((res) => {
        const nextDistricts = [...new Set(
          (res.data.vehicles || [])
            .map((vehicle) => getDistrictFromLocation(vehicle.location))
            .filter(Boolean)
        )].sort((left, right) => left.localeCompare(right))

        setDistrictOptions(nextDistricts)
      })
      .catch(() => setDistrictOptions([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/vehicles', { params: filters })
      .then((res) => setVehicles(res.data.vehicles || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load vehicles'))
      .finally(() => setLoading(false))
  }, [filters])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setFilters(draftFilters)
  }

  const handleDistrictChange = (event) => {
    const nextDistrict = event.target.value

    setDraftFilters((prev) => ({
      ...prev,
      district: nextDistrict
    }))

    setFilters((prev) => ({
      ...prev,
      district: nextDistrict
    }))
  }

  const handleReset = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
  }

  return (
    <div className="page-content reservation-page">
      <section className="page-banner">
        <div className="container">
          <div className="page-banner-copy page-banner-copy-wide">
            <h1>Find a vehicle that fits your next reservation</h1>
            <p>Browse the current fleet, compare features, and move straight into booking from the detail page.</p>
          </div>
        </div>
      </section>

      <section className="reservation-section">
        <div className="container">
          <div className="filter-card">
            <form onSubmit={handleSearchSubmit}>
              <div className="filter-grid filter-grid-3">
                <input
                  value={draftFilters.search}
                  placeholder="Search by vehicle, brand, model..."
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
                <select
                  value={draftFilters.district}
                  onChange={handleDistrictChange}
                >
                  <option value="all">All Districts</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                <button className="btn btn-primary" type="submit">Search</button>
              </div>
            </form>
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
                          {(vehicle.owner?.storeName || vehicle.owner?.fullName) && (
                            <p style={{ color: 'var(--text-light)' }}>
                              Store: {vehicle.owner.storeName || vehicle.owner.fullName}
                            </p>
                          )}
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
              <div className="form-card reservation-empty">
                No vehicles matched the current filters.
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn-outline" type="button" onClick={handleReset}>Reset Filters</button>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  )
}
