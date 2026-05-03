import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import { openProtectedFile } from '../../../utils/protectedFiles'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import { getAdminPayments, recordAdminManualPayment, refundPayment, verifyPayment } from '../paymentApi'

const methodLabels = {
  card: 'New Card',
  saved_card: 'Saved Card',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  admin_manual: 'Admin Manual'
}

const canVerify = (payment) => (
  payment.status === 'processing'
  && ['cash', 'bank_transfer', 'admin_manual'].includes(payment.method)
)

const hasProtectedProof = (payment) => Boolean(
  payment.bankTransfer?.proofFile?.filePath && !/^\/?uploads\//i.test(payment.bankTransfer.proofFile.filePath)
)

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: 'all', method: 'all' })
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [manualForm, setManualForm] = useState({
    bookingNo: '',
    amount: '',
    payerName: '',
    note: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadPayments = useCallback(() => {
    setLoading(true)
    setError('')

    getAdminPayments(filters)
      .then((res) => {
        setPayments(res.data.payments || [])
        setStats(res.data.stats)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load payments'))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const verify = async (payment) => {
    const adminNote = window.prompt('Verification note', '')
    if (adminNote === null) {
      return
    }

    setBusyAction(`verify-${payment._id}`)
    setMessage('')
    setError('')

    try {
      await verifyPayment(payment._id, { adminNote })
      setMessage('Payment verified')
      loadPayments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify payment')
    } finally {
      setBusyAction('')
    }
  }

  const refund = async (payment) => {
    const reason = window.prompt('Refund reason')
    if (!reason) {
      return
    }

    const amountInput = window.prompt('Refund amount', String(payment.amount || 0))
    if (amountInput === null) {
      return
    }

    setBusyAction(`refund-${payment._id}`)
    setMessage('')
    setError('')

    try {
      await refundPayment(payment._id, {
        reason,
        amount: Number(amountInput || payment.amount)
      })
      setMessage('Payment refunded')
      loadPayments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refund payment')
    } finally {
      setBusyAction('')
    }
  }

  const viewProof = async (payment) => {
    setMessage('')
    setError('')

    try {
      await openProtectedFile(`/payments/${payment._id}/proof`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open payment proof')
    }
  }

  const updateManualForm = (field, value) => {
    setManualForm((current) => ({ ...current, [field]: value }))
  }

  const recordManual = async (event) => {
    event.preventDefault()
    setBusyAction('manual')
    setMessage('')
    setError('')

    try {
      await recordAdminManualPayment({
        bookingNo: manualForm.bookingNo,
        amount: Number(manualForm.amount),
        cash: {
          payerName: manualForm.payerName,
          collectedBy: 'Admin',
          note: manualForm.note
        },
        adminNote: manualForm.note
      })
      setManualForm({ bookingNo: '', amount: '', payerName: '', note: '' })
      setMessage('Manual payment recorded')
      loadPayments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record manual payment')
    } finally {
      setBusyAction('')
    }
  }

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
          <h2>Payment Management</h2>
          <p style={{ color: 'var(--text-light)' }}>Verify cash and bank transfer payments, review receipts, and process refunds.</p>
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

        <section className="form-card admin-manual-payment-card">
          <div className="card-header">
            <div>
              <h3>Record Manual Payment</h3>
              <p style={{ color: 'var(--text-light)' }}>Use this for admin-confirmed offline payments. The amount must match the booking total.</p>
            </div>
          </div>
          <form className="filter-grid filter-grid-4" onSubmit={recordManual}>
            <input
              value={manualForm.bookingNo}
              onChange={(event) => updateManualForm('bookingNo', event.target.value)}
              placeholder="Booking number"
              required
            />
            <input
              value={manualForm.amount}
              onChange={(event) => updateManualForm('amount', event.target.value.replace(/[^\d.]/g, ''))}
              placeholder="Amount"
              inputMode="decimal"
              required
            />
            <input
              value={manualForm.payerName}
              onChange={(event) => updateManualForm('payerName', event.target.value)}
              placeholder="Payer name"
            />
            <button className="btn btn-primary" type="submit" disabled={busyAction === 'manual'}>
              {busyAction === 'manual' ? 'Recording...' : 'Record'}
            </button>
            <textarea
              value={manualForm.note}
              onChange={(event) => updateManualForm('note', event.target.value)}
              placeholder="Admin note"
              rows="2"
            />
          </form>
        </section>

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Transactions</h3>
              <p style={{ color: 'var(--text-light)' }}>Search payment number, transaction ID, booking number, customer name, or card digits.</p>
            </div>
          </div>

          <div className="filter-grid filter-grid-4">
            <input
              value={filters.search}
              placeholder="Search payment, transaction, booking, customer..."
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
                    <th>Customer</th>
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
                        <strong>{payment.customer?.fullName || payment.customerSnapshot?.fullName || 'Customer'}</strong>
                        <span>{payment.customer?.email || payment.customerSnapshot?.email}</span>
                      </td>
                      <td>
                        <strong>{payment.bookingSnapshot?.bookingNo || payment.booking?.bookingNo}</strong>
                        <span>{payment.bookingSnapshot?.vehicleOrDriverName || payment.bookingSnapshot?.serviceName}</span>
                        <span>Booking: {payment.booking?.bookingStatus || 'n/a'} | Payment: {payment.booking?.paymentStatus || 'n/a'}</span>
                      </td>
                      <td>
                        <strong>{methodLabels[payment.method] || payment.method}</strong>
                        {['card', 'saved_card'].includes(payment.method) && (
                          <span>{payment.cardSnapshot?.brand || 'Card'} ending {payment.cardSnapshot?.last4 || '****'}</span>
                        )}
                        {payment.method === 'bank_transfer' && <span>{payment.bankTransfer?.bankName || 'Bank'} ref {payment.bankTransfer?.referenceNo || '-'}</span>}
                        {hasProtectedProof(payment) && <span>Proof: {payment.bankTransfer.proofFile.fileName}</span>}
                      </td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td><PaymentStatusBadge status={payment.status} /></td>
                      <td>
                        <div className="table-actions">
                          {canVerify(payment) && (
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              disabled={busyAction === `verify-${payment._id}`}
                              onClick={() => verify(payment)}
                            >
                              Verify
                            </button>
                          )}
                          {hasProtectedProof(payment) && (
                            <button
                              className="btn btn-outline btn-sm"
                              type="button"
                              onClick={() => viewProof(payment)}
                            >
                              Proof
                            </button>
                          )}
                          {payment.status === 'paid' && (
                            <button
                              className="btn btn-danger btn-sm"
                              type="button"
                              disabled={busyAction === `refund-${payment._id}`}
                              onClick={() => refund(payment)}
                            >
                              Refund
                            </button>
                          )}
                          <Link className="btn btn-outline btn-sm" to={`/payments/${payment._id}/receipt`}>Receipt</Link>
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
