import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import { getCustomerPayments } from '../paymentApi'

const methodLabels = {
  card: 'New Card',
  saved_card: 'Saved Card',
  cash: 'Cash on Pickup',
  bank_transfer: 'Bank Transfer',
  admin_manual: 'Admin Manual'
}

export default function PaymentHistory() {
  const location = useLocation()
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: 'all', method: 'all' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(location.state?.message || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    getCustomerPayments(filters)
      .then((res) => {
        setPayments(res.data.payments || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load payments'))
      .finally(() => setLoading(false))
  }, [filters])

  const summaryCards = [
    { label: 'Total Payments', value: stats?.totalPayments || 0 },
    { label: 'Processing', value: stats?.processingCount || 0 },
    { label: 'Paid', value: stats?.paidCount || 0 },
    { label: 'Refunded', value: stats?.refundedCount || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Payment History</h2>
          <p style={{ color: 'var(--text-light)' }}>Track card, cash, bank transfer, verification, and refund activity.</p>
        </div>

        {message && (
          <div className="alert alert-success">
            {message}
            <button className="link-button" type="button" onClick={() => setMessage('')}>Dismiss</button>
          </div>
        )}
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
              <h3>Transactions</h3>
              <p style={{ color: 'var(--text-light)' }}>Search by payment number, transaction ID, booking, customer, or card last digits.</p>
            </div>
            <div className="table-actions">
              <Link className="btn btn-outline btn-sm" to="/payments/cards">Saved Cards</Link>
              <Link className="btn btn-secondary btn-sm" to="/bookings">Bookings</Link>
            </div>
          </div>

          <div className="filter-grid filter-grid-4">
            <input
              value={filters.search}
              placeholder="Search payment, transaction, booking..."
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select value={filters.method} onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))}>
              <option value="all">All Methods</option>
              <option value="card">New Card</option>
              <option value="saved_card">Saved Card</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="admin_manual">Admin Manual</option>
            </select>
            <button className="btn btn-outline" type="button" onClick={() => setFilters({ search: '', status: 'all', method: 'all' })}>Reset</button>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading payments...</div>
          ) : payments.length ? (
            <div className="table-shell">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Booking</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        <strong>{payment.paymentNo}</strong>
                        <span>{payment.transactionId || 'No transaction yet'}</span>
                        <span>{formatDateTime(payment.createdAt)}</span>
                      </td>
                      <td>
                        <strong>{payment.bookingSnapshot?.bookingNo || payment.booking?.bookingNo}</strong>
                        <span>{payment.bookingSnapshot?.vehicleOrDriverName || payment.bookingSnapshot?.serviceName}</span>
                      </td>
                      <td>
                        <strong>{methodLabels[payment.method] || payment.method}</strong>
                        {['card', 'saved_card'].includes(payment.method) && (
                          <span>{payment.cardSnapshot?.brand || 'Card'} ending {payment.cardSnapshot?.last4 || '****'}</span>
                        )}
                        {payment.method === 'bank_transfer' && <span>{payment.bankTransfer?.bankName || 'Bank'} ref {payment.bankTransfer?.referenceNo || '-'}</span>}
                      </td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td><PaymentStatusBadge status={payment.status} /></td>
                      <td>
                        <div className="table-actions">
                          {payment.status === 'paid' && (
                            <Link className="btn btn-outline btn-sm" to={`/payments/${payment._id}/receipt`}>View Receipt</Link>
                          )}
                          {payment.booking?._id && <Link className="btn btn-secondary btn-sm" to="/bookings">Booking</Link>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reservation-empty">No payments found for the current filters.</div>
          )}
        </section>
      </main>
    </div>
  )
}
