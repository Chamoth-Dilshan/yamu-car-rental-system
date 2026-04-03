import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AdminSignIn from './pages/AdminSignIn';
import AdminUsers from './pages/AdminUsers';
import ApplyRoles from './pages/ApplyRoles';
import AccountOverview from './pages/AccountOverview';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import RoleManagement from './pages/RoleManagement';
import PricingOverview from './pages/admin-pricing/PricingOverview';
import CampaignsAdmin from './pages/admin-pricing/CampaignsAdmin';
import PromotionsAdmin from './pages/admin-pricing/PromotionsAdmin';
import PricingRulesAdmin from './pages/admin-pricing/PricingRulesAdmin';
import PricingSimulator from './pages/admin-pricing/PricingSimulator';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/admin/signin" element={<AdminSignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/account"
          element={(
            <ProtectedRoute>
              <AccountOverview />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute>
              <Profile />
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
          path="/admin/pricing-overview"
          element={<ProtectedRoute roles={['admin']}><PricingOverview /></ProtectedRoute>}
        />
        <Route
          path="/admin/campaigns"
          element={<ProtectedRoute roles={['admin']}><CampaignsAdmin /></ProtectedRoute>}
        />
        <Route
          path="/admin/promotions"
          element={<ProtectedRoute roles={['admin']}><PromotionsAdmin /></ProtectedRoute>}
        />
        <Route
          path="/admin/pricing-rules"
          element={<ProtectedRoute roles={['admin']}><PricingRulesAdmin /></ProtectedRoute>}
        />
        <Route
          path="/admin/pricing-simulator"
          element={<ProtectedRoute roles={['admin']}><PricingSimulator /></ProtectedRoute>}
        />
        <Route
          path="/admin/*"
          element={(
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </Layout>
  );
}

