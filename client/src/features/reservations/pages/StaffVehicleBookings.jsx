import { useEffect, useState } from 'react'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDateRange, getBadgeClass } from '../../../utils/formatters'

export default function StaffVehicleBookings() {
  const { refreshNotifications } = useAuth()
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all'
  })
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get('/bookings/staff/list', { params: filters })
      .then((res) => {
        setBookings(res.data.bookings || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load vehicle requests'))
      .finally(() => setLoading(false))
  }, [filters, reloadKey])

  const updateBooking = async (bookingId, bookingStatus, actionKey) => {
    setBusyAction(actionKey)
    setMessage('')
    setError('')

    try {
      await API.put(`/bookings/${bookingId}/staff-status`, { bookingStatus })
      await refreshNotifications().catch(() => {})
      setMessage('Vehicle booking updated')
      setReloadKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update vehicle booking')
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
          <h2>Vehicle Requests</h2>
          <p style={{ color: 'var(--text-light)' }}>Review customer reservations that came in through your store vehicle listings.</p>
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
              <h3>Incoming Reservations</h3>
              <p style={{ color: 'var(--text-light)' }}>Filter by booking or payment state, then update the reservation workflow from one place.</p>
            </div>
          </div>

          <div className="filter-grid filter-grid-4">
            <input
              value={filters.search}
              placeholder="Search booking no, vehicle, location..."
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
            <div className="reservation-empty">Loading vehicle requests...</div>
          ) : bookings.length > 0 ? (
            <div className="table-shell">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Booking No</th>
                    <th>Vehicle</th>
                    <th>Customer</th>
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
                        <span>{booking.pickupLocation || booking.destination || 'Reservation details pending'}</span>
                      </td>
                      <td>
                        <strong>{booking.customer?.fullName || 'Unknown customer'}</strong>
                        <span>{booking.customer?.email}</span>
                      </td>
                      <td>{formatDateRange(booking.startDate, booking.endDate)}</td>
                      <td>{formatCurrency(booking.totalAmount)}</td>
                      <td><span className={`badge ${getBadgeClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span></td>
                      <td><span className={`badge ${getBadgeClass(booking.bookingStatus)}`}>{booking.bookingStatus}</span></td>
                      <td>
                        <div className="table-actions">
                          {booking.bookingStatus === 'pending' && (
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              disabled={busyAction === `confirm-${booking._id}`}
                              onClick={() => updateBooking(booking._id, 'confirmed', `confirm-${booking._id}`)}
                            >
                              {busyAction === `confirm-${booking._id}` ? 'Saving...' : 'Confirm'}
                            </button>
                          )}
                          {['pending', 'confirmed'].includes(booking.bookingStatus) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              type="button"
                              disabled={busyAction === `complete-${booking._id}`}
                              onClick={() => updateBooking(booking._id, 'completed', `complete-${booking._id}`)}
                            >
                              {busyAction === `complete-${booking._id}` ? 'Saving...' : 'Complete'}
                            </button>
                          )}
                          {!['cancelled', 'closed'].includes(booking.bookingStatus) && (
                            <button
                              className="btn btn-outline btn-sm"
                              type="button"
                              disabled={busyAction === `close-${booking._id}`}
                              onClick={() => updateBooking(booking._id, 'closed', `close-${booking._id}`)}
                            >
                              {busyAction === `close-${booking._id}` ? 'Saving...' : 'Close'}
                            </button>
                          )}
                          {booking.bookingStatus !== 'cancelled' && (
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              disabled={busyAction === `cancel-${booking._id}`}
                              onClick={() => updateBooking(booking._id, 'cancelled', `cancel-${booking._id}`)}
                            >
                              {busyAction === `cancel-${booking._id}` ? 'Saving...' : 'Cancel'}
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
            <div className="reservation-empty">No vehicle requests matched the current filters.</div>
          )}
        </section>
      </main>
    </div>
  )
}
