import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';

export default function Notifications() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead
  } = useAuth();

  const allNotifications = notifications || [];
  const unreadNotificationsCount = allNotifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="dashboard-layout page-content profile-page">
      <Sidebar />
      <main className="dashboard-content">
        <section className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Notifications</h3>
              <p>Review all your account notifications and open the ones that need attention.</p>
            </div>
            <div className="pill-row">
              <span className="badge badge-info">{unreadNotificationsCount} unread</span>
              {allNotifications.length > 0 && (
                <button className="btn btn-outline btn-sm" type="button" onClick={() => markAllNotificationsRead()}>
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {allNotifications.length > 0 ? (
            <div className="notification-feed">
              {allNotifications.map((notification) => (
                <div key={notification._id} className={`notification-card${notification.isRead ? '' : ' unread'}`}>
                  <div className="notification-card-copy">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>{formatDateTime(notification.createdAt)}</small>
                  </div>
                  <div className="notification-card-actions">
                    {!notification.isRead && (
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => markNotificationRead(notification._id)}
                      >
                        Mark Read
                      </button>
                    )}
                    {notification.link && (
                      <Link className="btn btn-primary btn-sm" to={notification.link}>
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="reservation-empty">No notifications yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}
