import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminSignIn() {
  const { login, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const nextUser = await login(form.email, form.password);
      const nextRole = nextUser.activeRole || nextUser.role;

      if (nextRole === 'admin') {
        navigate('/admin/dashboard');
        return;
      }

      if ((nextUser.roles || []).some((role) => role.roleKey === 'admin')) {
        await switchRole('admin');
        navigate('/admin/dashboard');
        return;
      }

      if (nextRole !== 'admin') {
        logout();
        setError('Admin access only');
        return;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page-content">
      <div className="auth-card">
        <h1>Admin Login</h1>
        <p className="subtitle">Sign in to open the admin dashboard.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Username</label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Enter admin email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Admin Sign In'}
          </button>
        </form>
        <div className="auth-link">
          User account? <Link to="/signin">Go to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
