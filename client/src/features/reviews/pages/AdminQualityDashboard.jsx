import { useEffect, useState } from 'react'
import { FaCarSide, FaCheckCircle, FaClipboardCheck, FaStar, FaStore, FaSyncAlt, FaUserCheck, FaUserTie } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { getAdminReviewAnalytics, getComplaintStats } from '../reviewApi'

const emptyAnalytics = {
  averageDriverRating: 0,
  averageVehicleRating: 0,
  activeDrivers: 0,
  activeStores: 0,
  totalReviews: 0,
  topDrivers: [],
  topVehicles: []
}

function RatingPill({ value }) {
  return (
    <span className="quality-rating-pill">
      <FaStar /> {Number(value || 0).toFixed(1)}
    </span>
  )
}

function AdminRanking({ title, icon, items }) {
  return (
    <section className="form-card quality-ranking-card">
      <div className="card-header">
        <div>
          <h3>{icon} {title}</h3>
          <p style={{ color: 'var(--text-light)' }}>Calculated from approved reviews.</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="quality-ranking-list">
          {items.map((item, index) => (
            <div key={item._id || item.name} className="quality-ranking-item">
              <div className="quality-rank-number">{index + 1}</div>
              <div className="quality-ranking-copy">
                <strong>{item.name}</strong>
                <span>{item.reviewCount} approved rating{item.reviewCount === 1 ? '' : 's'}</span>
              </div>
              <RatingPill value={item.ratingAverage} />
            </div>
          ))}
        </div>
      ) : (
        <div className="reservation-empty">No approved ratings yet.</div>
      )}
    </section>
  )
}

export default function AdminQualityDashboard() {
  const [analytics, setAnalytics] = useState(emptyAnalytics)
  const [complaints, setComplaints] = useState({ resolutionRate: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAnalytics = () => {
    setLoading(true)
    setError('')

    Promise.all([
      getAdminReviewAnalytics(),
      getComplaintStats()
    ])
      .then(([reviewRes, complaintRes]) => {
        setAnalytics({ ...emptyAnalytics, ...reviewRes.data })
        setComplaints(complaintRes.data || { resolutionRate: 0 })
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load admin dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const stats = [
    { label: 'Active Drivers', value: analytics.activeDrivers || 0, icon: <FaUserCheck /> },
    { label: 'Active Stores', value: analytics.activeStores || 0, icon: <FaStore /> },
    { label: 'Avg Driver Rating', value: `${Number(analytics.averageDriverRating || 0).toFixed(1)}/5`, icon: <FaUserTie /> },
    { label: 'Avg Vehicle Rating', value: `${Number(analytics.averageVehicleRating || 0).toFixed(1)}/5`, icon: <FaCarSide /> },
    { label: 'Total Ratings', value: analytics.totalReviews || 0, icon: <FaClipboardCheck /> },
    { label: 'Resolution Rate', value: `${complaints.resolutionRate || 0}%`, icon: <FaCheckCircle /> }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header quality-header">
          <div>
            <h2>Admin Dashboard</h2>
            <p style={{ color: 'var(--text-light)' }}>Track service quality, review approvals, and complaint resolution.</p>
          </div>
          <button className="btn btn-outline" type="button" onClick={fetchAnalytics}>
            <FaSyncAlt /> Refresh
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="stat-card quality-stat-card">
              <div className="quality-stat-icon">{item.icon}</div>
              <div className="stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="form-card reservation-empty">Loading analytics...</div>
        ) : (
          <>
            <div className="quality-two-column">
              <AdminRanking title="Top Rated Drivers" icon={<FaUserTie />} items={analytics.topDrivers || []} />
              <AdminRanking title="Top Rated Vehicles" icon={<FaCarSide />} items={analytics.topVehicles || []} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
