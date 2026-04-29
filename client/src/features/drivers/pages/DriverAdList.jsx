import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDate, getBadgeClass } from '../../../utils/formatters'
import { getMediaImage, getUserAvatar } from '../../../utils/media'

const emptyFilters = {
  search: '',
  visibility: 'all',
  availability: 'all'
}

const formatList = (items, fallback = 'Not provided yet') => (
  items?.length ? items.join(', ') : fallback
)

export default function DriverAdList() {
  const { user } = useAuth()
  const [ads, setAds] = useState([])
  const [stats, setStats] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/driver-ads/mine/list')
      .then((res) => {
        setAds(res.data.ads || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load driver advertisements'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  const deleteAd = async (adId) => {
    if (!window.confirm('Delete this driver advertisement?')) {
      return
    }

    setBusyAction(adId)
    setMessage('')
    setError('')

    try {
      await API.delete(`/driver-ads/${adId}`)
      setMessage('Driver advertisement deleted')
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete advertisement')
    } finally {
      setBusyAction('')
    }
  }

  const primaryAd = ads.length === 1 ? ads[0] : null
  const hasAds = ads.length > 0
  const hasLegacyDuplicates = ads.length > 1
  const filteredAds = ads.filter((ad) => {
    const matchesSearch = !filters.search || [
      ad.title,
      ad.tagline,
      ad.serviceLocation,
      ...(ad.languages || []),
      ...(ad.specialties || [])
    ].some((value) => String(value || '').toLowerCase().includes(filters.search.toLowerCase()))

    const matchesVisibility = filters.visibility === 'all' || ad.visibility === filters.visibility
    const matchesAvailability = filters.availability === 'all' || ad.availability === filters.availability

    return matchesSearch && matchesVisibility && matchesAvailability
  })
  const summaryCards = [
    { label: 'Total Ads', value: stats?.totalAds || 0 },
    { label: 'Active Ads', value: stats?.activeAds || 0 },
    { label: 'Available Now', value: stats?.availableAds || 0 },
    { label: 'Paused Ads', value: stats?.pausedAds || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>My Driver Ad</h2>
          <p style={{ color: 'var(--text-light)' }}>
            Each driver can publish one public advertisement. Create it once, then keep it updated for customers.
          </p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {hasLegacyDuplicates && (
          <div className="alert alert-warning">
            Only one driver advertisement should exist per driver account. This account currently has multiple ads, so the legacy list is shown until the extras are removed.
          </div>
        )}

        {loading ? (
          <section className="form-card reservation-empty">Loading your advertisement...</section>
        ) : !hasAds ? (
          <section className="form-card driver-ad-empty-state">
            <span className="badge badge-info">One ad per driver</span>
            <h3>Create your public driver ad</h3>
            <p>
              Customers will use this single ad when submitting booking requests. After publishing, you can edit the same ad any time.
            </p>
            <div className="pill-row">
              <Link className="btn btn-primary" to="/driver/ads/new">Create My Ad</Link>
            </div>
          </section>
        ) : primaryAd ? (
          <div className="driver-ad-single-stack">
            <section className="form-card driver-ad-focus-card">
              <div className="driver-ad-focus-head">
                <div className="driver-ad-focus-profile">
                  <div className="driver-ad-focus-photo">
                    <img
                      src={primaryAd.photo ? getMediaImage(primaryAd.photo, primaryAd.title) : getUserAvatar(user)}
                      alt={primaryAd.title}
                    />
                  </div>
                  <div className="driver-ad-focus-copy">
                    <div className="pill-row">
                      <span className={`badge ${getBadgeClass(primaryAd.visibility)}`}>{primaryAd.visibility}</span>
                      <span className={`badge ${getBadgeClass(primaryAd.availability)}`}>{primaryAd.availability}</span>
                      <span className="badge badge-info">{primaryAd.serviceLocation || 'Location not set'}</span>
                    </div>
                    <h3>{primaryAd.title}</h3>
                    <p>{primaryAd.tagline || 'Add a short tagline so customers immediately understand your service style.'}</p>
                  </div>
                </div>

                <div className="driver-ad-focus-actions">
                  <Link className="btn btn-outline btn-sm" to={`/drivers/${primaryAd._id}`}>View Public Ad</Link>
                  <Link className="btn btn-secondary btn-sm" to={`/driver/ads/${primaryAd._id}/edit`}>Edit Ad</Link>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    disabled={busyAction === primaryAd._id}
                    onClick={() => deleteAd(primaryAd._id)}
                  >
                    {busyAction === primaryAd._id ? 'Deleting...' : 'Delete Ad'}
                  </button>
                </div>
              </div>

              <div className="driver-ad-highlight-grid">
                <article className="driver-ad-highlight">
                  <span>Daily Rate</span>
                  <strong>{formatCurrency(primaryAd.dailyRate)}</strong>
                </article>
                <article className="driver-ad-highlight">
                  <span>Experience</span>
                  <strong>{primaryAd.experienceYears} years</strong>
                </article>
                <article className="driver-ad-highlight">
                  <span>Max Group Size</span>
                  <strong>{primaryAd.maxGroupSize} people</strong>
                </article>
                <article className="driver-ad-highlight">
                  <span>Last Updated</span>
                  <strong>{formatDate(primaryAd.updatedAt)}</strong>
                </article>
              </div>
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Ad Details</h3>
                  <p style={{ color: 'var(--text-light)' }}>
                    This is the information customers see before sending a driver booking request.
                  </p>
                </div>
              </div>

              <div className="driver-ad-detail-grid">
                <article className="driver-ad-detail-block">
                  <span>Service Location</span>
                  <strong>{primaryAd.serviceLocation || 'Not provided yet'}</strong>
                </article>
                <article className="driver-ad-detail-block">
                  <span>Languages</span>
                  <strong>{formatList(primaryAd.languages)}</strong>
                </article>
                <article className="driver-ad-detail-block">
                  <span>Preferred Contact</span>
                  <strong>{primaryAd.preferredContact || 'Not provided yet'}</strong>
                </article>
                <article className="driver-ad-detail-block">
                  <span>Specialties</span>
                  <strong>{formatList(primaryAd.specialties)}</strong>
                </article>
              </div>

              <div className="driver-ad-detail-block driver-ad-detail-block-wide">
                <span>Description</span>
                <strong className="driver-ad-detail-copy">
                  {primaryAd.description || 'Add a description to explain your service style, routes, and what customers can expect.'}
                </strong>
              </div>
            </section>
          </div>
        ) : (
          <>
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
                  <h3>Existing Advertisements</h3>
                  <p style={{ color: 'var(--text-light)' }}>
                    Clean up the extra ads so this driver account returns to a single public advertisement.
                  </p>
                </div>
              </div>

              <div className="filter-grid filter-grid-4">
                <input
                  value={filters.search}
                  placeholder="Search title, location, language..."
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
                <select value={filters.visibility} onChange={(e) => setFilters((prev) => ({ ...prev, visibility: e.target.value }))}>
                  <option value="all">All Visibility</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                </select>
                <select value={filters.availability} onChange={(e) => setFilters((prev) => ({ ...prev, availability: e.target.value }))}>
                  <option value="all">All Availability</option>
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                <button className="btn btn-outline" type="button" onClick={() => setFilters(emptyFilters)}>
                  Reset
                </button>
              </div>

              <div className="table-shell">
                <table className="reservation-table">
                  <thead>
                    <tr>
                      <th>Advertisement</th>
                      <th>Location</th>
                      <th>Daily Rate</th>
                      <th>Availability</th>
                      <th>Visibility</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAds.map((ad) => (
                      <tr key={ad._id}>
                        <td>
                          <strong>{ad.title}</strong>
                          <span>{ad.tagline || 'No short tagline yet'}</span>
                        </td>
                        <td>{ad.serviceLocation}</td>
                        <td>{formatCurrency(ad.dailyRate)}</td>
                        <td><span className={`badge ${getBadgeClass(ad.availability)}`}>{ad.availability}</span></td>
                        <td><span className={`badge ${getBadgeClass(ad.visibility)}`}>{ad.visibility}</span></td>
                        <td>{formatDate(ad.updatedAt)}</td>
                        <td>
                          <div className="table-actions">
                            <Link className="btn btn-outline btn-sm" to={`/drivers/${ad._id}`}>View</Link>
                            <Link className="btn btn-secondary btn-sm" to={`/driver/ads/${ad._id}/edit`}>Edit</Link>
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              disabled={busyAction === ad._id}
                              onClick={() => deleteAd(ad._id)}
                            >
                              {busyAction === ad._id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!filteredAds.length && (
                <div className="reservation-empty">No driver advertisements found for the current filters.</div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
