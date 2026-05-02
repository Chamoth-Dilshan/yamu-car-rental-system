const User = require('../modules/users/user.model');

const MAX_NOTIFICATIONS = 40;

const serializeNotification = (notificationDoc) => {
  const rawNotification = notificationDoc?.toObject ? notificationDoc.toObject() : { ...notificationDoc };

  return {
    _id: rawNotification._id,
    type: rawNotification.type || 'system',
    title: rawNotification.title || '',
    message: rawNotification.message || '',
    link: rawNotification.link || '',
    isRead: Boolean(rawNotification.isRead),
    readAt: rawNotification.readAt || null,
    createdAt: rawNotification.createdAt || null
  };
};

const sortAndTrimNotifications = (notifications = []) => (
  notifications
    .map((item) => item?.toObject ? item.toObject() : item)
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, MAX_NOTIFICATIONS)
);

const appendNotification = (user, payload) => {
  if (!user || !payload?.title || !payload?.message) {
    return null;
  }

  user.notifications = sortAndTrimNotifications([
    {
      type: payload.type || 'system',
      title: String(payload.title).trim(),
      message: String(payload.message).trim(),
      link: String(payload.link || '').trim(),
      isRead: false,
      readAt: null,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date()
    },
    ...(user.notifications || [])
  ]);

  return user.notifications[0] || null;
};

const addNotificationToUser = async (userId, payload) => {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  appendNotification(user, payload);
  await user.save({ validateModifiedOnly: true });
  return user.notifications[0] || null;
};

const addNotificationToUsers = async (userIds, payload) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];

  if (!uniqueUserIds.length) {
    return 0;
  }

  const users = await User.find({ _id: { $in: uniqueUserIds } });
  await Promise.all(users.map(async (user) => {
    appendNotification(user, payload);
    await user.save({ validateModifiedOnly: true });
  }));

  return users.length;
};

const addNotificationToAdmins = async (payload) => {
  const admins = await User.find({ 'roles.roleKey': 'admin' });

  await Promise.all(admins.map(async (admin) => {
    appendNotification(admin, payload);
    await admin.save({ validateModifiedOnly: true });
  }));

  return admins.length;
};

const getUnreadNotificationCount = (user) => (
  (user?.notifications || []).filter((item) => !item.isRead).length
);

module.exports = {
  MAX_NOTIFICATIONS,
  serializeNotification,
  appendNotification,
  addNotificationToUser,
  addNotificationToUsers,
  addNotificationToAdmins,
  getUnreadNotificationCount
};
