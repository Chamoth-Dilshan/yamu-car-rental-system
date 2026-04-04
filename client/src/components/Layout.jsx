import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildUploadUrl } from '../api/config';
import { formatDateTime } from '../utils/formatters';
import BrandLogo from './BrandLogo';
import Footer from './Footer';

export default function Layout({ children }) {
  const {
    user,
    logout,
    notifications,
    unreadNotificationCount,
    hasPermission,
    markNotificationRead,
    markAllNotificationsRead
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const activeRole = user?.activeRole || user?.role;
  const isCustomer = activeRole === 'customer';
  const isDriver = activeRole === 'driver';
  const isAdmin = activeRole === 'admin';
  const hasHomePage = !user || activeRole === 'customer';
  const footerHiddenPaths = new Set(['/signin']);
  const showFooter = !footerHiddenPaths.has(location.pathname) && (!user || isCustomer);
  const canManageProfile = hasPermission('profile.manage');
  const canViewUsers = hasPermission('users.view');
  const canReviewRoles = hasPermission('roles.review');
  const canAssignRoles = hasPermission('roles.assign');
  const logoTarget = isAdmin && canViewUsers ? '/admin/dashboard' : user ? '/profile' : '/';
  const recentNotifications = (notifications || []).slice(0, 5);
  const workflowNotificationCount = (notifications || []).filter((notification) => (
    [notification.title, notification.message, notification.link]
      .join(' ')
      .toLowerCase()
      .match(/profile|role|verification|approval|application|switch/)
  )).length;

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleNotificationSelect = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification._id)
      } catch {
        return
      }
    }

    if (notification.link) {
      navigate(notification.link)
    }
  }

  const avatarSrc = user?.profilePic && user.profilePic !== 'avatar.png'
    ? buildUploadUrl(user.profilePic)
    : user
      ? 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullName) + '&background=f0a500&color=0d1b2a&bold=true'
      : ''

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <Link to={logoTarget} className="logo" aria-label="YAMU Car Rental">
            <BrandLogo />
          </Link>

          <div className="nav-links">
            {hasHomePage && <NavLink to="/">Home</NavLink>}
            {user && !isAdmin && canManageProfile && <NavLink to="/profile">User Profile</NavLink>}
            {isDriver && <NavLink to="/driver/ads">Driver Ads</NavLink>}
            {isAdmin && canViewUsers && <NavLink to="/admin/dashboard">Admin Dashboard</NavLink>}
            {isAdmin && <NavLink to="/admin/bookings">Bookings</NavLink>}
          </div>

          <div className="nav-auth">
            {user ? (
              <>
                <div className="nav-notification">
                  <button type="button" className="nav-notification-trigger">
                    Alerts
                    {unreadNotificationCount > 0 && (
                      <span className="nav-notification-count">{unreadNotificationCount}</span>
                    )}
                  </button>
                  <div className="nav-notification-panel">
                    <div className="nav-notification-header">
                      <div>
                        <strong>Notifications</strong>
                        <small>{workflowNotificationCount} profile or role updates</small>
                      </div>
                      {unreadNotificationCount > 0 && (
                        <button type="button" onClick={() => markAllNotificationsRead()}>
                          Mark all read
                        </button>
                      )}
                    </div>

                    {recentNotifications.length > 0 ? (
                      <div className="nav-notification-list">
                        {recentNotifications.map((notification) => (
                          <button
                            key={notification._id}
                            type="button"
                            className={`nav-notification-item${notification.isRead ? '' : ' unread'}`}
                            onClick={() => handleNotificationSelect(notification)}
                          >
                            <strong>{notification.title}</strong>
                            <span>{notification.message}</span>
                            <small>{formatDateTime(notification.createdAt)}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="nav-notification-empty">No notifications yet.</div>
                    )}

                    {canManageProfile && (
                      <Link to="/profile#notifications" className="nav-notification-footer">
                        Open notification center
                      </Link>
                    )}
                  </div>
                </div>

                <div className="nav-user">
                  <img src={avatarSrc} alt={user.fullName} />
                  <span>{user.fullName?.split(' ')[0]}</span>
                  <div className="nav-user-dropdown">
                    {canManageProfile && <Link to="/profile">User Profile</Link>}
                    {isCustomer && <Link to="/bookings">My Bookings</Link>}
                    {isDriver && <Link to="/driver/ads">My Driver Ads</Link>}
                    {isDriver && <Link to="/driver/bookings">Booking Requests</Link>}
                    {!isAdmin && <Link to="/apply-roles">Role Applications</Link>}
                    <Link to="/switch-roles">Switch Roles</Link>
                    {isAdmin && canViewUsers && <Link to="/admin/dashboard">Overview</Link>}
                    {isAdmin && <Link to="/admin/bookings">Bookings</Link>}
                    {isAdmin && canViewUsers && canReviewRoles && <Link to="/admin/pending-approvals">Pending Approvals</Link>}
                    {isAdmin && canViewUsers && <Link to="/admin/users">Users</Link>}
                    {isAdmin && canViewUsers && canAssignRoles && <Link to="/admin/roles">Role Access</Link>}
                    <button onClick={handleLogout}>Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/signin" className="btn btn-outline btn-sm">Sign In</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>{children}</main>
      {showFooter && <Footer />}
    </>
  )
}
