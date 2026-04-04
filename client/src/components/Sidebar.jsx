import { NavLink } from 'react-router-dom'
import { buildUploadUrl } from '../api/config'
import { useAuth } from '../context/AuthContext'
import { formatRoleLabel } from '../utils/roles'

const menuItems = {
  customer: [
    { section: 'Account' },
    { to: '/profile/user', label: 'User Profile', end: true },
    { to: '/notifications', label: 'Notifications', end: true },
    { to: '/bookings', label: 'My Bookings', end: true },
    { to: '/apply-roles', label: 'Role Requests', end: true },
    { to: '/switch-roles', label: 'Switch Roles', end: true }
  ],
  driver: [
    { section: 'Driver Workspace' },
    { to: '/driver/ads', label: 'My Driver Ads', end: true },
    { to: '/driver/bookings', label: 'Booking Requests', end: true },
    { section: 'Account' },
    { to: '/profile/driver', label: 'Driver Profile', end: true },
    { to: '/notifications', label: 'Notifications', end: true },
    { to: '/apply-roles', label: 'Role Requests', end: true },
    { to: '/switch-roles', label: 'Switch Roles', end: true }
  ],
  staff: [
    { section: 'Store Workspace' },
    { to: '/staff/vehicles', label: 'My Vehicles', end: true },
    { to: '/staff/bookings', label: 'Vehicle Requests', end: true },
    { section: 'Account' },
    { to: '/profile/store', label: 'Store Profile', end: true },
    { to: '/notifications', label: 'Notifications', end: true },
    { to: '/apply-roles', label: 'Role Requests', end: true },
    { to: '/switch-roles', label: 'Switch Roles', end: true }
  ],
  admin: [
    { section: 'Admin Panel' },
    { to: '/admin/dashboard', label: 'Overview', end: true },
<<<<<<< HEAD
    { to: '/admin/pending-approvals', label: 'Pending Approvals', end: true },
    { to: '/admin/users', label: 'Users', end: true },
    { to: '/admin/roles', label: 'Role Access', end: true },
    { section: 'Pricing & Promos' },
    { to: '/admin/pricing-overview', label: 'Overview', end: true },
    { to: '/admin/campaigns', label: 'Campaigns', end: true },
    { to: '/admin/promotions', label: 'Promotions', end: true },
    { to: '/admin/pricing-rules', label: 'Pricing Rules', end: true },
    { to: '/admin/pricing-simulator', label: 'Simulator', end: true }
=======
    { to: '/admin/pending-approvals', label: 'Pending Approvals', end: false },
    { to: '/admin/users', label: 'Users', end: false },
    { to: '/admin/roles', label: 'Role Access', end: false },
    { section: 'Account' },
    { to: '/profile/admin', label: 'Admin Profile', end: true },
    { to: '/notifications', label: 'Notifications', end: true }
>>>>>>> 5e8b29af6d9c8f6ce80172e7cd8132363b7f2c04
  ]
}

export default function Sidebar() {
  const { user, hasPermission } = useAuth()
  const activeRole = user?.activeRole
  const items = (menuItems[activeRole] || menuItems.customer).filter((item) => {
    if (!item.to) {
      return true
    }

    if (item.to.startsWith('/profile') || item.to === '/notifications') {
      return hasPermission('profile.manage')
    }

    if (item.to === '/admin/dashboard' || item.to === '/admin/users') {
      return hasPermission('users.view')
    }

    if (item.to === '/admin/pending-approvals') {
      return hasPermission('users.view') && hasPermission('roles.review')
    }

    if (item.to === '/admin/roles') {
      return hasPermission('users.view') && hasPermission('roles.assign')
    }

    return true
  })
  const avatarSrc = user?.profilePic && user.profilePic !== 'avatar.png'
    ? buildUploadUrl(user.profilePic)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=f0a500&color=0d1b2a&bold=true`

  return (
    <aside className="sidebar">
      <div className="sidebar-user">
        <img src={avatarSrc} alt={user?.fullName} />
        <h4>{user?.fullName}</h4>
        <span>{formatRoleLabel(user?.activeRole)}</span>
        <small>{user?.primaryRole ? `Primary: ${formatRoleLabel(user.primaryRole)}` : 'Primary role pending'}</small>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          if (item.section) {
            return <div key={item.section} className="sidebar-section-label">{item.section}</div>
          }

          return (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
