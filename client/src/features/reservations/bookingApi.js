import API from '../../api/axios'

export const getCustomerBookings = (params = {}) => API.get('/bookings/customer', { params })

export default API
