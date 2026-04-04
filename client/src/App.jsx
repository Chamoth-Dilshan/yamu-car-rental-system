import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import AdminUsers from './pages/AdminUsers'
import AdminBookings from './pages/AdminBookings'
import ApplyRoles from './pages/ApplyRoles'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import RoleManagement from './pages/RoleManagement'
import Vehicles from './pages/Vehicles'
import VehicleDetails from './pages/VehicleDetails'
import MyBookings from './pages/MyBookings'
import ExploreDrivers from './pages/ExploreDrivers'
import DriverDetails from './pages/DriverDetails'
import DriverAdList from './pages/DriverAdList'
import DriverAdForm from './pages/DriverAdForm'
import DriverBookings from './pages/DriverBookings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cars" element={<Vehicles />} />
        <Route path="/cars/:id" element={<VehicleDetails />} />
        <Route path="/drivers" element={<ExploreDrivers />} />
        <Route path="/drivers/:id" element={<DriverDetails />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/admin/signin" element={<Navigate to="/signin" replace />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/account" element={<Navigate to="/profile" replace />} />
        <Route
          path="/bookings"
          element={(
            <ProtectedRoute roles={['customer']}>
              <MyBookings />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute permissions={['profile.manage']}>
              <Profile />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute permissions={['profile.manage']}>
              <Notifications />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/apply-roles"
          element={(
            <ProtectedRoute>
              <ApplyRoles />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/switch-roles"
          element={(
            <ProtectedRoute>
              <RoleManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/driver/ads"
          element={(
            <ProtectedRoute roles={['driver', 'staff']}>
              <DriverAdList />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/driver/ads/new"
          element={(
            <ProtectedRoute roles={['driver', 'staff']}>
              <DriverAdForm />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/driver/ads/:id/edit"
          element={(
            <ProtectedRoute roles={['driver', 'staff']}>
              <DriverAdForm />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/driver/bookings"
          element={(
            <ProtectedRoute roles={['driver', 'staff']}>
              <DriverBookings />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/dashboard"
          element={(
            <ProtectedRoute roles={['admin']} permissions={['users.view']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/pending-approvals/*"
          element={(
            <ProtectedRoute roles={['admin']} permissions={['users.view', 'roles.review']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users/*"
          element={(
            <ProtectedRoute roles={['admin']} permissions={['users.view']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/roles/*"
          element={(
            <ProtectedRoute roles={['admin']} permissions={['users.view']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/bookings"
          element={(
            <ProtectedRoute roles={['admin']}>
              <AdminBookings />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

