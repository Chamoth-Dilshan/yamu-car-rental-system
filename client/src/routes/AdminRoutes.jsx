import { Navigate, Route } from 'react-router-dom'

import ProtectedRoute from '../components/common/ProtectedRoute'
import AdminUsers from '../features/admin/pages/AdminUsers'
import AdminPayments from '../features/payments/pages/AdminPayments'
import AdminBookings from '../features/reservations/pages/AdminBookings'
import AdminDisputes from '../features/reviews/pages/AdminDisputes'
import AdminQualityDashboard from '../features/reviews/pages/AdminQualityDashboard'
import AdminReviewApprovals from '../features/reviews/pages/AdminReviewApprovals'

import PricingOverview from '../pages/admin-pricing/PricingOverview'
import CampaignsAdmin from '../pages/admin-pricing/CampaignsAdmin'
import PromotionsAdmin from '../pages/admin-pricing/PromotionsAdmin'
import PricingRulesAdmin from '../pages/admin-pricing/PricingRulesAdmin'
import PricingSimulator from '../pages/admin-pricing/PricingSimulator'

const AdminRoutes = [
  <Route
    key="admin-dashboard"
    path="/admin/dashboard"
    element={(
      <ProtectedRoute roles={['admin']}>
        <AdminQualityDashboard />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-review-approvals"
    path="/admin/reviews"
    element={(
      <ProtectedRoute roles={['admin']}>
        <AdminReviewApprovals />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-disputes"
    path="/admin/disputes"
    element={(
      <ProtectedRoute roles={['admin']}>
        <AdminDisputes />
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
  <Route
    key="admin-pricing-overview"
    path="/admin/pricing-overview"
    element={(
      <ProtectedRoute roles={['admin']}>
        <PricingOverview />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-campaigns"
    path="/admin/campaigns"
    element={(
      <ProtectedRoute roles={['admin']}>
        <CampaignsAdmin />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-promotions"
    path="/admin/promotions"
    element={(
      <ProtectedRoute roles={['admin']}>
        <PromotionsAdmin />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-pricing-rules"
    path="/admin/pricing-rules"
    element={(
      <ProtectedRoute roles={['admin']}>
        <PricingRulesAdmin />
      </ProtectedRoute>
    )}
  />,
  <Route
    key="admin-pricing-simulator"
    path="/admin/pricing-simulator"
    element={(
      <ProtectedRoute roles={['admin']}>
        <PricingSimulator />
      </ProtectedRoute>
    )}
  />,
  <Route key="admin-fallback" path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
]

export default AdminRoutes
