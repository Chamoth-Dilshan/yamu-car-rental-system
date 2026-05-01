import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCarSide, FaQuoteLeft, FaStar, FaUserTie } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../utils/formatters'
import { getCustomerQualityDashboard } from '../reviewApi'

const emptyDashboard = {
  averageDriverRating: 0,
  averageVehicleRating: 0,
  totalApprovedReviews: 0,
  topDrivers: [],
  topVehicles: [],
  newestReviews: []
}

function RatingStars({ rating = 0 }) {
  return (
    <span className="quality-stars" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <FaStar key={value} className={value <= Math.round(Number(rating || 0)) ? 'filled' : ''} />
      ))}
    </span>
  )
}

function RankingList({ title, icon, items, emptyText }) {
  return (
    <section className="form-card quality-ranking-card">
      <div className="card-header">
        <div>
          <h3>{icon} {title}</h3>
          <p style={{ color: 'var(--text-light)' }}>Based on approved customer feedback.</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="quality-ranking-list">
          {items.map((item, index) => (
            <div key={item._id || item.name} className="quality-ranking-item">
              <div className="quality-rank-number">{index + 1}</div>
              <div className="quality-ranking-copy">
                <strong>{item.name}</strong>
                <span>{item.subtitle || `${item.reviewCount} approved review${item.reviewCount === 1 ? '' : 's'}`}</span>
              </div>
              <div className="quality-rating-pill">
                <FaStar /> {Number(item.ratingAverage || 0).toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="reservation-empty">{emptyText}</div>
      )}
    </section>
  )
}

function ReviewCard({ review }) {
  return (
    <article className="quality-review-card">
      <div className="quality-review-top">
        <div>
          <strong>{review.passengerName || 'Customer'}</strong>
          <span>{formatDate(review.createdAt)}</span>
        </div>
        <span className="badge badge-success">Approved</span>
      </div>
      <p className="quality-review-quote">&ldquo;{review.feedback}&rdquo;</p>
      <div className="quality-review-meta">
        {review.vehicleRating && (
          <span><FaCarSide /> Vehicle <RatingStars rating={review.vehicleRating} /></span>
        )}
        {review.driverRating && (
          <span><FaUserTie /> Driver <RatingStars rating={review.driverRating} /></span>
        )}
      </div>
      <small>
        {[review.vehicleName, review.driverName].filter(Boolean).join(' / ') || review.bookingNo}
      </small>
    </article>
  )
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getCustomerQualityDashboard()
      .then((res) => {
        if (active) {
          setDashboard({ ...emptyDashboard, ...res.data })
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load dashboard')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const stats = [
    { label: 'Avg Driver Rating', value: `${Number(dashboard.averageDriverRating || 0).toFixed(1)}/5` },
    { label: 'Avg Vehicle Rating', value: `${Number(dashboard.averageVehicleRating || 0).toFixed(1)}/5` },
    { label: 'Approved Reviews', value: dashboard.totalApprovedReviews || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header quality-header">
          <div>
            <h2>Customer Dashboard</h2>
            <p style={{ color: 'var(--text-light)' }}>
              Welcome back, {user?.fullName?.split(' ')[0] || 'Customer'}. Browse top-rated service providers and recent customer feedback.
            </p>
          </div>
          <Link className="btn btn-primary" to="/bookings">Open My Bookings</Link>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="stat-card">
              <div className="stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="form-card reservation-empty">Loading dashboard...</div>
        ) : (
          <>
            <div className="quality-two-column">
              <RankingList
                title="Top Rated Drivers"
                icon={<FaUserTie />}
                items={dashboard.topDrivers || []}
                emptyText="No approved driver ratings yet."
              />
              <RankingList
                title="Top Rated Vehicles"
                icon={<FaCarSide />}
                items={dashboard.topVehicles || []}
                emptyText="No approved vehicle ratings yet."
              />
            </div>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3><FaQuoteLeft /> Newest Customer Reviews</h3>
                  <p style={{ color: 'var(--text-light)' }}>Only admin-approved reviews are shown here.</p>
                </div>
              </div>

              {(dashboard.newestReviews || []).length > 0 ? (
                <div className="quality-review-grid">
                  {dashboard.newestReviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No approved reviews yet.</div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
