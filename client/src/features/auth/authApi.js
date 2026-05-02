import API from '../../api/axios'

export const googleLogin = (credential) => API.post('/auth/google', { credential })

export default API
