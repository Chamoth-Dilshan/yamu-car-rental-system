import { useEffect, useMemo, useState } from 'react'
import { FaCarSide, FaRegStar, FaStar, FaUserTie } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { formatDateTime, getBadgeClass } from '../../../utils/formatters'
import { deleteMyReview, getMyReviews, updateMyReview } from '../reviewApi'

const statusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected'
}

function RatingStars({ rating = 0 }) {
  return (
    <span className="quality-stars" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        value <= Number(rating || 0)
          ? <FaStar key={value} className="filled" />
          : <FaRegStar key={value} />
      ))}
    </span>
  )
}

function StarInput({ label, value, onChange }) {
  return (
    <div className="quality-star-input">
      <label>{label}</label>
      <div className="quality-star-buttons">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} type="button" onClick={() => onChange(rating)} aria-label={`${label} ${rating} stars`}>
            {rating <= value ? <FaStar /> : <FaRegStar />}
          </button>
        ))}
      </div>
    </div>
  )
}

function getReviewTarget(review) {
  return [review.vehicleName, review.driverName].filter(Boolean).join(' / ') || review.bookingNo
}

function ReviewEditor({ review, busy, onCancel, onSave }) {
  const hasVehicle = Boolean(review.vehicleRating)
  const hasDriver = Boolean(review.driverRating)
  const [vehicleRating, setVehicleRating] = useState(Number(review.vehicleRating || 0))
  const [driverRating, setDriverRating] = useState(Number(review.driverRating || 0))
  const [feedback, setFeedback] = useState(review.feedback || '')

  const handleSubmit = (event) => {
    event.preventDefault()

    onSave(review._id, {
      vehicleRating: hasVehicle ? vehicleRating : null,
      driverRating: hasDriver ? driverRating : null,
      feedback
    })
  }

  return (
    <form className="quality-review-editor" onSubmit={handleSubmit}>
      <div className="quality-edit-ratings">
        {hasVehicle && (
          <StarInput label="Vehicle rating" value={vehicleRating} onChange={setVehicleRating} />
        )}
        {hasDriver && (
          <StarInput label="Driver rating" value={driverRating} onChange={setDriverRating} />
        )}
      </div>

      <div className="form-group">
        <label>Feedback</label>
        <textarea
          rows="4"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          required
        />
      </div>

      <div className="table-actions">
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save Changes'}
        </button>
        <button className="btn btn-outline btn-sm" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function ReviewCard({ review, editing, busyAction, onEdit, onCancelEdit, onSave, onDelete }) {
  const busy = busyAction === `save-${review._id}` || busyAction === `delete-${review._id}`

  return (
    <article className="quality-approval-card quality-my-review-card">
      <div className="quality-approval-main">
        <div className="quality-review-target-icon">
          {review.driverRating ? <FaUserTie /> : <FaCarSide />}
        </div>
        <div>
          <div className="quality-approval-title">
            <strong>{getReviewTarget(review)}</strong>
            <span className={`badge ${getBadgeClass(review.status)}`}>{statusLabels[review.status] || review.status}</span>
          </div>
          <small>
            {review.bookingNo} | Submitted {formatDateTime(review.createdAt)} | Updated {formatDateTime(review.updatedAt || review.createdAt)}
          </small>

          {editing ? (
            <ReviewEditor
              review={review}
              busy={busyAction === `save-${review._id}`}
              onCancel={onCancelEdit}
              onSave={onSave}
            />
          ) : (
            <>
              <p>&ldquo;{review.feedback}&rdquo;</p>
              <div className="quality-review-meta">
                {review.vehicleRating && (
                  <span><FaCarSide /> Vehicle <RatingStars rating={review.vehicleRating} /></span>
                )}
                {review.driverRating && (
                  <span><FaUserTie /> Driver <RatingStars rating={review.driverRating} /></span>
                )}
              </div>
              {review.status === 'rejected' && review.rejectionReason && (
                <div className="alert alert-danger quality-rejection-note">
                  {review.rejectionReason}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!editing && (
        <div className="quality-approval-actions">
          <div className="table-actions">
            <button className="btn btn-outline btn-sm" type="button" onClick={() => onEdit(review)} disabled={busy}>
              Edit
            </button>
            <button className="btn btn-danger btn-sm" type="button" onClick={() => onDelete(review)} disabled={busy}>
              {busyAction === `delete-${review._id}` ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export default function MyReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingReviewId, setEditingReviewId] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    getMyReviews()
      .then((res) => {
        if (active) {
          setReviews(res.data.reviews || [])
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load your reviews')
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

  const stats = useMemo(() => ([
    { label: 'All Reviews', value: reviews.length },
    { label: 'Pending', value: reviews.filter((review) => review.status === 'pending').length },
    { label: 'Approved', value: reviews.filter((review) => review.status === 'approved').length },
    { label: 'Rejected', value: reviews.filter((review) => review.status === 'rejected').length }
  ]), [reviews])

  const handleSave = async (reviewId, payload) => {
    setBusyAction(`save-${reviewId}`)
    setMessage('')
    setError('')

    try {
      const res = await updateMyReview(reviewId, payload)
      setReviews((current) => current.map((review) => (
        review._id === reviewId ? res.data.review : review
      )))
      setEditingReviewId('')
      setMessage('Review updated and sent for admin approval')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update review')
    } finally {
      setBusyAction('')
    }
  }

  const handleDelete = async (review) => {
    const confirmed = window.confirm(`Delete review for ${getReviewTarget(review)}?`)

    if (!confirmed) {
      return
    }

    setBusyAction(`delete-${review._id}`)
    setMessage('')
    setError('')

    try {
      await deleteMyReview(review._id)
      setReviews((current) => current.filter((item) => item._id !== review._id))
      setMessage('Review deleted')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <div>
            <h2>My Reviews</h2>
            <p style={{ color: 'var(--text-light)' }}>Manage your vehicle and driver feedback from one place.</p>
          </div>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="stat-card">
              <div className="stat-info">
                <h3>{loading ? '...' : item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Review History</h3>
              <p style={{ color: 'var(--text-light)' }}>Edited reviews return to pending approval before appearing publicly.</p>
            </div>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading reviews...</div>
          ) : reviews.length > 0 ? (
            <div className="quality-approval-list">
              {reviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  editing={editingReviewId === review._id}
                  busyAction={busyAction}
                  onEdit={() => setEditingReviewId(review._id)}
                  onCancelEdit={() => setEditingReviewId('')}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="reservation-empty">No reviews submitted yet.</div>
          )}
        </section>
      </main>
    </div>
  )
}
