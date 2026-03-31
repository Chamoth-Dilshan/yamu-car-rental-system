import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildUploadUrl } from '../api/config';
import Footer from './Footer';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = (user?.activeRole || user?.role) === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const avatarSrc = user?.profilePic && user.profilePic !== 'avatar.png'
    ? buildUploadUrl(user.profilePic)
    : user
      ? 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.fullName) + '&background=f0a500&color=0d1b2a&bold=true'
      : '';

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="logo">YA<span>MU</span></Link>

          <div className="nav-links">
            <NavLink to="/">Home</NavLink>
            {user && !isAdmin && <NavLink to="/account">Account</NavLink>}
            {isAdmin && <NavLink to="/admin/dashboard">Admin Dashboard</NavLink>}
          </div>

          <div className="nav-auth">
            {user ? (
              <div className="nav-user">
                <img src={avatarSrc} alt={user.fullName} />
                <span>{user.fullName?.split(' ')[0]}</span>
                <div className="nav-user-dropdown">
                  {!isAdmin && <Link to="/account">Account Overview</Link>}
                  {!isAdmin && <Link to="/profile">Profile Details</Link>}
                  {!isAdmin && <Link to="/apply-roles">Role Requests</Link>}
                  {!isAdmin && <Link to="/switch-roles">Switch Roles</Link>}
                  {isAdmin && <Link to="/admin/dashboard">Overview</Link>}
                  {isAdmin && <Link to="/admin/pending-approvals">Pending Approvals</Link>}
                  {isAdmin && <Link to="/admin/users">Users</Link>}
                  {isAdmin && <Link to="/admin/roles">Role Access</Link>}
                  <button onClick={handleLogout}>Logout</button>
                </div>
              </div>
            ) : (
              <>
                <Link to="/signin" className="btn btn-outline btn-sm">Sign In</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
                <Link to="/admin/signin" className="btn btn-secondary btn-sm">Admin</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>{children}</main>
      <Footer />
    </>
  );
}
