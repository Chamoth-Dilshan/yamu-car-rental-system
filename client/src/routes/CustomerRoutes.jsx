import { Navigate, Route } from 'react-router-dom'

import ProtectedRoute from '../components/common/ProtectedRoute'
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
