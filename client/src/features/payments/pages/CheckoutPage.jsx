import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import BankTransferForm from '../components/BankTransferForm'
import CardPaymentForm from '../components/CardPaymentForm'
import CashPaymentBox from '../components/CashPaymentBox'
import PaymentSummary from '../components/PaymentSummary'
import SavedCardSelector from '../components/SavedCardSelector'
import { checkoutPayment, getCustomerPayments, getPaymentMethods } from '../paymentApi'

const emptyCard = {
  cardholderName: '',
  cardNumber: '',
  expiryMonth: '',
  expiryYear: '',
  cvv: ''
}

const emptyCash = {
  payerName: '',
  note: ''
}

const emptyBankTransfer = {
  accountName: '',
  bankName: '',
  referenceNo: '',
  note: ''
}

const normalizeDigits = (value = '') => String(value || '').replace(/\D/g, '')

const isLuhnValid = (value = '') => {
  const digits = normalizeDigits(value)

  if (!/^\d{13,19}$/.test(digits)) {
    return false
  }

  let sum = 0
  let shouldDouble = false

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}

const isFutureExpiry = (month, year) => {
  const monthNumber = Number(month)
  const yearNumber = Number(year)

  if (!monthNumber || monthNumber < 1 || monthNumber > 12 || !yearNumber) {
    return false
  }

  const expiryDate = new Date(Date.UTC(yearNumber, monthNumber, 0, 23, 59, 59, 999))
  return expiryDate >= new Date()
}

const validateCard = (card) => {
  const errors = {}

  if (!card.cardholderName.trim()) {
    errors.cardholderName = 'Cardholder name is required.'
  }

  if (!isLuhnValid(card.cardNumber)) {
    errors.cardNumber = 'Enter a valid card number.'
  }

  if (!isFutureExpiry(card.expiryMonth, card.expiryYear)) {
    errors.expiry = 'Expiry date must be in the future.'
  }

  if (!/^\d{3,4}$/.test(card.cvv)) {
    errors.cvv = 'CVV must be 3 or 4 digits.'
  }

  return errors
}

const validateBankTransfer = (bankTransfer) => {
  const errors = {}

  if (!bankTransfer.accountName.trim()) {
    errors.accountName = 'Account name is required.'
  }

  if (!bankTransfer.bankName.trim()) {
    errors.bankName = 'Bank name is required.'
  }

  if (!bankTransfer.referenceNo.trim()) {
    errors.referenceNo = 'Reference number is required.'
  }

  return errors
}

const findLatestPaymentForBooking = (payments = [], bookingId) => (
  payments.find((payment) => String(payment.booking?._id || payment.booking) === String(bookingId))
)

export default function CheckoutPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { refreshNotifications } = useAuth()
  const [booking, setBooking] = useState(null)
  const [savedCards, setSavedCards] = useState([])
  const [latestPayment, setLatestPayment] = useState(null)
  const [method, setMethod] = useState('card')
  const [selectedSavedCard, setSelectedSavedCard] = useState('')
  const [savedCardCvv, setSavedCardCvv] = useState('')
  const [card, setCard] = useState(emptyCard)
  const [saveCard, setSaveCard] = useState(false)
  const [setDefaultCard, setSetDefaultCard] = useState(false)
  const [cash, setCash] = useState(emptyCash)
  const [bankTransfer, setBankTransfer] = useState(emptyBankTransfer)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setSubmitError('')

    Promise.all([
      API.get('/bookings/customer'),
      getPaymentMethods(),
      getCustomerPayments()
    ])
      .then(([bookingRes, methodsRes, paymentsRes]) => {
        if (!active) {
          return
        }

        const nextBooking = (bookingRes.data.bookings || []).find((item) => String(item._id) === String(bookingId))
        const methods = (methodsRes.data.methods || []).filter((item) => item.status === 'active')
        const payment = findLatestPaymentForBooking(paymentsRes.data.payments || [], bookingId)

        setBooking(nextBooking || null)
        setSavedCards(methods)
        setLatestPayment(payment || null)
        setSelectedSavedCard(methods.find((item) => item.isDefault)?._id || methods[0]?._id || '')
      })
      .catch((err) => setSubmitError(err.response?.data?.message || 'Failed to load checkout details'))
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [bookingId])

  const activeSavedCards = useMemo(
    () => savedCards.filter((item) => item.status === 'active'),
    [savedCards]
  )
  const amount = Number(booking?.totalAmount || 0)
  const isProcessing = latestPayment?.status === 'processing'
  const checkoutBlockMessage = (() => {
    if (!booking) {
      return ''
    }

    if (booking.bookingStatus === 'pending') {
      return 'Payment is available only after the provider accepts your reservation.'
    }

    if (booking.bookingStatus === 'cancelled') {
      return 'Cancelled bookings cannot be paid.'
    }

    if (booking.bookingStatus === 'closed') {
      return 'Closed bookings cannot be paid.'
    }

    if (booking.paymentStatus === 'paid') {
      return 'This booking is already paid.'
    }

    if (booking.paymentStatus === 'refunded') {
      return 'This booking has been refunded.'
    }

    if (isProcessing) {
      return 'Pending verification'
    }

    if (booking.bookingStatus !== 'confirmed') {
      return 'Payment is available only after the provider accepts your reservation.'
    }

    return ''
  })()
  const canSubmit = Boolean(booking && !checkoutBlockMessage && booking.paymentStatus === 'pending')

  const updateCard = (field, value) => {
    setCard((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '', expiry: '' }))
  }

  const updateCash = (field, value) => {
    setCash((current) => ({ ...current, [field]: value }))
  }

  const updateBankTransfer = (field, value) => {
    setBankTransfer((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const buildPayload = () => {
    if (method === 'card') {
      return {
        method,
        amount,
        card,
        saveCard,
        setDefault: setDefaultCard
      }
    }

    if (method === 'saved_card') {
      return {
        method,
        amount,
        paymentMethodId: selectedSavedCard,
        cvv: savedCardCvv
      }
    }

    if (method === 'cash') {
      return {
        method,
        amount,
        cash
      }
    }

    return {
      method,
      amount,
      bankTransfer
    }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setErrors({})

    if (!canSubmit) {
      setSubmitError('This booking is not eligible for checkout.')
      return
    }

    if (method === 'card') {
      const cardErrors = validateCard(card)
      if (Object.keys(cardErrors).length) {
        setErrors(cardErrors)
        return
      }
    }

    if (method === 'saved_card') {
      if (!selectedSavedCard) {
        setErrors({ savedCard: 'Select a saved card.' })
        return
      }

      if (!/^\d{3,4}$/.test(savedCardCvv)) {
        setErrors({ cvv: 'CVV must be 3 or 4 digits.' })
        return
      }
    }

    if (method === 'bank_transfer') {
      const bankErrors = validateBankTransfer(bankTransfer)
      if (Object.keys(bankErrors).length) {
        setErrors(bankErrors)
        return
      }
    }

    setBusy(true)

    try {
      const res = await checkoutPayment(booking._id, buildPayload())
      await refreshNotifications().catch(() => {})
      const payment = res.data.payment

      if (payment?.status === 'paid') {
        navigate(`/payments/${payment._id}/receipt`, {
          state: { message: 'Payment completed successfully.' }
        })
        return
      }

      navigate('/payments/history', {
        state: { message: 'Payment submitted for admin verification.' }
      })
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to process payment')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-layout page-content">
        <Sidebar />
        <main className="dashboard-content">
          <section className="form-card reservation-empty">Loading checkout...</section>
        </main>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="dashboard-layout page-content">
        <Sidebar />
        <main className="dashboard-content">
          <div className="alert alert-danger">Booking not found or not available for this account.</div>
          <Link className="btn btn-outline btn-sm" to="/bookings">Back to My Bookings</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-layout page-content payment-page">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Payment Checkout</h2>
          <p style={{ color: 'var(--text-light)' }}>Complete a simulated payment without storing sensitive card data.</p>
        </div>

        {submitError && <div className="alert alert-danger">{submitError}</div>}
        {checkoutBlockMessage && (
          <section className="form-card">
            <div className="alert alert-warning">{checkoutBlockMessage}</div>
            <PaymentSummary booking={booking} amount={amount} status={isProcessing ? 'processing' : booking.paymentStatus} />
            <div className="table-actions">
              {booking.paymentStatus === 'paid' && latestPayment?._id && (
                <Link className="btn btn-secondary" to={`/payments/${latestPayment._id}/receipt`}>View Receipt</Link>
              )}
              <Link className="btn btn-outline" to="/bookings">Back to Bookings</Link>
            </div>
          </section>
        )}

        {!checkoutBlockMessage && (
        <form className="payment-layout" onSubmit={submitPayment}>
          <section className="form-card payment-main-card">
            <div className="card-header">
              <div>
                <h3>Payment Method</h3>
                <p style={{ color: 'var(--text-light)' }}>Card payments complete immediately. Cash and bank transfer require admin verification.</p>
              </div>
            </div>

            <div className="payment-method-grid">
              <button type="button" className={`payment-method-card${method === 'card' ? ' active' : ''}`} onClick={() => setMethod('card')}>
                <strong>New Card</strong>
                <span>Visa, Mastercard, Amex, or other Luhn-valid mock card</span>
              </button>
              <button
                type="button"
                className={`payment-method-card${method === 'saved_card' ? ' active' : ''}`}
                disabled={!activeSavedCards.length}
                onClick={() => activeSavedCards.length && setMethod('saved_card')}
              >
                <strong>Saved Card</strong>
                <span>{activeSavedCards.length ? 'Use a stored mock token' : 'No saved card available'}</span>
              </button>
              <button type="button" className={`payment-method-card${method === 'cash' ? ' active' : ''}`} onClick={() => setMethod('cash')}>
                <strong>Cash on Pickup</strong>
                <span>Admin verification required</span>
              </button>
              <button type="button" className={`payment-method-card${method === 'bank_transfer' ? ' active' : ''}`} onClick={() => setMethod('bank_transfer')}>
                <strong>Bank Transfer</strong>
                <span>Submit reference for admin verification</span>
              </button>
            </div>

            {method === 'card' && (
              <CardPaymentForm
                card={card}
                errors={errors}
                onChange={updateCard}
                showSaveCard
                saveCard={saveCard}
                setSaveCard={setSaveCard}
                defaultCard={setDefaultCard}
                setDefaultCard={setSetDefaultCard}
              />
            )}

            {method === 'saved_card' && (
              <>
                {errors.savedCard && <div className="alert alert-danger">{errors.savedCard}</div>}
                <SavedCardSelector
                  methods={activeSavedCards}
                  selectedId={selectedSavedCard}
                  cvv={savedCardCvv}
                  errors={errors}
                  onSelect={setSelectedSavedCard}
                  onCvvChange={setSavedCardCvv}
                />
              </>
            )}

            {method === 'cash' && <CashPaymentBox cash={cash} onChange={updateCash} />}

            {method === 'bank_transfer' && (
              <BankTransferForm
                bankTransfer={bankTransfer}
                errors={errors}
                onChange={updateBankTransfer}
              />
            )}
          </section>

          <PaymentSummary booking={booking} amount={amount} status={isProcessing ? 'processing' : booking.paymentStatus} />

          <div className="payment-submit-row">
            <button className="btn btn-primary btn-block" type="submit" disabled={busy || !canSubmit}>
              {busy ? 'Processing...' : method === 'cash' || method === 'bank_transfer' ? 'Submit for Verification' : 'Pay Now'}
            </button>
            <Link className="btn btn-outline btn-block" to="/bookings">Back to Bookings</Link>
          </div>
        </form>
        )}
      </main>
    </div>
  )
}
