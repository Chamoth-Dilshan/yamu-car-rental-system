import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaStar } from 'react-icons/fa'
import API from '../../../api/axios'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDate, formatList, getBadgeClass } from '../../../utils/formatters'
import { getMediaImage, getUserAvatar } from '../../../utils/media'
import { getDriverAdReviews } from '../../reviews/reviewApi'

const emptyReviewSummary = {
  ratingAverage: 0,
  reviewCount: 0,
  reviews: []
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

function ReviewCard({ review }) {
  return (
    <article className="quality-review-card">
      <div className="quality-review-top">
        <div>
          <strong>{review.passengerName || 'Customer'}</strong>
          <span>{formatDate(review.createdAt)}</span>
        </div>
        <span className="quality-rating-pill">
          <FaStar /> {Number(review.driverRating || 0).toFixed(1)}
        </span>
      </div>
      <p className="quality-review-quote">&ldquo;{review.feedback}&rdquo;</p>
      <div className="quality-review-meta">
        <span>Driver <RatingStars rating={review.driverRating} /></span>
      </div>
    </article>
  )
}

export default function DriverDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshNotifications } = useAuth()
  const [ad, setAd] = useState(null)
  const [reviewSummary, setReviewSummary] = useState(emptyReviewSummary)
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    pickupLocation: '',
    destination: '',
    notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isOwnDriverAd = Boolean(user && ad?.driver?._id && String(ad.driver._id) === String(user._id))

  useEffect(() => {
    setLoading(true)
    setError('')
    setReviewSummary(emptyReviewSummary)

    API.get(`/driver-ads/${id}`)
      .then((res) => {
        setAd(res.data)
        return getDriverAdReviews(id)
          .then((reviewRes) => setReviewSummary({ ...emptyReviewSummary, ...reviewRes.data }))
          .catch(() => setReviewSummary(emptyReviewSummary))
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load driver profile'))
      .finally(() => setLoading(false))
  }, [id])

  const ratingAverage = reviewSummary.reviewCount ? reviewSummary.ratingAverage : (ad?.ratingAverage || 0)
  const reviewCount = reviewSummary.reviewCount || ad?.reviewCount || 0

  const submitRequest = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!user) {
      navigate('/signin')
      return
    }

    if (isOwnDriverAd) {
      setError('You cannot book your own driver advertisement.')
      return
    }

    if ((user.activeRole || user.role) !== 'customer') {
      setError('Switch to the user role before requesting a driver.')
      return
    }

    setBusy(true)

    try {
      await API.post('/bookings/driver', {
        driverAdId: ad._id,
        ...form
      })
      await refreshNotifications().catch(() => {})
      navigate('/bookings', {
        state: { message: 'Your reservation request has been sent. Please wait for provider approval.' }
      })
      setForm({
        startDate: '',
        endDate: '',
        pickupLocation: '',
        destination: '',
        notes: ''
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send driver request')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="page-content"><div className="container"><div className="form-card reservation-empty">Loading driver profile...</div></div></div>
  }

  if (error && !ad) {
    return <div className="page-content"><div className="container"><div className="alert alert-danger">{error}</div></div></div>
  }

  return (
    <div className="page-content reservation-page">
      <section className="page-banner page-banner-compact">
        <div className="container">
          <div className="page-banner-copy">
            <span className="page-banner-tag">Driver Profile</span>
            <h1>{ad.driver?.fullName || ad.title}</h1>
            <p>{ad.tagline}</p>
          </div>
        </div>
      </section>

      <section className="reservation-section">
        <div className="container">
          {message && <div className="alert alert-success">{message}</div>}
          {error && ad && <div className="alert alert-danger">{error}</div>}

          <div className="driver-detail-grid">
            <aside className="driver-summary-card">
              <img
                className="driver-profile-avatar"
                src={ad.photo ? getMediaImage(ad.photo, ad.driver?.fullName || ad.title) : getUserAvatar(ad.driver, ad.title)}
                alt={ad.driver?.fullName || ad.title}
              />
              <h3>{ad.driver?.fullName || ad.title}</h3>
              <p>{ad.title}</p>
              <div className="pill-row" style={{ marginTop: '1rem' }}>
                <span className={`badge ${getBadgeClass(ad.availability)}`}>{ad.availability}</span>
                <span className="badge badge-success">{ad.visibility}</span>
              </div>
              <div className="vehicle-meta-grid" style={{ marginTop: '1.5rem' }}>
                <div>
                  <span>Daily rate</span>
                  <strong>{formatCurrency(ad.dailyRate)}</strong>
                </div>
                <div>
                  <span>Experience</span>
                  <strong>{ad.experienceYears} years</strong>
                </div>
                <div>
                  <span>Trips</span>
                  <strong>{ad.completedTrips}</strong>
                </div>
                <div>
                  <span>Rating</span>
                  <strong>{Number(ratingAverage || 0).toFixed(1)}/5</strong>
                </div>
                <div>
                  <span>Reviews</span>
                  <strong>{reviewCount}</strong>
                </div>
              </div>
              <div className="driver-summary-actions">
                <a className="btn btn-outline btn-sm" href={`tel:${ad.driver?.phone || ''}`}>Call Driver</a>
                <a className="btn btn-secondary btn-sm" href={`mailto:${ad.driver?.email || ''}`}>Email Driver</a>
              </div>
            </aside>

            <div className="driver-detail-stack">
              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Driver Overview</h3>
                    <p style={{ color: 'var(--text-light)' }}>Public advertisement details customers can use before sending a booking request.</p>
                  </div>
                </div>
                <div className="info-grid">
                  <div><span>Service Area</span><strong>{ad.serviceLocation}</strong></div>
                  <div><span>Languages</span><strong>{formatList(ad.languages)}</strong></div>
                  <div><span>Preferred Contact</span><strong>{ad.preferredContact || 'Phone or email'}</strong></div>
                  <div><span>Max Group Size</span><strong>{ad.maxGroupSize} travellers</strong></div>
                </div>
                <h4 style={{ marginTop: '1.5rem' }}>Tour Specialties</h4>
                <div className="feature-list">
                  {(ad.specialties || []).map((specialty) => (
                    <span key={specialty} className="feature-chip">{specialty}</span>
                  ))}
                </div>
                <p className="detail-copy" style={{ marginTop: '1.5rem' }}>{ad.description}</p>
              </section>

              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Request This Driver</h3>
                    <p style={{ color: 'var(--text-light)' }}>Send a trip brief directly into the booking system for the driver to review.</p>
                  </div>
                  {(user && (user.activeRole || user.role) !== 'customer') && (
                    <Link className="btn btn-outline btn-sm" to="/switch-roles">Switch Role</Link>
                  )}
                </div>
                <form onSubmit={submitRequest}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Pickup Location</label>
                      <input
                        value={form.pickupLocation}
                        onChange={(e) => setForm((prev) => ({ ...prev, pickupLocation: e.target.value }))}
                        placeholder="Hotel, airport, or meeting point"
                      />
                    </div>
                    <div className="form-group">
                      <label>Destination</label>
                      <input
                        value={form.destination}
                        onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
                        placeholder="Drop-off or destination"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Trip Notes</label>
                    <textarea
                      rows="4"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Share traveller count, luggage, route notes, or any special request"
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={busy || isOwnDriverAd}>
                    {busy ? 'Sending...' : 'Request Driver'}
                  </button>
                </form>
                {isOwnDriverAd && (
                  <p className="reservation-note" style={{ marginTop: '0.75rem' }}>
                    This is your own driver listing. Booking is disabled.
                  </p>
                )}
              </section>

              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Recent Reviews</h3>
                    <p style={{ color: 'var(--text-light)' }}>Approved feedback from completed driver requests.</p>
                  </div>
                </div>
                {(reviewSummary.reviews || []).length > 0 ? (
                  <div className="quality-review-grid">
                    {reviewSummary.reviews.map((review) => (
                      <ReviewCard key={review._id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="reservation-empty">No approved reviews yet for this driver.</div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
