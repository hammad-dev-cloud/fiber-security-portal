import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// ----- Attach JWT to every request (from sessionStorage) -----
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('fsp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ----- Centralised error handling -----
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err?.response?.status
    const message = err?.response?.data?.detail || err.message || 'Request failed'

    if (status === 401) {
      // Token invalid / expired — clear session and redirect to login
      sessionStorage.removeItem('fsp_token')
      sessionStorage.removeItem('fsp_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (status === 429) {
      toast.error('Too many attempts. Please wait and try again.')
    } else if (status >= 500) {
      toast.error('Server error — check your backend.')
    }

    return Promise.reject(new Error(message))
  },
)

export default api
