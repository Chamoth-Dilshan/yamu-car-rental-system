import { Navigate, Route } from 'react-router-dom'

import ProtectedRoute from '../components/common/ProtectedRoute'
import CheckoutPage from '../features/payments/pages/CheckoutPage'
import PaymentCheckout from '../features/payments/pages/PaymentCheckout'
import PaymentHistory from '../features/payments/pages/PaymentHistory'
import PaymentReceipt from '../features/payments/pages/PaymentReceipt'
import SavedCards from '../features/payments/pages/SavedCards'
import ApplyRoles from '../features/users/pages/ApplyRoles'
import MyBookings from '../features/reservations/pages/MyBookings'
import Notifications from '../features/users/pages/Notifications'
import Profile from '../features/users/pages/Profile'
import RoleManagement from '../features/users/pages/RoleManagement'
import { useAuth } from '../context/AuthContext'
import { getProfilePathForRole } from '../utils/roles'

function ProfileEntryRedirect() {
  const { user } = useAuth()
  const activeRole = user?.activeRole || user?.role
  const target = getProfilePathForRole(activeRole)

  return <Navigate to={target} replace />
}

const CustomerRoutes = [
  <Route key="account" path="/account" element={<ProfileEntryRedirect />} />,
  <Route key="profile-entry" path="/profile" element={<ProfileEntryRedirect />} />,
  <Route
    key="bookings"
    path="/bookings"
    element={(
      <ProtectedRoute roles={['customer']}>
        <MyBookings />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="booking-payment"
    path="/bookings/:bookingId/payment"
    element={(
      <ProtectedRoute roles={['customer']}>
        <PaymentCheckout />
      </ProtectedRoute>
    )}
  />,
  <Route key="payments-root" path="/payments" element={<Navigate to="/payments/history" replace />} />,
  <Route
    key="payment-checkout"
    path="/payments/checkout/:bookingId"
    element={(
      <ProtectedRoute roles={['customer']}>
        <CheckoutPage />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="payment-history"
    path="/payments/history"
    element={(
      <ProtectedRoute roles={['customer']}>
        <PaymentHistory />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="payment-cards"
    path="/payments/cards"
    element={(
      <ProtectedRoute roles={['customer']}>
        <SavedCards />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="payment-receipt"
    path="/payments/:id/receipt"
    element={(
      <ProtectedRoute roles={['customer', 'admin', 'staff', 'driver']}>
        <PaymentReceipt />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="profile"
    path="/profile/*"
    element={(
      <ProtectedRoute permissions={['profile.manage']}>
        <Profile />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="notifications"
    path="/notifications"
    element={(
      <ProtectedRoute permissions={['profile.manage']}>
        <Notifications />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="apply-roles"
    path="/apply-roles"
    element={(
      <ProtectedRoute>
        <ApplyRoles />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="switch-roles"
    path="/switch-roles"
    element={(
      <ProtectedRoute>
        <RoleManagement />
      </ProtectedRoute>
    )}
  />
]

export default CustomerRoutes
