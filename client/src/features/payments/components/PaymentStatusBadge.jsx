import { getBadgeClass } from '../../../utils/formatters'

const statusLabels = {
  pending: 'Pending',
  processing: 'Pending Verification',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded'
}

export default function PaymentStatusBadge({ status }) {
  const value = status || 'pending'

  return (
    <span className={`badge ${getBadgeClass(value)}`}>
      {statusLabels[value] || value}
    </span>
  )
}
