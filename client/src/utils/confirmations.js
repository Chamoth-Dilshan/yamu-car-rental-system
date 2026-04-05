export const confirmAction = (message) => window.confirm(message)

export const confirmBookingStatusChange = (bookingNo, actionLabel) => (
  confirmAction(`Are you sure you want to ${actionLabel.toLowerCase()} booking ${bookingNo}?`)
)

export const confirmPaymentUpdate = (bookingNo) => (
  confirmAction(`Are you sure you want to mark payment as paid for booking ${bookingNo}?`)
)
