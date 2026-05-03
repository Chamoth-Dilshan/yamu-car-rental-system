export default function BankTransferForm({ bankTransfer, errors = {}, proofFile = null, onChange, onProofChange }) {
  return (
    <div className="payment-form-grid">
      <div className="payment-info-panel">
        Bank transfer submissions stay pending until an administrator verifies the reference.
      </div>
      <div className="form-group">
        <label>Account Name</label>
        <input
          value={bankTransfer.accountName}
          onChange={(event) => onChange('accountName', event.target.value)}
          placeholder="Sender account name"
        />
        {errors.accountName && <small className="field-error">{errors.accountName}</small>}
      </div>
      <div className="form-group">
        <label>Bank Name</label>
        <input
          value={bankTransfer.bankName}
          onChange={(event) => onChange('bankName', event.target.value)}
          placeholder="Bank name"
        />
        {errors.bankName && <small className="field-error">{errors.bankName}</small>}
      </div>
      <div className="form-group">
        <label>Reference Number</label>
        <input
          value={bankTransfer.referenceNo}
          onChange={(event) => onChange('referenceNo', event.target.value)}
          placeholder="Transfer reference"
        />
        {errors.referenceNo && <small className="field-error">{errors.referenceNo}</small>}
      </div>
      <div className="form-group">
        <label>Note</label>
        <textarea
          rows="3"
          value={bankTransfer.note}
          onChange={(event) => onChange('note', event.target.value)}
          placeholder="Optional transfer note"
        />
      </div>
      <div className="form-group">
        <label>Transfer Proof</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={onProofChange}
        />
        {proofFile && <small>Selected: {proofFile.name}</small>}
        {errors.proofFile && <small className="field-error">{errors.proofFile}</small>}
      </div>
    </div>
  )
}
