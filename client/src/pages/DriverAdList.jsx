import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/axios'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate, getBadgeClass } from '../utils/formatters'

export default function DriverAdList() {
  const { user } = useAuth()
  const [ads, setAds] = useState([])
  const [stats, setStats] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    visibility: 'all',
    availability: 'all'
  })
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const activeRole = user?.activeRole || user?.role
  const isStaff = activeRole === 'staff'
  const adOwnerLabel = isStaff ? 'staff' : 'driver'
  const adEntityLabel = isStaff ? 'staff advertisement' : 'driver advertisement'
  const listHeading = isStaff ? 'My Staff Ads' : 'My Driver Ads'
  const createLabel = isStaff ? 'Create Staff Ad' : 'Create Ad'

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/driver-ads/mine/list', { params: filters })
      .then((res) => {
        setAds(res.data.ads || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || `Failed to load ${adEntityLabel}s`))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  const deleteAd = async (adId) => {
    if (!window.confirm(`Delete this ${adEntityLabel}?`)) {
      return
    }

    setBusyAction(adId)
    setMessage('')
    setError('')

    try {
      await API.delete(`/driver-ads/${adId}`)
      setMessage(`${isStaff ? 'Staff' : 'Driver'} advertisement deleted`)
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete advertisement')
    } finally {
      setBusyAction('')
    }
  }

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
          <h2>{listHeading}</h2>
          <p style={{ color: 'var(--text-light)' }}>Create and maintain the public {adOwnerLabel} advertisements customers use when submitting requests.</p>
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
              <h3>Advertisement List</h3>
              <p style={{ color: 'var(--text-light)' }}>Filter your ads by availability or visibility, then edit them without leaving the dashboard.</p>
            </div>
            <Link className="btn btn-primary btn-sm" to="/driver/ads/new">{createLabel}</Link>
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
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', visibility: 'all', availability: 'all' })}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading your advertisements...</div>
          ) : ads.length > 0 ? (
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
                  {ads.map((ad) => (
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
          ) : (
            <div className="reservation-empty">No driver advertisements found for the current filters.</div>
          )}
        </section>
      </main>
    </div>
  )
}
