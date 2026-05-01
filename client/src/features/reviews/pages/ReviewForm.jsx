import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaCarSide, FaRegStar, FaStar, FaUserTie } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { formatDateRange } from '../../../utils/formatters'
import { getReviewContext, submitReview } from '../reviewApi'

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

export default function ReviewForm() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [context, setContext] = useState(null)
  const [vehicleRating, setVehicleRating] = useState(0)
  const [driverRating, setDriverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getReviewContext(bookingId)
      .then((res) => {
        if (active) {
          setContext(res.data)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load booking')
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
  }, [bookingId])

  const booking = context?.booking
  const eligibility = context?.reviewEligibility || {}
  const existingReview = context?.existingReview

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await submitReview({
        bookingId,
        vehicleRating: eligibility.hasVehicle ? vehicleRating : null,
        driverRating: eligibility.hasDriver ? driverRating : null,
        feedback
      })

      navigate('/bookings', {
        state: {
          message: 'Review submitted for admin approval'
        }
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Rate Your Experience</h2>
          <p style={{ color: 'var(--text-light)' }}>Submit a review after your booking is completed.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="form-card reservation-empty">Loading booking...</div>
        ) : booking ? (
          <section className="form-card quality-form-card">
            <div className="card-header">
              <div>
                <h3>{booking.bookingNo}</h3>
                <p style={{ color: 'var(--text-light)' }}>{booking.displayVehicle} | {formatDateRange(booking.startDate, booking.endDate)}</p>
              </div>
              <span className="badge badge-info">{booking.bookingStatus}</span>
            </div>

            {existingReview ? (
              <div className="quality-state-panel">
                <h3>Review Already Submitted</h3>
                <p>Your review is currently marked as <strong>{existingReview.status}</strong>.</p>
                <Link className="btn btn-outline" to="/bookings">Back to Bookings</Link>
              </div>
            ) : !eligibility.canReview ? (
              <div className="quality-state-panel">
                <h3>Review Not Available Yet</h3>
                <p>Reviews can be submitted after the booking is completed.</p>
                <Link className="btn btn-outline" to="/bookings">Back to Bookings</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="quality-rating-targets">
                  {eligibility.hasVehicle && (
                    <div className="quality-target-card">
                      <FaCarSide />
                      <div>
                        <strong>{booking.vehicle?.name || booking.displayVehicle}</strong>
                        <span>Vehicle rating</span>
                      </div>
                      <StarInput label="Vehicle rating" value={vehicleRating} onChange={setVehicleRating} />
                    </div>
                  )}

                  {eligibility.hasDriver && (
                    <div className="quality-target-card">
                      <FaUserTie />
                      <div>
                        <strong>{booking.driver?.fullName || booking.driverAd?.driver?.fullName || 'Driver'}</strong>
                        <span>Driver rating</span>
                      </div>
                      <StarInput label="Driver rating" value={driverRating} onChange={setDriverRating} />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Overall Feedback</label>
                  <textarea
                    rows="6"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Share your experience with this booking..."
                    required
                  />
                </div>

                <div className="pill-row">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <Link className="btn btn-outline" to="/bookings">Cancel</Link>
                </div>
              </form>
            )}
          </section>
        ) : (
          <div className="form-card reservation-empty">Booking not found.</div>
        )}
      </main>
    </div>
  )
}
