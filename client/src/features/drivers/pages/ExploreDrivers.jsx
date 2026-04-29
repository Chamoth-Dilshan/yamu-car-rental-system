import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../../../api/axios'
import { formatCurrency, formatList, getBadgeClass } from '../../../utils/formatters'
import { getMediaImage, getUserAvatar } from '../../../utils/media'

export default function ExploreDrivers() {
  const [ads, setAds] = useState([])
  const defaultFilters = {
    search: '',
    location: 'all',
    availability: 'all'
  }
  const [filters, setFilters] = useState(defaultFilters)
  const [draftFilters, setDraftFilters] = useState(defaultFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/driver-ads', { params: filters })
      .then((res) => setAds(res.data.ads || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load drivers'))
      .finally(() => setLoading(false))
  }, [filters])

  const uniqueLocations = [...new Set(ads.map((ad) => ad.serviceLocation).filter(Boolean))]

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setFilters(draftFilters)
  }

  const handleReset = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
  }

  return (
    <div className="page-content reservation-page">
      <section className="page-banner">
        <div className="container">
          <div className="page-banner-copy">
            <span className="page-banner-tag">Explore Drivers</span>
            <h1>Browse trusted drivers for tours, transfers, and custom requests</h1>
            <p>Use the public ads to compare locations, languages, trip style, and day rate before you request a driver.</p>
          </div>
        </div>
      </section>

      <section className="reservation-section">
        <div className="container">
          <div className="filter-card">
            <form onSubmit={handleSearchSubmit}>
              <div className="filter-grid filter-grid-4">
                <input
                  value={draftFilters.search}
                  placeholder="Search by driver, title, language..."
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
                <select value={draftFilters.location} onChange={(e) => setDraftFilters((prev) => ({ ...prev, location: e.target.value }))}>
                  <option value="all">All Locations</option>
                  {uniqueLocations.map((location) => <option key={location} value={location}>{location}</option>)}
                </select>
                <select
                  value={draftFilters.availability}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, availability: e.target.value }))}
                >
                  <option value="all">All Availability</option>
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <button className="btn btn-primary" type="submit">Search</button>
              </div>
            </form>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {loading && <div className="form-card reservation-empty">Loading drivers...</div>}

          {!loading && !error && (
            ads.length > 0 ? (
              <div className="driver-grid">
                {ads.map((ad) => (
                  <article key={ad._id} className="driver-card">
                    <div className="driver-card-top">
                      <img
                        className="driver-card-avatar"
                        src={ad.photo ? getMediaImage(ad.photo, ad.driver?.fullName || ad.title) : getUserAvatar(ad.driver, ad.title)}
                        alt={ad.driver?.fullName || ad.title}
                      />
                      <div>
                        <h3>{ad.driver?.fullName || ad.title}</h3>
                        <p>{ad.title}</p>
                        <div className="pill-row" style={{ marginTop: '0.5rem' }}>
                          <span className={`badge ${getBadgeClass(ad.availability)}`}>{ad.availability}</span>
                          <span className="badge badge-info">{ad.serviceLocation}</span>
                        </div>
                      </div>
                    </div>
                    <p className="driver-card-tagline">{ad.tagline}</p>
                    <div className="feature-list">
                      <span className="feature-chip">{formatList(ad.languages)}</span>
                      <span className="feature-chip">{ad.experienceYears} years experience</span>
                      <span className="feature-chip">Up to {ad.maxGroupSize} travellers</span>
                    </div>
                    <div className="vehicle-meta-grid">
                      <div>
                        <span>Per day</span>
                        <strong>{formatCurrency(ad.dailyRate)}</strong>
                      </div>
                      <div>
                        <span>Completed trips</span>
                        <strong>{ad.completedTrips}</strong>
                      </div>
                      <div>
                        <span>Rating</span>
                        <strong>{ad.ratingAverage}/5</strong>
                      </div>
                    </div>
                    <div className="driver-card-footer">
                      <Link className="btn btn-primary btn-sm" to={`/drivers/${ad._id}`}>View Profile</Link>
                      <a className="btn btn-outline btn-sm" href={`mailto:${ad.driver?.email || ''}`}>Contact</a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="form-card reservation-empty">
                No driver advertisements matched the current filters.
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
