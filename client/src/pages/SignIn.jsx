import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const getPostLoginRoute = (nextUser) => {
    const nextRole = nextUser.activeRole || nextUser.role;

    if (nextRole === 'admin') {
      return '/admin/dashboard';
    }

    if (nextRole === 'customer') {
      return '/';
    }

    return '/profile';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const nextUser = await login(form.email, form.password);
      navigate(getPostLoginRoute(nextUser));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page-content">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to manage your rentals, account details, and access.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit} autoComplete="off">
          <input type="text" name="auth-username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
          <input type="password" name="auth-password" autoComplete="new-password" style={{ display: 'none' }} tabIndex={-1} />
          <div className="form-group">
            <label>Email or Username</label>
            <input
              type="text"
              name="signin_identifier"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="signin_password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-link">
          Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
