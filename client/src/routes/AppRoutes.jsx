import { Routes } from 'react-router-dom'

import AdminRoutes from './AdminRoutes'
import CustomerRoutes from './CustomerRoutes'
import DriverRoutes from './DriverRoutes'
import PublicRoutes from './PublicRoutes'
import StaffRoutes from './StaffRoutes'

export default function AppRoutes() {
  return (
    <Routes>
      {PublicRoutes}
      {CustomerRoutes}
      {DriverRoutes}
      {StaffRoutes}
      {AdminRoutes}
    </Routes>
  )
}
