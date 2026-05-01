import { Navigate, Route } from 'react-router-dom'

import ProtectedRoute from '../components/common/ProtectedRoute'
import AdminUsers from '../features/admin/pages/AdminUsers'
import AdminPayments from '../features/payments/pages/AdminPayments'
import AdminBookings from '../features/reservations/pages/AdminBookings'

const AdminRoutes = [
  <Route
    key="admin-dashboard"
    path="/admin/dashboard"
    element={(
      <ProtectedRoute roles={['admin']} permissions={['users.view']}>
        <AdminUsers />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-pending-approvals"
    path="/admin/pending-approvals/*"
    element={(
      <ProtectedRoute roles={['admin']} permissions={['users.view', 'roles.review']}>
        <AdminUsers />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-users"
    path="/admin/users/*"
    element={(
      <ProtectedRoute roles={['admin']} permissions={['users.view']}>
        <AdminUsers />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-roles"
    path="/admin/roles/*"
    element={(
      <ProtectedRoute roles={['admin']} permissions={['users.view']}>
        <AdminUsers />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-bookings"
    path="/admin/bookings"
    element={(
      <ProtectedRoute roles={['admin']}>
        <AdminBookings />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-payments"
    path="/admin/payments"
    element={(
      <ProtectedRoute roles={['admin']} permissions={['payments.manage']}>
        <AdminPayments />
      </ProtectedRoute>
    )}
  />,
  <Route key="admin-fallback" path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
]

export default AdminRoutes
