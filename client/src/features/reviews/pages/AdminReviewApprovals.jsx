import { useEffect, useMemo, useState } from 'react'
import { FaRegStar, FaStar, FaUserCircle } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { formatDateTime, getBadgeClass } from '../../../utils/formatters'
import { getAdminReviews, updateReviewStatus } from '../reviewApi'

const tabs = ['pending', 'approved', 'rejected']

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
}

function Stars({ rating }) {
  return (
    <span className="quality-stars">
      {[1, 2, 3, 4, 5].map((value) => (
        value <= Number(rating || 0)
          ? <FaStar key={value} className="filled" />
          : <FaRegStar key={value} />
      ))}
    </span>
  )
}

export default function AdminReviewApprovals() {
  const [reviews, setReviews] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchReviews = () => {
    setLoading(true)
    setError('')

    getAdminReviews()
      .then((res) => setReviews(res.data.reviews || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load reviews'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const filteredReviews = useMemo(() => (
    reviews.filter((review) => review.status === activeTab)
  ), [reviews, activeTab])

  const handleStatusUpdate = async (reviewId, status) => {
    setBusyAction(`${reviewId}-${status}`)
    setMessage('')
    setError('')

    try {
      const res = await updateReviewStatus(reviewId, { status })
      setReviews((current) => current.map((review) => (
        review._id === reviewId ? res.data.review : review
      )))
      setMessage(`Review marked as ${statusLabels[status]}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update review')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Review Approvals</h2>
          <p style={{ color: 'var(--text-light)' }}>Approve customer ratings before they appear publicly.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <section className="form-card">
          <div className="quality-tabs">
            {tabs.map((tab) => (
              <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                {statusLabels[tab]}
                <span>{reviews.filter((review) => review.status === tab).length}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="reservation-empty">Loading reviews...</div>
          ) : filteredReviews.length > 0 ? (
            <div className="quality-approval-list">
              {filteredReviews.map((review) => (
                <article key={review._id} className="quality-approval-card">
                  <div className="quality-approval-main">
                    <FaUserCircle className="quality-avatar-icon" />
                    <div>
                      <div className="quality-approval-title">
                        <strong>{review.passengerName || 'Customer'}</strong>
                        <span className={`badge ${getBadgeClass(review.status)}`}>{statusLabels[review.status]}</span>
                      </div>
                      <p>&ldquo;{review.feedback}&rdquo;</p>
                      <div className="quality-review-meta">
                        {review.vehicleRating && <span>Vehicle: <Stars rating={review.vehicleRating} /></span>}
                        {review.driverRating && <span>Driver: <Stars rating={review.driverRating} /></span>}
                      </div>
                      <small>{review.bookingNo} | {[review.vehicleName, review.driverName].filter(Boolean).join(' / ')}</small>
                    </div>
                  </div>
                  <div className="quality-approval-actions">
                    <small>{formatDateTime(review.createdAt)}</small>
                    <div className="table-actions">
                      {review.status !== 'rejected' && (
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          disabled={busyAction === `${review._id}-rejected`}
                          onClick={() => handleStatusUpdate(review._id, 'rejected')}
                        >
                          Reject
                        </button>
                      )}
                      {review.status !== 'pending' && (
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          disabled={busyAction === `${review._id}-pending`}
                          onClick={() => handleStatusUpdate(review._id, 'pending')}
                        >
                          Pending
                        </button>
                      )}
                      {review.status !== 'approved' && (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          disabled={busyAction === `${review._id}-approved`}
                          onClick={() => handleStatusUpdate(review._id, 'approved')}
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="reservation-empty">No {statusLabels[activeTab].toLowerCase()} reviews.</div>
          )}
        </section>
      </main>
    </div>
  )
}
