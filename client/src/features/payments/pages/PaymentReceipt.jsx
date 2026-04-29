import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import { getPaymentReceipt } from '../paymentApi'

export default function PaymentReceipt() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const [payment, setPayment] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(location.state?.message || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    getPaymentReceipt(id)
      .then((res) => {
        setPayment(res.data.payment)
        setReceipt(res.data.receipt)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load receipt'))
      .finally(() => setLoading(false))
  }, [id])

  const historyPath = user?.activeRole === 'admin' ? '/admin/payments' : '/payments/history'

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Payment Receipt</h2>
          <p style={{ color: 'var(--text-light)' }}>Official simulated receipt for academic payment tracking.</p>
        </div>

        {message && (
          <div className="alert alert-success">
            {message}
            <button className="link-button" type="button" onClick={() => setMessage('')}>Dismiss</button>
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <section className="form-card reservation-empty">Loading receipt...</section>
        ) : receipt && payment ? (
          <section className="form-card receipt-card">
            <div className="receipt-header">
              <div>
                <span className="receipt-brand">{receipt.brand?.shortName || 'YAMU'}</span>
                <h3>{receipt.brand?.name || 'YAMU Car Rental Management System'}</h3>
                <p>{receipt.brand?.note}</p>
              </div>
              <PaymentStatusBadge status={receipt.paymentStatus} />
            </div>

            <div className="receipt-total">
              <span>Amount</span>
              <strong>{formatCurrency(receipt.amount)}</strong>
              <small>{receipt.currency}</small>
            </div>

            <div className="receipt-grid">
              <div><span>Payment Number</span><strong>{receipt.paymentNo}</strong></div>
              <div><span>Transaction ID</span><strong>{receipt.transactionId}</strong></div>
              <div><span>Booking Number</span><strong>{receipt.bookingNo}</strong></div>
              <div><span>Customer</span><strong>{receipt.customerName}</strong></div>
              <div><span>Booking Type</span><strong>{receipt.bookingType}</strong></div>
              <div><span>Service</span><strong>{receipt.serviceName}</strong></div>
              <div><span>Payment Method</span><strong>{receipt.paymentMethod}</strong></div>
              <div><span>Paid Date</span><strong>{receipt.paidDate ? formatDateTime(receipt.paidDate) : 'Pending verification'}</strong></div>
              <div><span>Receipt Generated</span><strong>{formatDateTime(receipt.receiptGeneratedAt)}</strong></div>
              {payment.refund?.refundedAt && (
                <div><span>Refunded</span><strong>{formatDateTime(payment.refund.refundedAt)}</strong></div>
              )}
            </div>

            {payment.refund?.reason && (
              <div className="payment-info-panel">
                Refund reason: {payment.refund.reason}
              </div>
            )}

            <div className="receipt-note">
              Sensitive card information is not stored. This simulated academic module keeps only masked card details,
              last four digits, card brand, expiry date, and generated mock tokens.
            </div>

            <div className="table-actions">
              <Link className="btn btn-outline" to={historyPath}>Back to Payments</Link>
              {user?.activeRole !== 'admin' && <Link className="btn btn-secondary" to="/bookings">My Bookings</Link>}
            </div>
          </section>
        ) : (
          <section className="form-card reservation-empty">Receipt not found.</section>
        )}
      </main>
    </div>
  )
}
