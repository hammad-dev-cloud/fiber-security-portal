import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login          from './pages/Login'
import Signup         from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ForgotUsername from './pages/ForgotUsername'
import ResetPassword  from './pages/ResetPassword'

import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Packages  from './pages/Packages'
import Payments  from './pages/Payments'
import Routers   from './pages/Routers'
import Alerts    from './pages/Alerts'
import Security  from './pages/Security'
import Settings  from './pages/Settings'
import NotFound  from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"             element={<Login />} />
      <Route path="/signup"            element={<Signup />} />
      <Route path="/forgot-password"   element={<ForgotPassword />} />
      <Route path="/forgot-username"   element={<ForgotUsername />} />
      <Route path="/reset-password"    element={<ResetPassword />} />

      {/* Protected (wrapped in Layout) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index               element={<Dashboard />} />
        <Route path="/customers"   element={<Customers />} />
        <Route path="/packages"    element={<Packages  />} />
        <Route path="/payments"    element={<Payments  />} />
        <Route path="/routers"     element={<Routers   />} />
        <Route path="/alerts"      element={<Alerts    />} />
        <Route path="/security"    element={<Security  />} />
        <Route path="/settings"    element={<Settings  />} />
        <Route path="*"            element={<NotFound  />} />
      </Route>
    </Routes>
  )
}
