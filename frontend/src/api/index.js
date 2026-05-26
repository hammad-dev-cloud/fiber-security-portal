import api from './client'

// =====================================================================
// AUTH
// =====================================================================
export const authApi = {
  login:    (username, password) => api.post('/auth/login', { username, password }).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  me:       () => api.get('/auth/me').then(r => r.data),
}

// =====================================================================
// DASHBOARD
// =====================================================================
export const dashboardApi = {
  stats:           () => api.get('/dashboard/stats').then(r => r.data),
  recentAlerts:    (limit = 10) => api.get('/dashboard/recent-alerts', { params: { limit } }).then(r => r.data),
  recentCustomers: (limit = 5)  => api.get('/dashboard/recent-customers', { params: { limit } }).then(r => r.data),
}

// =====================================================================
// CUSTOMERS
// =====================================================================
export const customerApi = {
  list:    (params = {}) => api.get('/customers/', { params }).then(r => r.data),
  get:     (id)          => api.get(`/customers/${id}`).then(r => r.data),
  create:  (data)        => api.post('/customers/', data).then(r => r.data),
  update:  (id, data)    => api.put(`/customers/${id}`, data).then(r => r.data),
  remove:  (id)          => api.delete(`/customers/${id}`),
}

// =====================================================================
// PACKAGES
// =====================================================================
export const packageApi = {
  list:    () => api.get('/packages/').then(r => r.data),
  get:     (id) => api.get(`/packages/${id}`).then(r => r.data),
  create:  (data) => api.post('/packages/', data).then(r => r.data),
  update:  (id, data) => api.put(`/packages/${id}`, data).then(r => r.data),
  remove:  (id) => api.delete(`/packages/${id}`),
}

// =====================================================================
// PAYMENTS
// =====================================================================
export const paymentApi = {
  list:    (customerId)  => api.get('/payments/', { params: customerId ? { customer_id: customerId } : {} }).then(r => r.data),
  create:  (data)        => api.post('/payments/', data).then(r => r.data),
  remove:  (id)          => api.delete(`/payments/${id}`),
}

// =====================================================================
// ROUTERS
// =====================================================================
export const routerApi = {
  list:     ()           => api.get('/routers/').then(r => r.data),
  create:   (data)       => api.post('/routers/', data).then(r => r.data),
  update:   (id, data)   => api.put(`/routers/${id}`, data).then(r => r.data),
  remove:   (id)         => api.delete(`/routers/${id}`),
  ping:     (id)         => api.post(`/routers/${id}/ping`).then(r => r.data),
  pingAll:  ()           => api.post('/routers/ping-all').then(r => r.data),
}

// =====================================================================
// ALERTS
// =====================================================================
export const alertApi = {
  list:    (params = {}) => api.get('/alerts/', { params }).then(r => r.data),
  resolve: (id)          => api.post(`/alerts/${id}/resolve`).then(r => r.data),
  remove:  (id)          => api.delete(`/alerts/${id}`),
}

// =====================================================================
// SECURITY OPS
// =====================================================================
export const securityApi = {
  verifyMac:     (data)         => api.post('/security/verify-mac', data).then(r => r.data),
  portScan:      (host)         => api.post('/security/scan/port', null, { params: { host } }).then(r => r.data),
  suspiciousIps: (params = {})  => api.get('/security/scan/suspicious-ips', { params }).then(r => r.data),
  fullScan:      (host)         => api.post('/security/scan/full', null, { params: host ? { host } : {} }).then(r => r.data),
}
