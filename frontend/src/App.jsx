import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Packages  from './pages/Packages'
import Payments  from './pages/Payments'
import Routers   from './pages/Routers'
import Alerts    from './pages/Alerts'
import Security  from './pages/Security'
import NotFound  from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected (wrapped in Layout) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index               element={<Dashboard />} />
        <Route path="/customers"   element={<Customers />} />
        <Route path="/packages"    element={<Packages  />} />
        <Route path="/payments"    element={<Payments  />} />
        <Route path="/routers"     element={<Routers   />} />
        <Route path="/alerts"      element={<Alerts    />} />
        <Route path="/security"    element={<Security  />} />
        <Route path="*"            element={<NotFound  />} />
      </Route>
    </Routes>
  )
}
