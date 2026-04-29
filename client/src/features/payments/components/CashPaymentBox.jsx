export default function CashPaymentBox({ cash, onChange }) {
  return (
    <div className="payment-form-grid">
      <div className="payment-info-panel">
        Cash payments stay pending until an administrator verifies collection.
      </div>
      <div className="form-group">
        <label>Payer Name</label>
        <input
          value={cash.payerName}
          onChange={(event) => onChange('payerName', event.target.value)}
          placeholder="Person paying on pickup"
        />
      </div>
      <div className="form-group">
        <label>Cash Note</label>
        <textarea
          rows="4"
          value={cash.note}
          onChange={(event) => onChange('note', event.target.value)}
          placeholder="Optional note for admin verification"
        />
      </div>
    </div>
  )
}
