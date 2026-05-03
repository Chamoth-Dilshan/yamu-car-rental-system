import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getProfilePathForRole } from '../../../utils/roles';
import {
  validateEmail,
  validatePasswordStrength,
  validateRequiredText,
  validateUsername
} from '../../../utils/validation';
import GoogleAuthButton from '../components/GoogleAuthButton';

export default function SignUp() {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

    const validationError = validateRequiredText(form.fullName, 'Full name')
      || validateUsername(form.username)
      || validateEmail(form.email)
      || validatePasswordStrength(form.password);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await register({
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      navigate('/signin', {
        state: {
          message: result?.message || 'Registration successful. You can now sign in.'
        },
        replace: true
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setGoogleLoading(true);
    setError('');

    try {
      const nextUser = await googleLogin(credential);
      navigate(getPostLoginRoute(nextUser));
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page page-content">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">Sign up as a user first, then apply for driver or store access after onboarding.</p>
        {error && <div className="alert alert-danger">{error}</div>}
        <GoogleAuthButton
          buttonText="Sign up with Google"
          disabled={loading || googleLoading}
          googleText="signup_with"
          onCredential={handleGoogleCredential}
          onError={setError}
        />
        <div className="auth-separator"><span>or</span></div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <input type="text" name="register-username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
          <input type="password" name="register-password" autoComplete="new-password" style={{ display: 'none' }} tabIndex={-1} />
          <div className="form-group">
            <label>Full Name</label>
            <input
              name="signup_full_name"
              autoComplete="off"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              name="signup_username"
              autoComplete="off"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Choose a username"
              pattern="[A-Za-z0-9._-]{3,30}"
              title="Use 3-30 letters, numbers, underscores, dots, or hyphens"
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="signup_email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="signup_password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Create a password"
              minLength={8}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="signup_confirm_password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || googleLoading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <Link to="/signin">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
