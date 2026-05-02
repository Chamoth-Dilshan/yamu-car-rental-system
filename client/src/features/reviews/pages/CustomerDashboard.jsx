import { useEffect, useMemo, useState } from 'react'
import { FaBell, FaCalendarCheck, FaCarSide, FaCreditCard, FaRegStar, FaUserCircle } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { getCustomerPayments } from '../../payments/paymentApi'
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

const quickActions = [
  { label: 'Browse Cars', helper: 'Find another rental', to: '/cars', icon: FaCarSide },
  { label: 'My Bookings', helper: 'Manage trips', to: '/bookings', icon: FaCalendarCheck },
  { label: 'Payment Cards', helper: 'Update saved cards', to: '/payments/cards', icon: FaCreditCard },
  { label: 'My Reviews', helper: 'View feedback', to: '/reviews', icon: FaRegStar },
  { label: 'Notifications', helper: 'Check alerts', to: '/notifications', icon: FaBell },
  { label: 'Profile', helper: 'Complete details', to: '/profile', icon: FaUserCircle }
]

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

export default function CustomerDashboard() {
  const { user, notifications } = useAuth()
  const [bookingStats, setBookingStats] = useState(emptyBookingStats)
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    Promise.allSettled([
      getCustomerBookings(),
      getCustomerPayments(),
      getMyReviews()
    ])
      .then(([bookingResult, paymentResult, reviewResult]) => {
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

        if (paymentResult.status === 'fulfilled') {
          setPayments(paymentResult.value.data.payments || [])
        }

        if (reviewResult.status === 'fulfilled') {
          setReviews(reviewResult.value.data.reviews || [])
        }

        if (
          bookingResult.status === 'fulfilled'
          && (paymentResult.status === 'rejected' || reviewResult.status === 'rejected')
        ) {
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

  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings])

  const latestPayment = useMemo(() => (
    [...payments].sort((first, second) => getTime(second.createdAt) - getTime(first.createdAt))[0] || null
  ), [payments])

  const paymentStats = useMemo(() => ({
    pending: payments.filter((payment) => ['pending', 'processing'].includes(payment.status)).length,
    paid: payments.filter((payment) => payment.status === 'paid').length,
    refunded: payments.filter((payment) => payment.status === 'refunded').length,
    dueBookings: bookings.filter((booking) => (
      ['completed', 'closed'].includes(booking.bookingStatus) && booking.paymentStatus === 'pending'
    )).length
  }), [bookings, payments])

  const reviewedBookingKeys = useMemo(() => (
    new Set(
      reviews
        .flatMap((review) => [review.booking?._id, review.booking, review.bookingNo])
        .filter(Boolean)
        .map(String)
    )
  ), [reviews])

  const reviewableBookings = useMemo(() => (
    bookings
      .filter(canReviewBooking)
      .filter((booking) => (
        !reviewedBookingKeys.has(String(booking._id))
        && !reviewedBookingKeys.has(String(booking.bookingNo))
      ))
      .slice(0, 3)
  ), [bookings, reviewedBookingKeys])

  const recentNotifications = useMemo(() => (
    [...(notifications || [])]
      .sort((first, second) => getTime(second.createdAt) - getTime(first.createdAt))
      .slice(0, 3)
  ), [notifications])

  const profileChecks = useMemo(() => ([
    { label: 'Name', complete: Boolean(user?.fullName) },
    { label: 'Email', complete: Boolean(user?.email) },
    { label: 'Phone', complete: Boolean(user?.phone) },
    { label: 'City', complete: Boolean(user?.city) },
    { label: 'Address', complete: Boolean(user?.address) },
    { label: 'Emergency contact', complete: Boolean(user?.emergencyContact?.name && user?.emergencyContact?.phone) }
  ]), [user])

  const calculatedProfileCompletion = Math.round(
    (profileChecks.filter((item) => item.complete).length / profileChecks.length) * 100
  )
  const profileCompletion = user?.profileCompletion?.percent ?? calculatedProfileCompletion
  const missingProfileItems = profileChecks.filter((item) => !item.complete).slice(0, 3)

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

        <div className="customer-dashboard-grid">
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
                  <h3>Recent Bookings</h3>
                  <p style={{ color: 'var(--text-light)' }}>Review your latest trips, payment state, and next actions.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/bookings">View All</Link>
              </div>

              {loading ? (
                <div className="reservation-empty">Loading bookings...</div>
              ) : recentBookings.length > 0 ? (
                <div className="table-shell">
                  <table className="reservation-table dashboard-table">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Dates</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>
                            <strong>{booking.displayVehicle}</strong>
                            <span>{booking.bookingNo}</span>
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
                            <div className="table-actions">
                              {['completed', 'closed'].includes(booking.bookingStatus) && booking.paymentStatus === 'pending' && (
                                <Link className="btn btn-secondary btn-sm" to={`/payments/checkout/${booking._id}`}>Pay Now</Link>
                              )}
                              {canReviewBooking(booking)
                                && !reviewedBookingKeys.has(String(booking._id))
                                && !reviewedBookingKeys.has(String(booking.bookingNo)) && (
                                <Link className="btn btn-primary btn-sm" to={`/bookings/${booking._id}/review`}>Review</Link>
                              )}
                              <Link className="btn btn-outline btn-sm" to="/bookings">Details</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="reservation-empty dashboard-empty-action">
                  <span>No bookings found.</span>
                  <Link className="btn btn-primary btn-sm" to="/cars">Book a Car</Link>
                </div>
              )}
            </section>
          </div>

          <aside className="dashboard-stack">
            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p style={{ color: 'var(--text-light)' }}>Open the account areas you use most.</p>
                </div>
              </div>
              <div className="dashboard-action-grid">
                {quickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <Link key={action.to} className="dashboard-action-link" to={action.to}>
                      <span className="dashboard-action-icon"><Icon /></span>
                      <span>
                        <strong>{action.label}</strong>
                        <small>{action.helper}</small>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Payment Summary</h3>
                  <p style={{ color: 'var(--text-light)' }}>Track dues, completed payments, and refunds.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/payments/history">History</Link>
              </div>
              <div className="dashboard-summary-list">
                <div className="dashboard-summary-row">
                  <span>Payment due bookings</span>
                  <strong>{loading ? '...' : paymentStats.dueBookings}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Pending or processing</span>
                  <strong>{loading ? '...' : paymentStats.pending}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Paid payments</span>
                  <strong>{loading ? '...' : paymentStats.paid}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Refunded</span>
                  <strong>{loading ? '...' : paymentStats.refunded}</strong>
                </div>
              </div>
              {latestPayment && (
                <div className="dashboard-latest-payment">
                  <span>Latest payment</span>
                  <strong>{latestPayment.paymentNo}</strong>
                  <small>
                    {formatCurrency(latestPayment.amount)} | {getPaymentStatusLabel(latestPayment.status)} | {formatDateTime(latestPayment.createdAt)}
                  </small>
                </div>
              )}
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Profile Completion</h3>
                  <p style={{ color: 'var(--text-light)' }}>Complete contact details to make booking approvals smoother.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/profile">Edit</Link>
              </div>
              <div className="account-progress">
                <div className="account-progress-track">
                  <div className="account-progress-fill" style={{ width: `${profileCompletion}%` }} />
                </div>
                <strong>{profileCompletion}% complete</strong>
              </div>
              {missingProfileItems.length > 0 ? (
                <div className="pill-row">
                  {missingProfileItems.map((item) => (
                    <span key={item.label} className="badge badge-warning">{item.label} missing</span>
                  ))}
                </div>
              ) : (
                <span className="badge badge-success">Core profile details complete</span>
              )}
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Review Reminders</h3>
                  <p style={{ color: 'var(--text-light)' }}>Share feedback for completed paid bookings.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/reviews">Reviews</Link>
              </div>
              {loading ? (
                <div className="reservation-empty">Checking review reminders...</div>
              ) : reviewableBookings.length > 0 ? (
                <div className="dashboard-compact-list">
                  {reviewableBookings.map((booking) => (
                    <div key={booking._id} className="dashboard-compact-item">
                      <div>
                        <strong>{booking.displayVehicle}</strong>
                        <span>{booking.bookingNo} | {formatDateRange(booking.startDate, booking.endDate)}</span>
                      </div>
                      <Link className="btn btn-primary btn-sm" to={`/bookings/${booking._id}/review`}>Write Review</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No review reminders right now.</div>
              )}
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Notifications</h3>
                  <p style={{ color: 'var(--text-light)' }}>Latest booking, payment, and account alerts.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/notifications">View All</Link>
              </div>
              {recentNotifications.length > 0 ? (
                <div className="notification-feed dashboard-notification-feed">
                  {recentNotifications.map((notification) => (
                    <div key={notification._id} className={`notification-card${notification.isRead ? '' : ' unread'}`}>
                      <div className="notification-card-copy">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <small>{formatDateTime(notification.createdAt)}</small>
                      </div>
                      {notification.link && (
                        <Link className="btn btn-primary btn-sm" to={notification.link}>Open</Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No notifications yet.</div>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
