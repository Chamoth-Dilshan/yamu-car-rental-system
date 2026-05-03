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
      return '/profile/storeapplication';
    case 'admin':
      return '/profile/admin';
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
