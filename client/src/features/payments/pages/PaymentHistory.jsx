import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import { getCustomerPayments } from '../paymentApi'

const methodLabels = {
  card: 'Card Payment',
  saved_card: 'Card Payment',
  cash: 'Cash on Pickup',
  bank_transfer: 'Bank Transfer',
  admin_manual: 'Admin Manual'
}

export default function PaymentHistory() {
  const location = useLocation()
  const [payments, setPayments] = useState([])
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
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load payments'))
      .finally(() => setLoading(false))
  }, [filters])

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        {message && (
          <div className="alert alert-success">
            {message}
            <button className="link-button" type="button" onClick={() => setMessage('')}>Dismiss</button>
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Transactions</h3>
              <p style={{ color: 'var(--text-light)' }}>Search your payment records by payment number, transaction ID, booking, vehicle, or card last digits.</p>
            </div>
          </div>

          <div className="filter-grid payment-history-filters">
            <label className="filter-field filter-field-search">
              <span>Search payments</span>
              <input
                value={filters.search}
                placeholder="Payment no, transaction ID, booking, vehicle..."
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </label>
            <label className="filter-field">
              <span>Payment status</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All payment statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Payment method</span>
              <select value={filters.method} onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))}>
                <option value="all">All payment methods</option>
                <option value="card_payment">Card Payment</option>
                <option value="cash">Cash on Pickup</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
            <button className="btn btn-outline payment-filter-reset" type="button" onClick={() => setFilters({ search: '', status: 'all', method: 'all' })}>Reset</button>
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
                          {payment.booking?._id && <Link className="btn btn-secondary btn-sm" to="/bookings">View Booking</Link>}
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
