import { useEffect, useState } from 'react'
import Sidebar from '../../../components/layout/Sidebar'
import CardPaymentForm from '../components/CardPaymentForm'
import { isFutureExpiry, isSecurityCodeValid, isSixteenDigitCardNumber } from '../cardValidation'
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

const validateCard = (card) => {
  const errors = {}

  if (!card.cardholderName.trim()) {
    errors.cardholderName = 'Cardholder name is required.'
  }

  if (!isSixteenDigitCardNumber(card.cardNumber)) {
    errors.cardNumber = 'Enter a 16-digit card number.'
  }

  if (!card.expiryMonth || !card.expiryYear) {
    errors.expiry = 'Expiry date is required.'
  } else if (!isFutureExpiry(card.expiryMonth, card.expiryYear)) {
    errors.expiry = 'Expiry date must be in the future.'
  }

  if (!isSecurityCodeValid(card.cvv)) {
    errors.cvv = 'CVV must be 3 or 4 digits.'
  }

  return errors
}

const formatExpiryYear = (year = '') => String(year).slice(-2)

const formatStatusLabel = (status = '') => {
  if (!status) {
    return ''
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function SavedCards() {
  const [methods, setMethods] = useState([])
  const [card, setCard] = useState(emptyCard)
  const [isDefault, setIsDefault] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const openAddModal = () => {
    setCard(emptyCard)
    setIsDefault(false)
    setErrors({})
    setError('')
    setMessage('')
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    if (busyAction === 'save') {
      return
    }

    setIsAddModalOpen(false)
    setCard(emptyCard)
    setIsDefault(false)
    setErrors({})
  }

  const loadCards = () => {
    setLoading(true)
    setError('')

    getPaymentMethods()
      .then((res) => setMethods(res.data.methods || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load payment methods'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCards()
  }, [])

  useEffect(() => {
    if (!isAddModalOpen) {
      return undefined
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && busyAction !== 'save') {
        setIsAddModalOpen(false)
        setCard(emptyCard)
        setIsDefault(false)
        setErrors({})
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isAddModalOpen, busyAction])

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
      setIsAddModalOpen(false)
      setMessage('Card added')
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
        <div className="payment-methods-shell">
          <div className="payment-page-header">
            <div className="form-header">
              <h2>Payment Methods</h2>
              <p style={{ color: 'var(--text-light)' }}>Manage saved payment cards for faster checkout.</p>
            </div>
            <div className="payment-page-actions">
              <button className="btn btn-primary" type="button" onClick={openAddModal}>
                Add Payment Method
              </button>
            </div>
          </div>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          <section className="form-card payment-methods-card">
            <div className="card-header">
              <div>
                <h3>Saved Cards</h3>
                <p style={{ color: 'var(--text-light)' }}>Only active cards can be used during checkout.</p>
              </div>
            </div>

            {loading ? (
              <div className="reservation-empty">Loading cards...</div>
            ) : methods.length ? (
              <div className="payment-method-list">
                {methods.map((method) => (
                  <div className="payment-method-row" key={method._id}>
                    <div className="payment-method-card-mark" aria-hidden="true">
                      {String(method.brand || 'Card').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="payment-method-copy">
                      <strong>{method.brand || 'Card'} ending {method.last4}</strong>
                      <span>{method.maskedNumber}</span>
                      <small>Expires {method.expiryMonth}/{formatExpiryYear(method.expiryYear)}</small>
                    </div>
                    <div className="payment-method-status">
                      {method.isDefault && <span className="payment-method-badge">Default</span>}
                      {method.status && method.status !== 'active' && (
                        <span className="payment-method-badge muted">{formatStatusLabel(method.status)}</span>
                      )}
                    </div>
                    <div className="payment-method-actions">
                      {method.status === 'active' && !method.isDefault && (
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          disabled={busyAction === `default-${method._id}`}
                          onClick={() => makeDefault(method._id)}
                        >
                          Make Default
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
              <div className="payment-method-empty">
                <h3>No payment methods yet</h3>
                <p>Add a card once and use it for faster checkout on future bookings.</p>
                <button className="btn btn-primary" type="button" onClick={openAddModal}>
                  Add Payment Method
                </button>
              </div>
            )}
          </section>
        </div>

        {isAddModalOpen && (
          <div className="payment-modal-overlay" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddModal()
            }
          }}>
            <section
              className="form-card payment-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-payment-card-title"
            >
              <div className="payment-modal-header">
                <div>
                  <h3 id="add-payment-card-title">Add Payment Card</h3>
                  <p>Your full card number and CVV are validated only for this request and are never stored.</p>
                </div>
                <button
                  className="payment-icon-button"
                  type="button"
                  aria-label="Close"
                  onClick={closeAddModal}
                  disabled={busyAction === 'save'}
                >
                  x
                </button>
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
                <div className="payment-modal-footer">
                  <button className="btn btn-outline" type="button" onClick={closeAddModal} disabled={busyAction === 'save'}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={busyAction === 'save'}>
                    {busyAction === 'save' ? 'Saving...' : 'Save Card'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
