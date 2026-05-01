import API from '../../api/axios'

export const getCustomerQualityDashboard = () => API.get('/reviews/dashboard')

export const getReviewContext = (bookingId) => API.get(`/reviews/bookings/${bookingId}/context`)

export const submitReview = (payload) => API.post('/reviews', payload)

export const getAdminReviews = () => API.get('/reviews/admin')

export const updateReviewStatus = (reviewId, payload) => API.patch(`/reviews/${reviewId}/status`, payload)

export const getAdminReviewAnalytics = () => API.get('/reviews/admin/analytics')

export const getComplaintContext = (bookingId) => API.get(`/complaints/bookings/${bookingId}/context`)

export const submitComplaint = (payload) => API.post('/complaints', payload)

export const getAdminComplaints = () => API.get('/complaints/admin')

export const updateComplaintStatus = (complaintId, payload) => API.patch(`/complaints/${complaintId}/status`, payload)

export const getComplaintStats = () => API.get('/complaints/admin/stats')

export default API
