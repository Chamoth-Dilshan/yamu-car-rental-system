import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/axios'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { confirmBookingStatusChange, confirmPaymentUpdate } from '../utils/confirmations'
import { formatCurrency, formatDateRange, getBadgeClass } from '../utils/formatters'

export default function MyBookings() {
  const { refreshNotifications } = useAuth()
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all'
  })
  const [busyAction, setBusyAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/bookings/customer', { params: filters })
      .then((res) => {
        setBookings(res.data.bookings || [])
        setStats(res.data.stats)
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

  const summaryCards = [
    { label: 'Total Bookings', value: stats?.totalBookings || 0 },
    { label: 'Pending', value: stats?.pendingCount || 0 },
    { label: 'Confirmed', value: stats?.confirmedCount || 0 },
    { label: 'Completed', value: stats?.completedCount || 0 }
  ]

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
                  {bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.bookingNo}</td>
                      <td>
                        <strong>{booking.displayVehicle}</strong>
                        <span>{booking.bookingType === 'vehicle' ? 'Vehicle reservation' : 'Driver request'}</span>
                      </td>
                      <td>{formatDateRange(booking.startDate, booking.endDate)}</td>
                      <td>{formatCurrency(booking.totalAmount)}</td>
                      <td><span className={`badge ${getBadgeClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span></td>
                      <td><span className={`badge ${getBadgeClass(booking.bookingStatus)}`}>{booking.bookingStatus}</span></td>
                      <td>
                        <div className="table-actions">
                          {booking.bookingType === 'vehicle' && booking.vehicle?._id && (
                            <Link className="btn btn-outline btn-sm" to={`/cars/${booking.vehicle._id}`}>View</Link>
                          )}
                          {booking.bookingType === 'driver' && booking.driverAd?._id && (
                            <Link className="btn btn-outline btn-sm" to={`/drivers/${booking.driverAd._id}`}>View</Link>
                          )}
                          {booking.paymentStatus !== 'paid' && booking.bookingStatus !== 'cancelled' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              disabled={busyAction === `pay-${booking._id}`}
                              onClick={() => {
                                if (!confirmPaymentUpdate(booking.bookingNo)) {
                                  return
                                }

                                updateBooking(
                                  `/bookings/${booking._id}/payment`,
                                  { paymentStatus: 'paid' },
                                  'Payment marked as paid',
                                  `pay-${booking._id}`
                                )
                              }}
                            >
                              {busyAction === `pay-${booking._id}` ? 'Saving...' : 'Mark Paid'}
                            </button>
                          )}
                          {['pending', 'confirmed'].includes(booking.bookingStatus) && (
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              disabled={busyAction === `cancel-${booking._id}`}
                              onClick={() => {
                                if (!confirmBookingStatusChange(booking.bookingNo, 'cancel')) {
                                  return
                                }

                                updateBooking(
                                  `/bookings/${booking._id}/cancel`,
                                  {},
                                  'Booking cancelled',
                                  `cancel-${booking._id}`
                                )
                              }}
                            >
                              {busyAction === `cancel-${booking._id}` ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
