import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { getCustomerPayments } from '../../payments/paymentApi'
import API, { getCustomerBookings } from '../bookingApi'
import { formatCurrency, formatDateRange, getBadgeClass } from '../../../utils/formatters'

export default function MyBookings() {
  const location = useLocation()
  const { refreshNotifications } = useAuth()
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all'
  })
  const [busyAction, setBusyAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(location.state?.message || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    Promise.all([
      getCustomerBookings(filters),
      getCustomerPayments()
    ])
      .then(([bookingRes, paymentRes]) => {
        setBookings(bookingRes.data.bookings || [])
        setPayments(paymentRes.data.payments || [])
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  const updateBooking = async (endpoint, payload, successMessage, actionKey) => {
    setBusyAction(actionKey)
    setMessage('')
    setError('')

    try {
      await API.put(endpoint, payload)
      await refreshNotifications().catch(() => {})
      setMessage(successMessage)
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update booking')
    } finally {
      setBusyAction('')
    }
  }

  const getLatestPayment = (bookingId) => (
    payments.find((payment) => String(payment.booking?._id || payment.booking) === String(bookingId))
  )

  const getBookingStatusLabel = (booking) => {
    if (booking.bookingStatus === 'pending') {
      return 'Waiting for approval'
    }

    if (booking.bookingStatus === 'cancelled') {
      return 'Cancelled'
    }

    return booking.bookingStatus
  }

  const getPaymentLabel = (booking, latestPayment) => {
    if (booking.bookingStatus === 'cancelled') {
      if (booking.paymentStatus === 'refunded') {
        return 'Refunded'
      }

      if (booking.paymentStatus === 'paid') {
        return 'Refund Pending'
      }

      return 'Cancelled'
    }

    if (booking.paymentStatus === 'paid') {
      return 'Paid'
    }

    if (booking.paymentStatus === 'refunded') {
      return 'Refunded'
    }

    if (latestPayment?.status === 'processing') {
      return 'Pending verification'
    }

    if (booking.bookingStatus === 'completed') {
      return 'Payment required'
    }

    if (booking.bookingStatus === 'confirmed') {
      return 'Pay after trip'
    }

    return 'Waiting for approval'
  }

  const canReviewBooking = (booking) => (
    ['completed', 'closed'].includes(booking.bookingStatus)
    && booking.paymentStatus === 'paid'
  )

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>My Bookings</h2>
          <p style={{ color: 'var(--text-light)' }}>Track vehicle reservations and driver requests from one place.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Booking History</h3>
              <p style={{ color: 'var(--text-light)' }}>Search your reservations, review payment state, and open linked detail pages.</p>
            </div>
            <Link className="btn btn-outline btn-sm" to="/cars">Book Another Car</Link>
          </div>

          <div className="filter-grid filter-grid-4">
            <input
              value={filters.search}
              placeholder="Search booking no, service, location..."
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </select>
            <select value={filters.paymentStatus} onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))}>
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', status: 'all', paymentStatus: 'all' })}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading bookings...</div>
          ) : bookings.length > 0 ? (
            <div className="table-shell">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Booking No</th>
                    <th>Service</th>
                    <th>Dates</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const latestPayment = getLatestPayment(booking._id)
                    const isProcessing = latestPayment?.status === 'processing'
                    const paymentDisplayStatus = isProcessing ? 'processing' : booking.paymentStatus
                    const canReviewCurrentBooking = canReviewBooking(booking)

                    return (
                      <tr key={booking._id}>
                        <td>{booking.bookingNo}</td>
                        <td>
                          <strong>{booking.displayVehicle}</strong>
                          <span>{booking.bookingType === 'vehicle' ? 'Vehicle reservation' : 'Driver request'}</span>
                        </td>
                        <td>{formatDateRange(booking.startDate, booking.endDate)}</td>
                        <td>{formatCurrency(booking.totalAmount)}</td>
                        <td><span className={`badge ${getBadgeClass(paymentDisplayStatus)}`}>{getPaymentLabel(booking, latestPayment)}</span></td>
                        <td><span className={`badge ${getBadgeClass(booking.bookingStatus)}`}>{getBookingStatusLabel(booking)}</span></td>
                        <td>
                          <div className="table-actions">
                            {booking.bookingType === 'vehicle' && booking.vehicle?._id && (
                              <Link className="btn btn-outline btn-sm" to={`/cars/${booking.vehicle._id}`}>View</Link>
                            )}
                            {booking.bookingType === 'driver' && booking.driverAd?._id && (
                              <Link className="btn btn-outline btn-sm" to={`/drivers/${booking.driverAd._id}`}>View</Link>
                            )}
                            {booking.bookingStatus === 'pending' && booking.paymentStatus === 'pending' && (
                              <button className="btn btn-outline btn-sm" type="button" disabled>
                                Waiting for approval
                              </button>
                            )}
                            {['confirmed', 'completed'].includes(booking.bookingStatus) && booking.paymentStatus === 'pending' && isProcessing && (
                              <button className="btn btn-outline btn-sm" type="button" disabled>
                                Pending verification
                              </button>
                            )}
                            {booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'pending' && !isProcessing && (
                              <button className="btn btn-outline btn-sm" type="button" disabled>
                                Pay after trip
                              </button>
                            )}
                            {booking.bookingStatus === 'completed' && booking.paymentStatus === 'pending' && !isProcessing && (
                              <Link className="btn btn-secondary btn-sm" to={`/payments/checkout/${booking._id}`}>
                                Pay Now
                              </Link>
                            )}
                            {booking.bookingStatus === 'cancelled' && booking.paymentStatus === 'pending' && (
                              <button className="btn btn-outline btn-sm" type="button" disabled>
                                Cancelled
                              </button>
                            )}
                            {booking.bookingStatus === 'cancelled' && booking.paymentStatus === 'paid' && (
                              <button className="btn btn-outline btn-sm" type="button" disabled>
                                Refund Pending
                              </button>
                            )}
                            {booking.paymentStatus === 'paid' && booking.bookingStatus !== 'cancelled' && latestPayment?._id && (
                              <Link className="btn btn-secondary btn-sm" to={`/payments/${latestPayment._id}/receipt`}>
                                View Receipt
                              </Link>
                            )}
                            {booking.paymentStatus === 'refunded' && (
                              <button className="btn btn-outline btn-sm" type="button" disabled>
                                Refunded
                              </button>
                            )}
                            {canReviewCurrentBooking && (
                              <Link className="btn btn-primary btn-sm" to={`/bookings/${booking._id}/review`}>
                                Review
                              </Link>
                            )}
                            <Link className="btn btn-outline btn-sm" to={`/bookings/${booking._id}/complaint`}>
                              Complaint
                            </Link>
                            {['pending', 'confirmed'].includes(booking.bookingStatus) && (
                              <button
                                className="btn btn-danger btn-sm"
                                type="button"
                                disabled={busyAction === `cancel-${booking._id}`}
                                onClick={() => updateBooking(
                                  `/bookings/${booking._id}/cancel`,
                                  {},
                                  'Booking cancelled',
                                  `cancel-${booking._id}`
                                )}
                              >
                                {busyAction === `cancel-${booking._id}` ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reservation-empty">No bookings found for the current filters.</div>
          )}
        </section>
      </main>
    </div>
  )
}
