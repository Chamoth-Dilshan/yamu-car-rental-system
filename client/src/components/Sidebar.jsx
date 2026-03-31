import { NavLink } from 'react-router-dom';
import { buildUploadUrl } from '../api/config';
import { useAuth } from '../context/AuthContext';

const menuItems = {
  customer: [
    { to: '/profile', label: 'My Profile' },
    { to: '/apply-roles', label: 'Apply Roles' },
    { to: '/switch-roles', label: 'Switch Roles' }
  ],
  driver: [
    { to: '/profile', label: 'My Profile' },
    { to: '/apply-roles', label: 'Apply Roles' },
    { to: '/switch-roles', label: 'Switch Roles' }
  ],
  staff: [
    { to: '/profile', label: 'My Profile' },
    { to: '/apply-roles', label: 'Apply Roles' },
    { to: '/switch-roles', label: 'Switch Roles' }
  ],
  admin: [
    { section: 'Admin Panel' },
    { to: '/admin/dashboard', label: 'Overview', end: true },
    { to: '/admin/pending-approvals', label: 'Pending Approvals', end: true },
    { to: '/admin/users', label: 'Users', end: true },
    { to: '/admin/roles', label: 'Role Access', end: true }
  ]
};

export default function Sidebar() {
  const { user } = useAuth();
  const items = menuItems[user?.activeRole] || menuItems.customer;
  const avatarSrc = user?.profilePic && user.profilePic !== 'avatar.png'
    ? buildUploadUrl(user.profilePic)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=f0a500&color=0d1b2a&bold=true`;

  return (
    <aside className="sidebar">
      <div className="sidebar-user">
        <img src={avatarSrc} alt={user?.fullName} />
        <h4>{user?.fullName}</h4>
        <span>{user?.activeRole}</span>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          if (item.section) {
            return <div key={item.section} className="sidebar-section-label">{item.section}</div>;
          }

          return (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
