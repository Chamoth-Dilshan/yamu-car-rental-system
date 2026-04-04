export const isRoleManagementNotification = (notification = {}) => {
  const combinedText = [
    notification.title,
    notification.message,
    notification.link
  ].join(' ').toLowerCase();

  return [
    'profile',
    'role',
    'verification',
    'approve',
    'approval',
    'application',
    'switch',
    'admin/users',
    'admin/roles',
    'pending-approvals'
  ].some((token) => combinedText.includes(token));
};
