import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles, permissions, requireAllPermissions = true }) {
  const { user, loading, hasAllPermissions, hasAnyPermission } = useAuth();

  if (loading) {
    return <div className="shell-card">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (roles && !roles.includes(user.activeRole || user.role)) {
    return <Navigate to="/profile" replace />;
  }

  if (permissions?.length) {
    const isAllowed = requireAllPermissions
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions);

    if (!isAllowed) {
      return <Navigate to="/profile" replace />;
    }
  }

  return children;
}

