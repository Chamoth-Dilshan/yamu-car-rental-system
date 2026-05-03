import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCarSide, FaRegStar, FaStar, FaUserTie } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { getCustomerBookings } from '../../reservations/bookingApi'
import { formatCurrency, formatDateRange, formatDateTime, getBadgeClass } from '../../../utils/formatters'
import { getMyReviews } from '../reviewApi'

const emptyBookingStats = {
  totalBookings: 0,
  pendingCount: 0,
  confirmedCount: 0,
  completedCount: 0
}

const bookingStatusLabels = {
  pending: 'Waiting for approval',
  confirmed: 'Confirmed',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled'
}

const paymentStatusLabels = {
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  refunded: 'Refunded',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

const reviewStatusLabels = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected'
}

const getTime = (value) => {
  const time = value ? new Date(value).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

const getBookingStatusLabel = (booking) => (
  bookingStatusLabels[booking.bookingStatus] || booking.bookingStatus || 'Pending'
)

const getPaymentStatusLabel = (status) => paymentStatusLabels[status] || status || 'Pending'

const getBookingLink = (booking) => {
  if (booking.bookingType === 'vehicle' && booking.vehicle?._id) {
    return `/cars/${booking.vehicle._id}`
  }

  if (booking.bookingType === 'driver' && booking.driverAd?._id) {
    return `/drivers/${booking.driverAd._id}`
  }

  return '/bookings'
}

const canReviewBooking = (booking) => (
  ['completed', 'closed'].includes(booking.bookingStatus) && booking.paymentStatus === 'paid'
)

function RatingStars({ rating = 0 }) {
  const normalizedRating = Number(rating || 0)

  return (
    <span className="dashboard-review-stars" aria-label={`${normalizedRating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        value <= normalizedRating
          ? <FaStar key={value} className="filled" />
          : <FaRegStar key={value} />
      ))}
    </span>
  )
}

function ReviewDetails({ review }) {
  if (!review) {
    return null
  }

  return (
    <div className="dashboard-review-summary">
      <div className="dashboard-review-title">
        <span className={`badge ${getBadgeClass(review.status)}`}>
          {reviewStatusLabels[review.status] || review.status || 'Review submitted'}
        </span>
        <small>{formatDateTime(review.updatedAt || review.createdAt)}</small>
      </div>
      <p>&ldquo;{review.feedback}&rdquo;</p>
      <div className="dashboard-review-ratings">
        {review.vehicleRating && (
          <span>
            <FaCarSide />
            Vehicle
            <RatingStars rating={review.vehicleRating} />
          </span>
        )}
        {review.driverRating && (
          <span>
            <FaUserTie />
            Driver
            <RatingStars rating={review.driverRating} />
          </span>
        )}
      </div>
      {review.status === 'rejected' && review.rejectionReason && (
        <div className="dashboard-review-rejection">{review.rejectionReason}</div>
      )}
      <Link className="btn btn-outline btn-sm" to="/reviews">Open Review</Link>
    </div>
  )
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [bookingStats, setBookingStats] = useState(emptyBookingStats)
  const [bookings, setBookings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    Promise.allSettled([
      getCustomerBookings(),
      getMyReviews()
    ])
      .then(([bookingResult, reviewResult]) => {
        if (!active) {
          return
        }

        if (bookingResult.status === 'fulfilled') {
          const bookingRes = bookingResult.value
          setBookingStats({ ...emptyBookingStats, ...(bookingRes.data.stats || {}) })
          setBookings(bookingRes.data.bookings || [])
        } else {
          setError(bookingResult.reason?.response?.data?.message || 'Failed to load dashboard')
        }

        if (reviewResult.status === 'fulfilled') {
          setReviews(reviewResult.value.data.reviews || [])
        }

        if (bookingResult.status === 'fulfilled' && reviewResult.status === 'rejected') {
          setError('Some dashboard details could not be loaded.')
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
    { label: 'Total Bookings', value: loading ? '...' : bookingStats.totalBookings || 0 },
    { label: 'Pending', value: loading ? '...' : bookingStats.pendingCount || 0 },
    { label: 'Confirmed', value: loading ? '...' : bookingStats.confirmedCount || 0 },
    { label: 'Completed', value: loading ? '...' : bookingStats.completedCount || 0 }
  ]

  const upcomingBooking = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const activeBookings = bookings.filter((booking) => ['pending', 'confirmed'].includes(booking.bookingStatus))
    const upcomingBookings = activeBookings
      .filter((booking) => getTime(booking.endDate) >= todayStart.getTime())
      .sort((first, second) => getTime(first.startDate) - getTime(second.startDate))

    return upcomingBookings[0] || activeBookings[0] || null
  }, [bookings])

  const recentCompletedBookings = useMemo(() => (
    bookings
      .filter((booking) => ['completed', 'closed'].includes(booking.bookingStatus))
      .sort((first, second) => (
        getTime(second.endDate) - getTime(first.endDate)
        || getTime(second.updatedAt) - getTime(first.updatedAt)
        || getTime(second.createdAt) - getTime(first.createdAt)
      ))
      .slice(0, 5)
  ), [bookings])

  const reviewsByBookingKey = useMemo(() => {
    const reviewMap = new Map()

    reviews.forEach((review) => {
      const keys = [
        review.booking?._id,
        review.booking,
        review.bookingNo
      ]

      keys
        .filter(Boolean)
        .map(String)
        .forEach((key) => reviewMap.set(key, review))
    })

    return reviewMap
  }, [reviews])

  const getReviewForBooking = (booking) => (
    reviewsByBookingKey.get(String(booking._id))
      || reviewsByBookingKey.get(String(booking.bookingNo))
      || null
  )

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header quality-header">
          <div>
            <h2>Customer Dashboard</h2>
            <p style={{ color: 'var(--text-light)' }}>
              Welcome back, {user?.fullName?.split(' ')[0] || 'Customer'}. Track your booking activity from one place.
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

        <div className="dashboard-stack">
            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Upcoming Booking</h3>
                  <p style={{ color: 'var(--text-light)' }}>Your next approved or pending trip appears here.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/cars">Book Another Car</Link>
              </div>

              {loading ? (
                <div className="reservation-empty">Loading upcoming booking...</div>
              ) : upcomingBooking ? (
                <div className="dashboard-booking-highlight">
                  <div className="dashboard-booking-heading">
                    <div>
                      <span className={`badge ${getBadgeClass(upcomingBooking.bookingStatus)}`}>
                        {getBookingStatusLabel(upcomingBooking)}
                      </span>
                      <h3>{upcomingBooking.displayVehicle}</h3>
                      <p>{upcomingBooking.bookingNo} | {upcomingBooking.bookingType === 'vehicle' ? 'Vehicle reservation' : 'Driver request'}</p>
                    </div>
                    <strong>{formatCurrency(upcomingBooking.totalAmount)}</strong>
                  </div>

                  <div className="dashboard-detail-grid">
                    <div className="dashboard-detail-item">
                      <span>Dates</span>
                      <strong>{formatDateRange(upcomingBooking.startDate, upcomingBooking.endDate)}</strong>
                    </div>
                    <div className="dashboard-detail-item">
                      <span>Pickup</span>
                      <strong>{upcomingBooking.pickupLocation || 'Not set'}</strong>
                    </div>
                    <div className="dashboard-detail-item">
                      <span>Payment</span>
                      <strong>{getPaymentStatusLabel(upcomingBooking.paymentStatus)}</strong>
                    </div>
                  </div>

                  <div className="table-actions">
                    <Link className="btn btn-outline btn-sm" to={getBookingLink(upcomingBooking)}>View Service</Link>
                    <Link className="btn btn-secondary btn-sm" to="/bookings">Manage Booking</Link>
                  </div>
                </div>
              ) : (
                <div className="reservation-empty dashboard-empty-action">
                  <span>No upcoming bookings yet.</span>
                  <Link className="btn btn-primary btn-sm" to="/cars">Explore Cars</Link>
                </div>
              )}
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Recent Completed Bookings</h3>
                  <p style={{ color: 'var(--text-light)' }}>Review your latest completed trips and submitted feedback.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/bookings">View All</Link>
              </div>

              {loading ? (
                <div className="reservation-empty">Loading completed bookings...</div>
              ) : recentCompletedBookings.length > 0 ? (
                <div className="table-shell">
                  <table className="reservation-table dashboard-table">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Dates</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCompletedBookings.map((booking) => {
                        const review = getReviewForBooking(booking)

                        return (
                          <tr key={booking._id}>
                            <td>
                              <strong>{booking.displayVehicle}</strong>
                              <span>{booking.bookingNo}</span>
                              <span>{booking.bookingType === 'vehicle' ? 'Vehicle reservation' : 'Driver request'}</span>
                            </td>
                            <td>{formatDateRange(booking.startDate, booking.endDate)}</td>
                            <td>{formatCurrency(booking.totalAmount)}</td>
                            <td>
                              <span className={`badge ${getBadgeClass(booking.bookingStatus)}`}>
                                {getBookingStatusLabel(booking)}
                              </span>
                              <span>{getPaymentStatusLabel(booking.paymentStatus)}</span>
                            </td>
                            <td>
                              {review ? (
                                <ReviewDetails review={review} />
                              ) : (
                                <div className="table-actions">
                                  {booking.paymentStatus === 'pending' ? (
                                    <Link className="btn btn-secondary btn-sm" to={`/payments/checkout/${booking._id}`}>Pay Now</Link>
                                  ) : canReviewBooking(booking) ? (
                                    <Link className="btn btn-primary btn-sm" to={`/bookings/${booking._id}/review`}>Write Review</Link>
                                  ) : (
                                    <button className="btn btn-outline btn-sm" type="button" disabled>
                                      Review unavailable
                                    </button>
                                  )}
                                  <Link className="btn btn-outline btn-sm" to="/bookings">Details</Link>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="reservation-empty dashboard-empty-action">
                  <span>No completed bookings found.</span>
                  <Link className="btn btn-primary btn-sm" to="/cars">Book a Car</Link>
                </div>
              )}
            </section>
        </div>
      </main>
    </div>
  )
}
