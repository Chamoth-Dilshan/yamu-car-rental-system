import { useEffect, useState } from 'react'
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaCarSide,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaHashtag,
  FaLock,
  FaReceipt,
  FaUserCircle
} from 'react-icons/fa'
import { Link, useLocation, useParams } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import { getPaymentReceipt } from '../paymentApi'

const getDisplayValue = (value, fallback = 'Not available') => value || fallback

const formatReceiptLabel = (value) => {
  if (!value) {
    return 'Not available'
  }

  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

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
  const receiptDetails = receipt ? [
    { label: 'Customer', value: receipt.customerName, icon: FaUserCircle },
    { label: 'Booking Type', value: formatReceiptLabel(receipt.bookingType), icon: FaCalendarCheck },
    { label: 'Service', value: receipt.serviceName, icon: FaCarSide },
    { label: 'Payment Method', value: receipt.paymentMethod, icon: FaCreditCard },
    {
      label: 'Paid Date',
      value: receipt.paidDate ? formatDateTime(receipt.paidDate) : 'Pending verification',
      icon: FaCalendarCheck
    },
    { label: 'Receipt Generated', value: formatDateTime(receipt.receiptGeneratedAt), icon: FaReceipt },
    payment?.refund?.refundedAt && {
      label: 'Refunded',
      value: formatDateTime(payment.refund.refundedAt),
      icon: FaFileInvoiceDollar
    }
  ].filter(Boolean) : []

  const receiptHighlights = receipt ? [
    { label: 'Payment Number', value: receipt.paymentNo, icon: FaReceipt },
    { label: 'Transaction ID', value: receipt.transactionId, icon: FaHashtag },
    { label: 'Booking Number', value: receipt.bookingNo, icon: FaCalendarCheck }
  ] : []

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="payment-page-header receipt-page-header">
          <div className="form-header">
            <h2>Payment Receipt</h2>
            <p style={{ color: 'var(--text-light)' }}>Official receipt for payment tracking.</p>
          </div>
          <div className="payment-page-actions">
            <Link className="btn btn-outline btn-sm" to={historyPath}>
              <FaArrowLeft /> Payments
            </Link>
          </div>
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
            <div className="receipt-hero">
              <div className="receipt-hero-copy">
                <span className="receipt-brand">{receipt.brand?.shortName || 'YAMU'}</span>
                <h3>{receipt.brand?.name || 'YAMU Car Rental Management System'}</h3>
                <p>{receipt.brand?.note || 'Official receipt for payment tracking.'}</p>
              </div>

              <div className="receipt-status-panel">
                <span>Payment Status</span>
                <PaymentStatusBadge status={receipt.paymentStatus} />
                <strong>{formatCurrency(receipt.amount)}</strong>
                <small>{receipt.currency}</small>
              </div>
            </div>

            <div className="receipt-summary-row">
              {receiptHighlights.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.label} className="receipt-summary-item">
                    <span><Icon /> {item.label}</span>
                    <strong>{getDisplayValue(item.value)}</strong>
                  </div>
                )
              })}
            </div>

            <div className="receipt-section-heading">
              <h4>Booking and payment details</h4>
              <p>Everything needed to match this payment with your booking.</p>
            </div>

            <div className="receipt-grid">
              {receiptDetails.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.label} className="receipt-detail-card">
                    <span className="receipt-detail-icon"><Icon /></span>
                    <div>
                      <span>{item.label}</span>
                      <strong>{getDisplayValue(item.value)}</strong>
                    </div>
                  </div>
                )
              })}
            </div>

            {payment.refund?.reason && (
              <div className="payment-info-panel">
                Refund reason: {payment.refund.reason}
              </div>
            )}

            <div className="receipt-note">
              <span className="receipt-note-icon"><FaLock /></span>
              <div>
                <strong>Protected card details</strong>
                <p>Full card numbers and CVV are not stored. Only masked card details, expiry date, and a local card token are retained.</p>
              </div>
            </div>

            <div className="table-actions receipt-actions">
              <Link className="btn btn-outline" to={historyPath}>
                <FaArrowLeft /> Back to Payments
              </Link>
              {user?.activeRole !== 'admin' && (
                <Link className="btn btn-secondary" to="/bookings">
                  <FaCalendarCheck /> My Bookings
                </Link>
              )}
            </div>
          </section>
        ) : (
          <section className="form-card reservation-empty">Receipt not found.</section>
        )}
      </main>
    </div>
  )
}
