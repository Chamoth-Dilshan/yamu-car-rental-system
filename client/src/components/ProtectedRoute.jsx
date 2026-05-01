import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfilePathForRole } from '../utils/roles';

export default function ProtectedRoute({ children, roles, permissions, requireAllPermissions = true }) {
  const { user, loading, hasAllPermissions, hasAnyPermission } = useAuth();

  if (loading) {
    return <div className="shell-card">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  console.log("User role:", user.role);
  console.log("Active role:", user.activeRole);
  console.log("Allowed roles:", roles);

  const fallbackProfilePath = getProfilePathForRole(user.activeRole || user.role);

  if (roles && !roles.includes(user.activeRole || user.role)) {
    return <Navigate to={fallbackProfilePath} replace />;
  }

  if (permissions?.length) {
    const isAllowed = requireAllPermissions
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions);

    if (!isAllowed) {
      return <Navigate to={fallbackProfilePath} replace />;
    }
  }

  return children;
}

