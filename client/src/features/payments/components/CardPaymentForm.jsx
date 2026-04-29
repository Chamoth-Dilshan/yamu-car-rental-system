const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 16 }, (_, index) => String(currentYear + index))

export default function CardPaymentForm({
  card,
  errors = {},
  onChange,
  showSaveCard = false,
  saveCard = false,
  setSaveCard,
  setDefaultCard,
  defaultCard = false
}) {
  const updateField = (field, value) => {
    let nextValue = value

    if (field === 'cardNumber') {
      nextValue = value.replace(/\D/g, '').slice(0, 19)
    }

    if (field === 'cvv') {
      nextValue = value.replace(/\D/g, '').slice(0, 4)
    }

    if (field === 'cardholderName') {
      nextValue = value.replace(/[^A-Za-z\s'.-]/g, '')
    }

    onChange(field, nextValue)
  }

  return (
    <div className="payment-form-grid">
      <div className="form-group">
        <label>Cardholder Name</label>
        <input
          value={card.cardholderName}
          onChange={(event) => updateField('cardholderName', event.target.value)}
          placeholder="Name on card"
        />
        {errors.cardholderName && <small className="field-error">{errors.cardholderName}</small>}
      </div>

      <div className="form-group">
        <label>Card Number</label>
        <input
          value={card.cardNumber}
          onChange={(event) => updateField('cardNumber', event.target.value)}
          inputMode="numeric"
          placeholder="4111111111111111"
        />
        {errors.cardNumber && <small className="field-error">{errors.cardNumber}</small>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Expiry Month</label>
          <select value={card.expiryMonth} onChange={(event) => updateField('expiryMonth', event.target.value)}>
            <option value="">Month</option>
            {months.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Expiry Year</label>
          <select value={card.expiryYear} onChange={(event) => updateField('expiryYear', event.target.value)}>
            <option value="">Year</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      </div>
      {errors.expiry && <small className="field-error">{errors.expiry}</small>}

      <div className="form-group">
        <label>CVV</label>
        <input
          value={card.cvv}
          onChange={(event) => updateField('cvv', event.target.value)}
          inputMode="numeric"
          placeholder="3 or 4 digits"
        />
        {errors.cvv && <small className="field-error">{errors.cvv}</small>}
        <small className="form-help">CVV is validated for the mock payment flow and is never stored.</small>
      </div>

      {showSaveCard && (
        <div className="payment-check-row">
          <label>
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(event) => setSaveCard(event.target.checked)}
            />
            Save this card securely as masked card details
          </label>
          {saveCard && (
            <label>
              <input
                type="checkbox"
                checked={defaultCard}
                onChange={(event) => setDefaultCard(event.target.checked)}
              />
              Make it the default card
            </label>
          )}
        </div>
      )}
    </div>
  )
}
