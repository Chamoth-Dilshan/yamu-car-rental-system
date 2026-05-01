export default function SavedCardSelector({
  methods = [],
  selectedId,
  cvv,
  errors = {},
  onSelect,
  onCvvChange
}) {
  if (!methods.length) {
    return (
      <div className="payment-empty-panel">
        No active saved cards are available.
      </div>
    )
  }

  return (
    <div className="saved-card-selector">
      <div className="saved-card-grid">
        {methods.map((method) => (
          <button
            className={`saved-card-item${selectedId === method._id ? ' active' : ''}`}
            key={method._id}
            type="button"
            onClick={() => onSelect(method._id)}
          >
            <strong>{method.brand} ending {method.last4}</strong>
            <span>{method.maskedNumber}</span>
            <small>{method.expiryMonth}/{method.expiryYear}{method.isDefault ? ' - Default' : ''}</small>
          </button>
        ))}
      </div>

      <div className="form-group">
        <label>CVV</label>
        <input
          value={cvv}
          onChange={(event) => onCvvChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          placeholder="3 or 4 digits"
        />
        {errors.cvv && <small className="field-error">{errors.cvv}</small>}
        <small className="form-help">CVV is checked for the simulated transaction and is never stored.</small>
      </div>
    </div>
  )
}
