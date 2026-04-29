import { Navigate, useParams } from 'react-router-dom'

export default function PaymentCheckout() {
  const { bookingId } = useParams()
  return <Navigate to={`/payments/checkout/${bookingId}`} replace />
}
