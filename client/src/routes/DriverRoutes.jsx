import { Route } from 'react-router-dom'

import ProtectedRoute from '../components/common/ProtectedRoute'
import DriverAdForm from '../features/drivers/pages/DriverAdForm'
import DriverAdList from '../features/drivers/pages/DriverAdList'
import DriverBookings from '../features/reservations/pages/DriverBookings'

const DriverRoutes = [
  <Route
    key="driver-ads"
    path="/driver/ads"
    element={(
      <ProtectedRoute roles={['driver']}>
        <DriverAdList />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="driver-ad-new"
    path="/driver/ads/new"
    element={(
      <ProtectedRoute roles={['driver']}>
        <DriverAdForm />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="driver-ad-edit"
    path="/driver/ads/:id/edit"
    element={(
      <ProtectedRoute roles={['driver']}>
        <DriverAdForm />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="driver-bookings"
    path="/driver/bookings"
    element={(
      <ProtectedRoute roles={['driver']}>
        <DriverBookings />
      </ProtectedRoute>
    )}
  />
]

export default DriverRoutes
