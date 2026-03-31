import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();
  const isAdmin = (user?.activeRole || user?.role) === 'admin';

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h3>YA<span style={{ color: 'var(--accent)' }}>MU</span> Cars</h3>
            <p>
              Car rentals for daily commutes, airport pickups, and family travel with a simple
              account flow for returning customers and staff.
            </p>
          </div>
          <div>
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              {!user && <li><Link to="/signin">Sign In</Link></li>}
              {!user && <li><Link to="/admin/signin">Admin Login</Link></li>}
              {!user && <li><Link to="/signup">Create Account</Link></li>}
              {user && !isAdmin && <li><Link to="/profile">My Account</Link></li>}
              {isAdmin && <li><Link to="/admin/dashboard">Admin Dashboard</Link></li>}
            </ul>
          </div>
          <div>
            <h3>Popular Uses</h3>
            <ul>
              <li>City errands</li>
              <li>Airport pickup</li>
              <li>Business travel</li>
              <li>Weekend trips</li>
            </ul>
          </div>
          <div>
            <h3>Account Access</h3>
            <ul>
              <li>Secure sign-in</li>
              <li>Profile details</li>
              <li>Rental-ready account</li>
              <li>Admin oversight</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} YAMU Car Rental.</p>
        </div>
      </div>
    </footer>
  );
}
