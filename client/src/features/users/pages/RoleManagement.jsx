import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../../../components/layout/Sidebar';
import { formatRoleLabel, getProfilePathForRole } from '../../../utils/roles';

const usableStatuses = ['active'];

const formatLabel = (value) => String(value || '')
  .split('_')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const getBadgeClass = (tone) => {
  switch (tone) {
    case 'success':
      return 'badge badge-success';
    case 'warning':
      return 'badge badge-warning';
    case 'danger':
      return 'badge badge-danger';
    default:
      return 'badge badge-info';
  }
};

const getRoleTone = (status) => {
  switch (status) {
    case 'active':
    case 'verified':
      return 'success';
    case 'pending':
    case 'unverified':
      return 'warning';
    case 'rejected':
    case 'suspended':
    case 'deactivated':
      return 'danger';
    default:
      return 'info';
  }
};

const getRoleSummary = (roleItem, activeRole) => {
  const isVerified = roleItem.verificationStatus === 'verified';
  const isSwitchable = usableStatuses.includes(roleItem.roleStatus) && isVerified;

  if (activeRole === roleItem.roleKey) {
    return {
      tone: 'success',
      statusLabel: 'Currently active',
      helperText: 'Permissions from this role are being used right now.'
    };
  }

  if (isSwitchable) {
    return {
      tone: 'success',
      statusLabel: 'Ready to switch',
      helperText: 'This role is approved and verified, so it can be activated immediately.'
    };
  }

  if (roleItem.roleStatus === 'pending') {
    return {
      tone: 'warning',
      statusLabel: 'Waiting for approval',
      helperText: 'Admin approval is still pending. You cannot activate this role yet.'
    };
  }

  if (roleItem.roleStatus === 'rejected') {
    return {
      tone: 'danger',
      statusLabel: 'Rejected',
      helperText: 'Review the role request details from your profile and resubmit if needed.'
    };
  }

  return {
    tone: 'info',
    statusLabel: 'Not switchable yet',
    helperText: 'This role must be active and verified before it becomes available.'
  };
};

export default function RoleManagement() {
  const { user, switchRole } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState('');
  const profileHubPath = getProfilePathForRole(user?.activeRole || user?.role);

  const roles = useMemo(() => user?.roles || [], [user?.roles]);
  const switchableRoles = useMemo(
    () => roles.filter((roleItem) => usableStatuses.includes(roleItem.roleStatus) && roleItem.verificationStatus === 'verified'),
    [roles]
  );
  const blockedRoles = roles.length - switchableRoles.length;

  const handleSwitch = async (role) => {
    setMessage('');
    setError('');
    setLoadingRole(role);

    try {
      await switchRole(role);
      setMessage(`Active role switched to ${formatRoleLabel(role)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch role');
    } finally {
      setLoadingRole('');
    }
  };

  return (
    <div className="dashboard-layout page-content role-management-page">
      <Sidebar />
      <main className="dashboard-content">
        <section className="form-card profile-hero-card role-management-hero">
          <div className="profile-hero-main">
            <div className="profile-hero-copy">
              <span className="profile-hero-kicker">Role Workspace</span>
              <h2>Switch roles with clearer access status</h2>
              <p>
                Review which roles are ready, which ones still need approval, and what will change before you switch.
              </p>
              <div className="profile-hero-actions">
                <Link className="btn btn-primary btn-sm" to={profileHubPath}>Open Profile Hub</Link>
                <Link className="btn btn-outline btn-sm" to="/apply-roles">Open Role Requests</Link>
              </div>
            </div>

            <div className="profile-hero-aside">
              <div className="profile-hero-meta">
                <span className="badge badge-info">Current role: {formatRoleLabel(user?.activeRole || 'customer')}</span>
                <span className="badge badge-info">{roles.length} assigned roles</span>
              </div>
              <div className="profile-progress-card">
                <div className="profile-progress-header">
                  <strong>{switchableRoles.length}</strong>
                  <span>roles ready to use</span>
                </div>
                <div className="account-progress-track">
                  <div
                    className="account-progress-fill"
                    style={{ width: `${roles.length ? Math.round((switchableRoles.length / roles.length) * 100) : 0}%` }}
                  />
                </div>
                <p>{blockedRoles > 0 ? `${blockedRoles} role(s) still need review or verification.` : 'All assigned roles are available.'}</p>
              </div>
            </div>
          </div>
        </section>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid profile-health-grid">
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{roles.length}</h3>
              <p>Assigned roles</p>
            </div>
          </div>
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{switchableRoles.length}</h3>
              <p>Ready to switch</p>
            </div>
          </div>
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{blockedRoles}</h3>
              <p>Blocked or pending roles</p>
            </div>
          </div>
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{user?.permissions?.length || 0}</h3>
              <p>Permissions in current role</p>
            </div>
          </div>
        </div>

        {user?.permissions?.length > 0 && (
          <section className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
            <div className="profile-section-heading">
              <div>
                <h3>Current Permissions</h3>
                <p>These permissions come from your active role and define what the app will allow right now.</p>
              </div>
            </div>
            <div className="pill-row">
              {user.permissions.map((permission) => (
                <span key={permission} className="badge badge-info">{permission}</span>
              ))}
            </div>
          </section>
        )}

        <section className="form-card profile-section-card">
          <div className="profile-section-heading">
            <div>
              <h3>Role Cards</h3>
              <p>Every assigned role shows its switch readiness, verification state, and next action.</p>
            </div>
            <span className="badge badge-info">{roles.length} assigned</span>
          </div>

          {roles.length > 0 ? (
            <div className="role-switch-grid">
              {roles.map((roleItem) => {
                const summary = getRoleSummary(roleItem, user?.activeRole);
                const canUse = usableStatuses.includes(roleItem.roleStatus) && roleItem.verificationStatus === 'verified';
                const isActive = user?.activeRole === roleItem.roleKey;

                return (
                  <article key={roleItem.roleKey} className={`card role-switch-card${isActive ? ' active' : ''}`}>
                    <div className="card-body">
                      <div className="role-switch-card-top">
                        <div>
                          <h4>{formatRoleLabel(roleItem.roleKey)}</h4>
                          <p>{summary.helperText}</p>
                        </div>
                        <span className={getBadgeClass(summary.tone)}>{summary.statusLabel}</span>
                      </div>

                      <div className="role-card-badge-grid">
                        <span className={getBadgeClass(getRoleTone(roleItem.roleStatus))}>
                          Status: {formatLabel(roleItem.roleStatus)}
                        </span>
                        <span className={getBadgeClass(getRoleTone(roleItem.verificationStatus))}>
                          Verification: {formatLabel(roleItem.verificationStatus)}
                        </span>
                        <span className={getBadgeClass(roleItem.isPrimary ? 'success' : 'info')}>
                          {roleItem.isPrimary ? 'Primary role' : 'Secondary role'}
                        </span>
                        <span className={getBadgeClass(isActive ? 'success' : canUse ? 'info' : 'warning')}>
                          {isActive ? 'Active now' : canUse ? 'Switchable' : 'Locked'}
                        </span>
                      </div>

                      <div className="role-card-meta-grid">
                        <div className="admin-data-item">
                          <span>Access state</span>
                          <strong>{canUse ? 'Ready' : 'Blocked'}</strong>
                        </div>
                        <div className="admin-data-item">
                          <span>Can switch now</span>
                          <strong>{canUse ? 'Yes' : 'No'}</strong>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-block"
                        type="button"
                        onClick={() => handleSwitch(roleItem.roleKey)}
                        disabled={loadingRole === roleItem.roleKey || isActive || !canUse}
                      >
                        {isActive
                          ? 'Currently Active'
                          : loadingRole === roleItem.roleKey
                            ? 'Switching...'
                            : canUse
                              ? 'Switch to This Role'
                              : 'Not Available Yet'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty-state">No role assignments are available for this account yet.</div>
          )}
        </section>

        <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
          Use Role Requests from your profile to apply for new access. Pending roles stay visible here, but only active and verified roles can be switched to.
        </div>
      </main>
    </div>
  );
}
