import { Navigate, Route } from 'react-router-dom'

import Home from '../features/public/pages/Home'
import SignIn from '../features/auth/pages/SignIn'
import SignUp from '../features/auth/pages/SignUp'
import Vehicles from '../features/vehicles/pages/Vehicles'
import VehicleDetails from '../features/vehicles/pages/VehicleDetails'
import ExploreDrivers from '../features/drivers/pages/ExploreDrivers'
import DriverDetails from '../features/drivers/pages/DriverDetails'

const PublicRoutes = [
  <Route key="home" path="/" element={<Home />} />,
  <Route key="cars" path="/cars" element={<Vehicles />} />,
  <Route key="car-details" path="/cars/:id" element={<VehicleDetails />} />,
  <Route key="drivers" path="/drivers" element={<ExploreDrivers />} />,
  <Route key="driver-details" path="/drivers/:id" element={<DriverDetails />} />,
  <Route key="signin" path="/signin" element={<SignIn />} />,
  <Route key="admin-signin" path="/admin/signin" element={<Navigate to="/signin" replace />} />,
  <Route key="signup" path="/signup" element={<SignUp />} />
]

export default PublicRoutes
