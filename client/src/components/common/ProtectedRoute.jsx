import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProfilePathForRole } from '../../utils/roles';

export default function ProtectedRoute({ children, roles, permissions, requireAllPermissions = true }) {
  const { user, loading, hasAllPermissions, hasAnyPermission } = useAuth();

  if (loading) {
    return <div className="shell-card">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (user.accountStatus && user.accountStatus !== 'active') {
    return <Navigate to="/signin" replace />;
  }

  const activeRole = user.activeRole || user.role;
  const activeRoleAssignment = (user.roles || []).find((role) => role.roleKey === activeRole);
  const activeRoleIsUsable = activeRoleAssignment?.roleStatus === 'active'
    && activeRoleAssignment?.verificationStatus === 'verified';
  const fallbackProfilePath = getProfilePathForRole(activeRole);

  if (roles && (!roles.includes(activeRole) || !activeRoleIsUsable)) {
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

