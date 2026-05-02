import { formatCurrency, formatDateRange } from '../../../utils/formatters'
import PaymentStatusBadge from './PaymentStatusBadge'

export default function PaymentSummary({ booking, amount, status, priceDetails }) {
  if (!booking) {
    return null
  }

  return (
    <aside className="form-card payment-summary-card">
      <PaymentStatusBadge status={status || booking.paymentStatus} />
      <h3>{booking.displayVehicle}</h3>
      <p>{booking.bookingNo} - {booking.bookingType === 'vehicle' ? 'Vehicle reservation' : 'Driver service'}</p>

      <div className="payment-summary-list">
        <div><span>Dates</span><strong>{formatDateRange(booking.startDate, booking.endDate)}</strong></div>
        <div><span>Booking Type</span><strong>{booking.bookingType}</strong></div>
        <div><span>Base Amount</span><strong>{formatCurrency(booking.baseAmount)}</strong></div>
        <div><span>Service Fee</span><strong>{formatCurrency(booking.serviceFee)}</strong></div>

        {priceDetails && priceDetails.breakdown && priceDetails.breakdown.map((item, index) => {
          if (item.type === 'error' || item.impact === 0) return null;
          return (
            <div key={index} style={{ color: item.impact < 0 ? 'var(--success-color)' : 'inherit' }}>
              <span>{item.name}</span>
              <strong>{item.impact < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.impact))}</strong>
            </div>
          );
        })}

        <div className="payment-total-row"><span>Total Amount</span><strong>{formatCurrency(amount ?? booking.totalAmount)}</strong></div>
      </div>
    </aside>
  )
}
