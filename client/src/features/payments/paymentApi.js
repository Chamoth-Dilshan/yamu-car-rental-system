import API from '../../api/axios'

export const getPaymentMethods = () => API.get('/payments/methods')

export const createPaymentMethod = (payload) => API.post('/payments/methods', payload)

export const setDefaultPaymentMethod = (paymentMethodId) => (
  API.put(`/payments/methods/${paymentMethodId}/default`)
)

export const deletePaymentMethod = (paymentMethodId) => (
  API.delete(`/payments/methods/${paymentMethodId}`)
)

export const checkoutPayment = (bookingId, payload, config = {}) => (
  API.post(`/payments/checkout/${bookingId}`, payload, config)
)

export const getCustomerPayments = (params = {}) => (
  API.get('/payments/my', { params })
)

export const getPaymentReceipt = (paymentId) => (
  API.get(`/payments/${paymentId}/receipt`)
)

export const getAdminPayments = (params = {}) => (
  API.get('/payments/admin/all', { params })
)

export const recordAdminManualPayment = (payload) => (
  API.post('/payments/admin/manual', payload)
)

export const verifyPayment = (paymentId, payload = {}) => (
  API.put(`/payments/admin/${paymentId}/verify`, payload)
)

export const refundPayment = (paymentId, payload) => (
  API.put(`/payments/admin/${paymentId}/refund`, payload)
)

export const getStaffPayments = (params = {}) => (
  API.get('/payments/staff', { params })
)

export const getDriverPayments = (params = {}) => (
  API.get('/payments/driver', { params })
)

export default {
  getPaymentMethods,
  createPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  checkoutPayment,
  getCustomerPayments,
  getPaymentReceipt,
  getAdminPayments,
  recordAdminManualPayment,
  verifyPayment,
  refundPayment,
  getStaffPayments,
  getDriverPayments
}
