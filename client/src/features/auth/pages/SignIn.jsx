import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getProfilePathForRole } from '../../../utils/roles';

const REMEMBERED_SIGNIN_KEY = 'uprm_remembered_signin';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const rememberedCredentials = localStorage.getItem(REMEMBERED_SIGNIN_KEY);

      if (!rememberedCredentials) {
        return;
      }

      const parsedCredentials = JSON.parse(rememberedCredentials);

      if (parsedCredentials?.email && parsedCredentials?.password) {
        setForm({
          email: parsedCredentials.email,
          password: parsedCredentials.password
        });
        setRememberMe(true);
        return;
      }
    } catch {
      // Ignore malformed saved credentials and continue with an empty form.
    }

    localStorage.removeItem(REMEMBERED_SIGNIN_KEY);
  }, []);

  const getPostLoginRoute = (nextUser) => {
    const nextRole = nextUser.activeRole || nextUser.role;

    if (nextRole === 'admin') {
      return '/admin/dashboard';
    }

    if (nextRole === 'customer') {
      return '/dashboard';
    }

    return getProfilePathForRole(nextRole);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const nextUser = await login(form.email, form.password);

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_SIGNIN_KEY, JSON.stringify(form));
      } else {
        localStorage.removeItem(REMEMBERED_SIGNIN_KEY);
      }

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
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label>Email or Username</label>
            <input
              type="text"
              name="signin_identifier"
              autoComplete="username"
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
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="auth-remember-row">
            <label className="auth-remember-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  const nextChecked = e.target.checked;
                  setRememberMe(nextChecked);

                  if (!nextChecked) {
                    localStorage.removeItem(REMEMBERED_SIGNIN_KEY);
                  }
                }}
              />
              <span>Remember me</span>
            </label>
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
