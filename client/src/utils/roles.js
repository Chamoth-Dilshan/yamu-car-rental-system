const ROLE_LABELS = {
  customer: 'User',
  staff: 'Store',
  driver: 'Driver',
  admin: 'Admin'
};

export const getProfilePathForRole = (role = '') => {
  switch (role) {
    case 'driver':
      return '/profile/driverapplication';
    case 'store':
    case 'staff':
      return '/profile/store';
    case 'admin':
      return '/profile/admin';
    default:
      return '/profile/user';
  }
};

export const getApplicationPathForRole = (role = '') => {
  switch (role) {
    case 'driver':
      return '/profile/driverapplication';
    case 'store':
    case 'staff':
      return '/profile/storeapplication';
    default:
      return getProfilePathForRole(role);
  }
};

export const getWorkspacePathForRole = (role = '') => {
  switch (role) {
    case 'driver':
      return '/driver/ads';
    case 'store':
    case 'staff':
      return '/staff/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'customer':
      return '/dashboard';
    default:
      return '/profile/user';
  }
};

export const formatRoleLabel = (value = '') => {
  const normalized = String(value || '').trim();

  if (ROLE_LABELS[normalized]) {
    return ROLE_LABELS[normalized];
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default ROLE_LABELS;
