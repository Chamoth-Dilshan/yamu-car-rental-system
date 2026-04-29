import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import CardPaymentForm from '../components/CardPaymentForm'
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  setDefaultPaymentMethod
} from '../paymentApi'

const emptyCard = {
  cardholderName: '',
  cardNumber: '',
  expiryMonth: '',
  expiryYear: '',
  cvv: ''
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

const validateCard = (card) => {
  const errors = {}

  if (!card.cardholderName.trim()) {
    errors.cardholderName = 'Cardholder name is required.'
  }

  if (!isLuhnValid(card.cardNumber)) {
    errors.cardNumber = 'Enter a valid card number.'
  }

  if (!card.expiryMonth || !card.expiryYear) {
    errors.expiry = 'Expiry date is required.'
  } else {
    const expiryDate = new Date(Date.UTC(Number(card.expiryYear), Number(card.expiryMonth), 0, 23, 59, 59, 999))
    if (expiryDate < new Date()) {
      errors.expiry = 'Expiry date must be in the future.'
    }
  }

  if (!/^\d{3,4}$/.test(card.cvv)) {
    errors.cvv = 'CVV must be 3 or 4 digits.'
  }

  return errors
}

export default function SavedCards() {
  const [methods, setMethods] = useState([])
  const [card, setCard] = useState(emptyCard)
  const [isDefault, setIsDefault] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadCards = () => {
    setLoading(true)
    setError('')

    getPaymentMethods()
      .then((res) => setMethods(res.data.methods || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load saved cards'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCards()
  }, [])

  const updateCard = (field, value) => {
    setCard((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '', expiry: '' }))
  }

  const submitCard = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setErrors({})

    const validationErrors = validateCard(card)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setBusyAction('save')

    try {
      await createPaymentMethod({ card, isDefault })
      setCard(emptyCard)
      setIsDefault(false)
      setMessage('Saved card added')
      loadCards()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save card')
    } finally {
      setBusyAction('')
    }
  }

  const makeDefault = async (methodId) => {
    setBusyAction(`default-${methodId}`)
    setMessage('')
    setError('')

    try {
      await setDefaultPaymentMethod(methodId)
      setMessage('Default card updated')
      loadCards()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set default card')
    } finally {
      setBusyAction('')
    }
  }

  const removeCard = async (methodId) => {
    if (!window.confirm('Remove this saved card?')) {
      return
    }

    setBusyAction(`delete-${methodId}`)
    setMessage('')
    setError('')

    try {
      await deletePaymentMethod(methodId)
      setMessage('Saved card removed')
      loadCards()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove saved card')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Saved Cards</h2>
          <p style={{ color: 'var(--text-light)' }}>Store only masked card details and generated mock tokens for faster checkout.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="payment-layout">
          <section className="form-card payment-main-card">
            <div className="card-header">
              <div>
                <h3>Add Saved Card</h3>
                <p style={{ color: 'var(--text-light)' }}>Full card number and CVV are validated only for this request and are never stored.</p>
              </div>
            </div>

            <form onSubmit={submitCard}>
              <CardPaymentForm card={card} errors={errors} onChange={updateCard} />
              <div className="payment-check-row">
                <label>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(event) => setIsDefault(event.target.checked)}
                  />
                  Make this my default card
                </label>
              </div>
              <button className="btn btn-primary" type="submit" disabled={busyAction === 'save'}>
                {busyAction === 'save' ? 'Saving...' : 'Save Card'}
              </button>
            </form>
          </section>

          <aside className="form-card payment-summary-card">
            <div className="card-header">
              <div>
                <h3>Card Wallet</h3>
                <p style={{ color: 'var(--text-light)' }}>Only active cards can be used during checkout.</p>
              </div>
            </div>

            {loading ? (
              <div className="reservation-empty">Loading cards...</div>
            ) : methods.length ? (
              <div className="payment-card-list">
                {methods.map((method) => (
                  <div className="saved-card-row" key={method._id}>
                    <div>
                      <strong>{method.brand} ending {method.last4}</strong>
                      <span>{method.maskedNumber}</span>
                      <small>{method.expiryMonth}/{method.expiryYear} - {method.status}{method.isDefault ? ' - Default' : ''}</small>
                    </div>
                    <div className="table-actions">
                      {method.status === 'active' && !method.isDefault && (
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          disabled={busyAction === `default-${method._id}`}
                          onClick={() => makeDefault(method._id)}
                        >
                          Default
                        </button>
                      )}
                      {method.status !== 'removed' && (
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          disabled={busyAction === `delete-${method._id}`}
                          onClick={() => removeCard(method._id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="reservation-empty">No saved cards yet.</div>
            )}

            <Link className="btn btn-outline btn-block" to="/payments/history">Payment History</Link>
          </aside>
        </div>
      </main>
    </div>
  )
}
