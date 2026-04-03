import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const usableStatuses = ['active'];

export default function RoleManagement() {
  const { user, switchRole } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingRole, setLoadingRole] = useState('');

  const handleSwitch = async (role) => {
    setMessage('');
    setError('');
    setLoadingRole(role);

    try {
      await switchRole(role);
      setMessage(`Active role switched to ${role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch role');
    } finally {
      setLoadingRole('');
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Switch Roles</h2>
          <p style={{ color: 'var(--text-light)' }}>Switch only between roles that were already approved by admin.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <h3>{user?.activeRole}</h3>
              <p>Current Active Role</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{user?.primaryRole}</h3>
              <p>Primary Role</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>{user?.permissions?.length || 0}</h3>
              <p>Active Permissions</p>
            </div>
          </div>
        </div>

        {user?.permissions?.length > 0 && (
          <div className="form-card" style={{ marginBottom: '1.5rem' }}>
            <div className="form-header">
              <h2>Current Permissions</h2>
              <p style={{ color: 'var(--text-light)' }}>Permissions come from your active role and will be used for future access checks.</p>
            </div>
            <div className="pill-row">
              {user.permissions.map((permission) => (
                <span key={permission} className="badge badge-info">{permission}</span>
              ))}
            </div>
          </div>
        )}

        <div className="grid-3">
          {user?.roles?.map((roleItem) => {
            const canUse = usableStatuses.includes(roleItem.roleStatus) && roleItem.verificationStatus === 'verified';

            return (
              <div key={roleItem.roleKey} className="card">
                <div className="card-body">
                  <h4>{roleItem.roleKey}</h4>
                  <p style={{ color: 'var(--text-light)', margin: '0.5rem 0' }}>Status: {roleItem.roleStatus}</p>
                  <p style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}>Verification: {roleItem.verificationStatus}</p>
                  <p style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }}>Primary role: {roleItem.isPrimary ? 'Yes' : 'No'}</p>
                  <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
                    Access: {canUse ? 'Eligible for switching' : 'Blocked until active and verified'}
                  </p>
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => handleSwitch(roleItem.roleKey)}
                    disabled={loadingRole === roleItem.roleKey || user.activeRole === roleItem.roleKey || !canUse}
                  >
                    {user.activeRole === roleItem.roleKey
                      ? 'Active Role'
                      : loadingRole === roleItem.roleKey
                        ? 'Switching...'
                        : canUse
                          ? 'Switch Role'
                          : 'Unavailable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
          Use Apply Roles to request new access. Pending roles cannot be switched to until an admin approves them.
        </div>
      </main>
    </div>
  );
}
