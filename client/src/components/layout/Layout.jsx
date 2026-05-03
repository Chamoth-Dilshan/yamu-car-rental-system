import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buildUploadUrl } from '../../api/config';
import { formatDateTime } from '../../utils/formatters';
import { formatRoleLabel, getProfilePathForRole } from '../../utils/roles';
import BrandLogo from './BrandLogo';
import Footer from './Footer';

const NotificationBellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    className="nav-notification-icon"
  >
    <path
      d="M12 3.75a4.25 4.25 0 0 0-4.25 4.25v1.07c0 .9-.3 1.77-.85 2.48L5.8 12.98a2.75 2.75 0 0 0 2.16 4.52h8.08a2.75 2.75 0 0 0 2.16-4.52l-1.1-1.43a4.02 4.02 0 0 1-.85-2.48V8A4.25 4.25 0 0 0 12 3.75Zm0 17.5a2.73 2.73 0 0 1-2.58-1.84.75.75 0 0 1 1.42-.48.03.03 0 0 0 .01.02A1.23 1.23 0 0 0 12 19.75c.53 0 1 .33 1.17.82a.75.75 0 0 1-1.17.68Z"
      fill="currentColor"
    />
  </svg>
);

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
  const notificationRef = useRef(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const activeRole = user?.activeRole || user?.role;
  const isCustomer = activeRole === 'customer';
  const isDriver = activeRole === 'driver';
  const isStaff = activeRole === 'staff';
  const isAdmin = activeRole === 'admin';
  const hasHomePage = !user || activeRole === 'customer';
  const showDiscoverLinks = hasHomePage;
  const isAccountWorkspaceRoute = ['/dashboard', '/profile', '/notifications', '/bookings', '/payments', '/apply-roles', '/switch-roles'].some((path) => (
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  ));
  const footerHiddenPaths = new Set(['/signin']);
  const showFooter = !footerHiddenPaths.has(location.pathname) && (!user || (isCustomer && !isAccountWorkspaceRoute));
  const canManageProfile = hasPermission('profile.manage');
  const canViewUsers = hasPermission('users.view');
  const canReviewRoles = hasPermission('roles.review');
  const canAssignRoles = hasPermission('roles.assign');
  const canManagePayments = hasPermission('payments.manage');
  const userProfilePath = getProfilePathForRole('customer');
  const roleProfilePath = getProfilePathForRole(activeRole);
  const logoTarget = isAdmin ? '/admin/dashboard' : isCustomer ? '/dashboard' : user ? roleProfilePath : '/';
  const roleProfileNavLabel = `${formatRoleLabel(activeRole || 'customer')} Profile`;
  const recentNotifications = (notifications || []).slice(0, 5);

  useEffect(() => {
    setIsNotificationOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

    setIsNotificationOpen(false)

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
    <div className="app-shell">
      <nav className="navbar">
        <div className="container">
          <Link to={logoTarget} className="logo" aria-label="YAMU Car Rental">
            <BrandLogo />
          </Link>

          <div className="nav-links">
            {hasHomePage && <NavLink to="/">Home</NavLink>}
            {showDiscoverLinks && <NavLink to="/cars">Explore Cars</NavLink>}
            {showDiscoverLinks && <NavLink to="/drivers">Explore Drivers</NavLink>}
            {user && isCustomer && <NavLink to="/dashboard">Dashboard</NavLink>}
            {user && isCustomer && canManageProfile && <NavLink to={userProfilePath}>User Profile</NavLink>}
            {user && !isCustomer && !isAdmin && canManageProfile && <NavLink to={roleProfilePath}>{roleProfileNavLabel}</NavLink>}
            {user && isAdmin && canManageProfile && <NavLink to={roleProfilePath}>Admin Profile</NavLink>}
            {isDriver && <NavLink to="/driver/ads">Driver Ad</NavLink>}
            {isStaff && <NavLink to="/staff/vehicles">Store Vehicles</NavLink>}
            {isAdmin && canViewUsers && <NavLink to="/admin/dashboard">Admin Dashboard</NavLink>}
            {isAdmin && <NavLink to="/admin/bookings">Bookings</NavLink>}
            {isAdmin && canManagePayments && <NavLink to="/admin/payments">Payments</NavLink>}
          </div>

          <div className="nav-auth">
            {user ? (
              <>
                <div
                  ref={notificationRef}
                  className={`nav-notification${isNotificationOpen ? ' open' : ''}`}
                >
                  <button
                    type="button"
                    className="nav-notification-trigger"
                    aria-label="Notifications"
                    aria-expanded={isNotificationOpen}
                    aria-controls="nav-notification-panel"
                    onClick={() => setIsNotificationOpen((current) => !current)}
                  >
                    <NotificationBellIcon />
                    {unreadNotificationCount > 0 && (
                      <span className="nav-notification-count">{unreadNotificationCount}</span>
                    )}
                  </button>
                  <div id="nav-notification-panel" className="nav-notification-panel">
                    <div className="nav-notification-header">
                      <div>
                        <strong>Notifications</strong>
                        <small>{notifications?.length || 0} total notifications</small>
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
                      <Link
                        to="/notifications"
                        className="nav-notification-footer"
                        onClick={() => setIsNotificationOpen(false)}
                      >
                        Open notification center
                      </Link>
                    )}
                  </div>
                </div>

                <div className="nav-user">
                  <img src={avatarSrc} alt={user.fullName} />
                  <span>{user.fullName?.split(' ')[0]}</span>
                  <div className="nav-user-dropdown">
                    {showDiscoverLinks && <Link to="/cars">Explore Cars</Link>}
                    {showDiscoverLinks && <Link to="/drivers">Explore Drivers</Link>}
                    {isCustomer && <Link to="/dashboard">Dashboard</Link>}
                    {canManageProfile && isCustomer && <Link to={userProfilePath}>User Profile</Link>}
                    {canManageProfile && !isCustomer && !isAdmin && <Link to={roleProfilePath}>{roleProfileNavLabel}</Link>}
                    {canManageProfile && isAdmin && <Link to={roleProfilePath}>Admin Profile</Link>}
                    {canManageProfile && <Link to="/notifications">Notifications</Link>}
                    {isCustomer && <Link to="/bookings">My Bookings</Link>}
                    {isCustomer && <Link to="/payments/history">Payments</Link>}
                    {isDriver && <Link to="/driver/ads">My Driver Ad</Link>}
                    {isDriver && <Link to="/driver/bookings">Booking Requests</Link>}
                    {isStaff && <Link to="/staff/vehicles">My Vehicles</Link>}
                    {isStaff && <Link to="/staff/bookings">Vehicle Requests</Link>}
                    {!isAdmin && <Link to="/apply-roles">Role Applications</Link>}
                    {!isAdmin && <Link to="/switch-roles">Switch Roles</Link>}
                    {isAdmin && canViewUsers && <Link to="/admin/dashboard">Overview</Link>}
                    {isAdmin && <Link to="/admin/reviews">Review Approvals</Link>}
                    {isAdmin && <Link to="/admin/disputes">Dispute Management</Link>}
                    {isAdmin && <Link to="/admin/bookings">Bookings</Link>}
                    {isAdmin && canManagePayments && <Link to="/admin/payments">Payments</Link>}
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

      <main className="app-main">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}
