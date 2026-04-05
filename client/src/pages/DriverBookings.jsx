import { useEffect, useState } from 'react'
import API from '../api/axios'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { confirmBookingStatusChange } from '../utils/confirmations'
import { formatCurrency, formatDateRange, getBadgeClass } from '../utils/formatters'

export default function DriverBookings() {
  const { refreshNotifications } = useAuth()
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all'
  })
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/bookings/driver/list', { params: filters })
      .then((res) => {
        setBookings(res.data.bookings || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load booking requests'))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  const updateStatus = async (bookingId, bookingStatus) => {
    const targetBooking = bookings.find((item) => item._id === bookingId)
    const actionLabel = bookingStatus === 'confirmed'
      ? 'confirm'
      : bookingStatus === 'completed'
        ? 'complete'
        : 'cancel'

    if (!confirmBookingStatusChange(targetBooking?.bookingNo || 'this request', actionLabel)) {
      return
    }

    const actionKey = `${bookingId}-${bookingStatus}`
    setBusyAction(actionKey)
    setMessage('')
    setError('')

    try {
      await API.put(`/bookings/${bookingId}/driver-status`, { bookingStatus })
      await refreshNotifications().catch(() => {})
      setMessage('Booking request updated')
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request')
    } finally {
      setBusyAction('')
    }
  }

  const summaryCards = [
    { label: 'Total Requests', value: stats?.totalBookings || 0 },
    { label: 'Pending', value: stats?.pendingCount || 0 },
    { label: 'Confirmed', value: stats?.confirmedCount || 0 },
    { label: 'Completed', value: stats?.completedCount || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Booking Requests</h2>
          <p style={{ color: 'var(--text-light)' }}>Review customer trip requests that came in through your public driver advertisements.</p>
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
              <h3>Incoming Requests</h3>
              <p style={{ color: 'var(--text-light)' }}>Filter by status, then confirm, complete, or cancel customer requests as they move through the workflow.</p>
            </div>
          </div>

          <div className="filter-grid filter-grid-3">
            <input
              value={filters.search}
              placeholder="Search booking no, route, service..."
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="all">All Booking Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', status: 'all' })}>
              Reset
            </button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading requests...</div>
          ) : bookings.length > 0 ? (
            <div className="table-shell">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Booking No</th>
                    <th>Service</th>
                    <th>Customer</th>
                    <th>Dates</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.bookingNo}</td>
                      <td>
                        <strong>{booking.displayVehicle}</strong>
                        <span>{booking.pickupLocation || booking.destination || 'Trip details pending'}</span>
                      </td>
                      <td>
                        <strong>{booking.customer?.fullName}</strong>
                        <span>{booking.customer?.email}</span>
                      </td>
                      <td>{formatDateRange(booking.startDate, booking.endDate)}</td>
                      <td>{formatCurrency(booking.totalAmount)}</td>
                      <td><span className={`badge ${getBadgeClass(booking.bookingStatus)}`}>{booking.bookingStatus}</span></td>
                      <td><span className={`badge ${getBadgeClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span></td>
                      <td>
                        <div className="table-actions">
                          {booking.bookingStatus === 'pending' && (
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              disabled={busyAction === `${booking._id}-confirmed`}
                              onClick={() => updateStatus(booking._id, 'confirmed')}
                            >
                              {busyAction === `${booking._id}-confirmed` ? 'Saving...' : 'Confirm'}
                            </button>
                          )}
                          {booking.bookingStatus === 'confirmed' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              disabled={busyAction === `${booking._id}-completed`}
                              onClick={() => updateStatus(booking._id, 'completed')}
                            >
                              {busyAction === `${booking._id}-completed` ? 'Saving...' : 'Complete'}
                            </button>
                          )}
                          {['pending', 'confirmed'].includes(booking.bookingStatus) && (
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              disabled={busyAction === `${booking._id}-cancelled`}
                              onClick={() => updateStatus(booking._id, 'cancelled')}
                            >
                              {busyAction === `${booking._id}-cancelled` ? 'Saving...' : 'Cancel'}
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
            <div className="reservation-empty">No booking requests matched the current filters.</div>
          )}
        </section>
      </main>
    </div>
  )
}
