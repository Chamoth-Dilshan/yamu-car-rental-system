import { Navigate, Route } from 'react-router-dom'

import ProtectedRoute from '../components/common/ProtectedRoute'
import StoreDashboard from '../features/staff/pages/StoreDashboard'
import InventoryManagement from '../features/maintenance/pages/InventoryManagement'
import MaintenanceManagement from '../features/maintenance/pages/MaintenanceManagement'
import StaffVehicleBookings from '../features/reservations/pages/StaffVehicleBookings'
import StaffVehicleForm from '../features/vehicles/pages/StaffVehicleForm'
import StaffVehicleList from '../features/vehicles/pages/StaffVehicleList'

const StaffRoutes = [
  <Route key="staff-root" path="/staff" element={<Navigate to="/staff/dashboard" replace />} />,
  <Route
    key="staff-dashboard"
    path="/staff/dashboard"
    element={(
      <ProtectedRoute roles={['staff']}>
        <StoreDashboard />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="staff-vehicles"
    path="/staff/vehicles"
    element={(
      <ProtectedRoute roles={['staff']}>
        <StaffVehicleList />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="staff-vehicle-new"
    path="/staff/vehicles/new"
    element={(
      <ProtectedRoute roles={['staff']}>
        <StaffVehicleForm />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="staff-vehicle-edit"
    path="/staff/vehicles/:id/edit"
    element={(
      <ProtectedRoute roles={['staff']}>
        <StaffVehicleForm />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="staff-bookings"
    path="/staff/bookings"
    element={(
      <ProtectedRoute roles={['staff']}>
        <StaffVehicleBookings />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="staff-maintenance"
    path="/staff/maintenance"
    element={(
      <ProtectedRoute roles={['staff']}>
        <MaintenanceManagement />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="staff-inventory"
    path="/staff/inventory"
    element={(
      <ProtectedRoute roles={['staff']}>
        <InventoryManagement />
      </ProtectedRoute>
    )}
  />
]

export default StaffRoutes
