import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AdminSignIn from './pages/AdminSignIn';
import AdminUsers from './pages/AdminUsers';
import ApplyRoles from './pages/ApplyRoles';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import RoleManagement from './pages/RoleManagement';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/admin/signin" element={<AdminSignIn />} />
        <Route path="/signup" element={<SignUp />} />
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
          path="/admin/dashboard"
          element={(
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/pending-approvals"
          element={(
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/users"
          element={(
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/roles"
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

