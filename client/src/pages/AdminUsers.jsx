import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API from '../api/axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const manageableRoles = ['customer', 'driver', 'staff'];
const accountStatuses = ['active', 'suspended', 'deactivated'];
const roleStatuses = ['pending', 'active', 'verified', 'rejected', 'suspended', 'deactivated'];
const verificationStatuses = ['unverified', 'pending', 'verified', 'rejected'];
const adminSections = {
  '/admin/dashboard': {
    title: 'Admin Dashboard',
    description: 'Monitor approvals, user accounts, and role access from one place.'
  },
  '/admin/pending-approvals': {
    title: 'Pending Approvals',
    description: 'Review driver and staff applications that are waiting for an admin decision.'
  },
  '/admin/users': {
    title: 'User Management',
    description: 'Update account records, active role selection, and account status for all non-admin users.'
  },
  '/admin/roles': {
    title: 'Role Access',
    description: 'Control customer, driver, and staff assignments, verification state, and primary role setup.'
  }
};

const canUseRole = (role) => ['active', 'verified'].includes(role.roleStatus) && role.verificationStatus === 'verified';

const formatLabel = (value) => String(value)
  .replace(/([A-Z])/g, ' $1')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase())
  .trim();

const getPendingApplications = (user) => (user.providerApplications || []).filter((item) => item.status === 'pending');

export default function AdminUsers() {
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const isPendingPath = location.pathname.startsWith('/admin/pending-approvals');
  const isUsersPath = location.pathname.startsWith('/admin/users');
  const isRolesPath = location.pathname.startsWith('/admin/roles');
  const isOverviewPath = !isPendingPath && !isUsersPath && !isRolesPath;

  const currentSection = adminSections[location.pathname] || adminSections['/admin/dashboard'];
  const pendingReviewUsers = users.filter((user) => getPendingApplications(user).length > 0);
  const orderedUsers = [...users].sort((left, right) => {
    const pendingDelta = getPendingApplications(right).length - getPendingApplications(left).length;

    if (pendingDelta !== 0) {
      return pendingDelta;
    }

    return left.fullName.localeCompare(right.fullName);
  });
  const nonAdminUsers = orderedUsers.filter((user) => !user.roles.some((role) => role.roleKey === 'admin'));
  const roleSummary = manageableRoles.map((roleKey) => ({
    roleKey,
    assignedCount: users.filter((user) => user.roles.some((role) => role.roleKey === roleKey)).length,
    usableCount: users.filter((user) => user.roles.some((role) => role.roleKey === roleKey && canUseRole(role))).length,
    pendingCount: users.filter((user) => (user.providerApplications || []).some((application) => application.roleKey === roleKey && application.status === 'pending')).length
  }));
  const dashboardStats = [
    { label: 'Total Accounts', value: users.length },
    { label: 'Pending Approvals', value: pendingReviewUsers.reduce((total, user) => total + getPendingApplications(user).length, 0) },
    {
      label: 'Active Provider Roles',
      value: users.reduce((total, user) => total + user.roles.filter((role) => ['driver', 'staff'].includes(role.roleKey) && canUseRole(role)).length, 0)
    },
    {
      label: 'Restricted Accounts',
      value: users.filter((user) => ['suspended', 'deactivated'].includes(user.accountStatus)).length
    }
  ];

  useEffect(() => {
    API.get('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load users'));
  }, []);

  const updateField = (userId, field, value) => {
    setUsers((prev) => prev.map((user) => user._id === userId ? { ...user, [field]: value } : user));
  };

  const updateRoleField = (userId, roleKey, field, value) => {
    setUsers((prev) => prev.map((user) => {
      if (user._id !== userId) {
        return user;
      }

      return {
        ...user,
        roles: user.roles.map((role) => role.roleKey === roleKey ? { ...role, [field]: value } : role)
      };
    }));
  };

  const setPrimaryRole = (userId, primaryRole) => {
    setUsers((prev) => prev.map((user) => {
      if (user._id !== userId) {
        return user;
      }

      const usableRoles = user.roles.map((role) => ({
        ...role,
        isPrimary: role.roleKey === primaryRole
      }));

      const nextActiveRole = usableRoles.some((role) => role.roleKey === user.activeRole)
        ? user.activeRole
        : primaryRole;

      return {
        ...user,
        primaryRole,
        activeRole: nextActiveRole,
        role: nextActiveRole,
        roles: usableRoles
      };
    }));
  };

  const toggleAssignedRole = (userId, roleKey) => {
    setUsers((prev) => prev.map((user) => {
      if (user._id !== userId) {
        return user;
      }

      const existing = user.roles.find((role) => role.roleKey === roleKey);
      if (existing) {
        if (roleKey === 'customer' && !user.roles.some((role) => role.roleKey === 'admin')) {
          return user;
        }

        const nextRoles = user.roles.filter((role) => role.roleKey !== roleKey);
        const nextPrimaryRole = nextRoles.find((role) => role.isPrimary)?.roleKey || nextRoles[0]?.roleKey || null;
        const nextActiveRole = nextRoles.some((role) => role.roleKey === user.activeRole)
          ? user.activeRole
          : nextPrimaryRole;

        return {
          ...user,
          primaryRole: nextPrimaryRole,
          activeRole: nextActiveRole,
          role: nextActiveRole,
          roles: nextRoles.map((role) => ({
            ...role,
            isPrimary: role.roleKey === nextPrimaryRole
          }))
        };
      }

      return {
        ...user,
        roles: [
          ...user.roles,
          {
            roleKey,
            roleStatus: 'active',
            verificationStatus: 'verified',
            isPrimary: false
          }
        ]
      };
    }));
  };

  const saveUser = async (user) => {
    setBusyAction(`save-${user._id}`);
    setMessage('');
    setError('');

    try {
      const payload = {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        accountStatus: user.accountStatus,
        activeRole: user.activeRole,
        primaryRole: user.primaryRole,
        roles: user.roles
      };

      const res = await API.put(`/admin/users/${user._id}`, payload);
      setUsers((prev) => prev.map((item) => item._id === user._id ? res.data : item));
      setMessage(`Updated ${res.data.fullName}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setBusyAction('');
    }
  };

  const reviewApplication = async (userId, roleKey, action) => {
    const reason = action === 'reject'
      ? window.prompt(`Reason for rejecting ${roleKey} application:`) || ''
      : '';

    setBusyAction(`${action}-${userId}-${roleKey}`);
    setMessage('');
    setError('');

    try {
      const res = await API.put(`/admin/users/${userId}/applications/${roleKey}/review`, {
        action,
        rejectionReason: reason
      });
      setUsers((prev) => prev.map((item) => item._id === userId ? res.data.user : item));
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review application');
    } finally {
      setBusyAction('');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) {
      return;
    }

    setBusyAction(`delete-${userId}`);
    setMessage('');
    setError('');

    try {
      await API.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user._id !== userId));
      setMessage('User deleted');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setBusyAction('');
    }
  };

  const renderPendingApplications = (user, pendingApplications, compact = false) => (
    <div className="alert alert-info">
      {pendingApplications.map((application) => {
        const applicationData = Object.entries(application.applicationData || {}).filter(([, value]) => value);

        return (
          <div key={application.roleKey} className={`admin-approval-item${compact ? ' compact' : ''}`}>
            <div>
              <strong>{formatLabel(application.roleKey)}</strong> application is pending review.
              {application.submittedAt && (
                <div className="admin-meta-text">Submitted {new Date(application.submittedAt).toLocaleDateString()}</div>
              )}
              {applicationData.length > 0 && (
                <div className="admin-data-grid">
                  {applicationData.map(([field, value]) => (
                    <div key={field} className="admin-data-item">
                      <span>{formatLabel(field)}</span>
                      <strong>{String(value)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pill-row">
              <button
                className="btn btn-primary btn-sm"
                type="button"
                disabled={busyAction === `approve-${user._id}-${application.roleKey}`}
                onClick={() => reviewApplication(user._id, application.roleKey, 'approve')}
              >
                {busyAction === `approve-${user._id}-${application.roleKey}` ? 'Approving...' : 'Approve'}
              </button>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                disabled={busyAction === `reject-${user._id}-${application.roleKey}`}
                onClick={() => reviewApplication(user._id, application.roleKey, 'reject')}
              >
                {busyAction === `reject-${user._id}-${application.roleKey}` ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderUserCard = (user, mode = 'full') => {
    const hasAdminRole = user.roles.some((role) => role.roleKey === 'admin');
    const pendingApplications = getPendingApplications(user);
    const switchableRoles = user.roles.filter(canUseRole);
    const canDeleteUser = !hasAdminRole && currentUser?._id !== user._id;
    const isRoleMode = mode === 'roles';

    return (
      <div key={user._id} className="form-card admin-card">
        <div className="card-header">
          <div>
            <h3>{user.fullName}</h3>
            <p style={{ color: 'var(--text-light)' }}>{user.email}</p>
            <div className="pill-row" style={{ marginTop: '0.75rem' }}>
              <span className="badge badge-info">Active role: {user.activeRole}</span>
              <span className="badge badge-success">Primary role: {user.primaryRole}</span>
              <span className="badge badge-warning">Account: {user.accountStatus}</span>
            </div>
          </div>
          {canDeleteUser && mode === 'full' && (
            <button className="btn btn-danger btn-sm" disabled={busyAction === `delete-${user._id}`} onClick={() => deleteUser(user._id)}>
              {busyAction === `delete-${user._id}` ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        {pendingApplications.length > 0 && renderPendingApplications(user, pendingApplications, isRoleMode)}

        {isRoleMode ? (
          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input value={user.username || ''} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'username', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Account Status</label>
              <select value={user.accountStatus} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'accountStatus', e.target.value)}>
                {accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value={user.fullName} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'fullName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input value={user.username || ''} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'username', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input value={user.email} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Account Status</label>
                <select value={user.accountStatus} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'accountStatus', e.target.value)}>
                  {accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Active Role</label>
            <select value={user.activeRole || ''} disabled={hasAdminRole} onChange={(e) => updateField(user._id, 'activeRole', e.target.value)}>
              {(switchableRoles.length > 0 ? switchableRoles : user.roles).map((role) => (
                <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Primary Role</label>
            <select value={user.primaryRole || ''} disabled={hasAdminRole} onChange={(e) => setPrimaryRole(user._id, e.target.value)}>
              {user.roles.map((role) => (
                <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
              ))}
            </select>
          </div>
        </div>

        {!hasAdminRole && (
          <div className="form-group">
            <label>Assigned Roles</label>
            <div className="checkbox-row">
              {manageableRoles.map((roleKey) => {
                const checked = user.roles.some((role) => role.roleKey === roleKey);
                const disabled = roleKey === 'customer';

                return (
                  <label key={roleKey} className="checkbox-chip">
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleAssignedRole(user._id, roleKey)} />
                    {roleKey}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="stats-grid admin-role-grid">
          {user.roles.map((role) => (
            <div key={role.roleKey} className="card">
              <div className="card-body">
                <h4>{role.roleKey}</h4>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Role Status</label>
                  <select value={role.roleStatus} disabled={hasAdminRole} onChange={(e) => updateRoleField(user._id, role.roleKey, 'roleStatus', e.target.value)}>
                    {roleStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Verification</label>
                  <select value={role.verificationStatus} disabled={hasAdminRole} onChange={(e) => updateRoleField(user._id, role.roleKey, 'verificationStatus', e.target.value)}>
                    {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <label className="checkbox-chip">
                  <input type="checkbox" checked={role.isPrimary} disabled={hasAdminRole} onChange={() => setPrimaryRole(user._id, role.roleKey)} />
                  Primary role
                </label>
              </div>
            </div>
          ))}
        </div>

        {hasAdminRole && (
          <div className="alert alert-warning">
            Admin accounts remain DB-seeded and read-only in this workflow. Use the dedicated admin profile page for self-service admin details.
          </div>
        )}

        {!hasAdminRole && (
          <button className="btn btn-primary" disabled={busyAction === `save-${user._id}`} onClick={() => saveUser(user)}>
            {busyAction === `save-${user._id}` ? 'Saving...' : isRoleMode ? 'Save Role Access' : 'Save User'}
          </button>
        )}
      </div>
    );
  };

  const renderOverview = () => (
    <>
      <div className="stats-grid">
        {dashboardStats.map((item) => (
          <div key={item.label} className="stat-card">
            <div className="stat-info">
              <h3>{item.value}</h3>
              <p>{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-section-grid">
        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Pending Queue</h3>
              <p style={{ color: 'var(--text-light)' }}>Applications that need review right now.</p>
            </div>
            <Link className="btn btn-outline btn-sm" to="/admin/pending-approvals">Open Queue</Link>
          </div>
          {pendingReviewUsers.length > 0 ? (
            <div className="admin-stack">
              {pendingReviewUsers.slice(0, 3).map((user) => (
                <div key={user._id} className="admin-list-item">
                  <div>
                    <h4>{user.fullName}</h4>
                    <p>{user.email}</p>
                  </div>
                  <span className="badge badge-info">{getPendingApplications(user).length} pending</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">No provider applications are waiting for approval.</div>
          )}
        </section>

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Role Coverage</h3>
              <p style={{ color: 'var(--text-light)' }}>Assigned, usable, and pending role counts across the platform.</p>
            </div>
            <Link className="btn btn-outline btn-sm" to="/admin/roles">Manage Roles</Link>
          </div>
          <div className="stats-grid admin-summary-grid">
            {roleSummary.map((item) => (
              <div key={item.roleKey} className="card">
                <div className="card-body">
                  <h4>{formatLabel(item.roleKey)}</h4>
                  <p className="admin-summary-line">Assigned: <strong>{item.assignedCount}</strong></p>
                  <p className="admin-summary-line">Usable: <strong>{item.usableCount}</strong></p>
                  <p className="admin-summary-line">Pending: <strong>{item.pendingCount}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="form-card">
        <div className="card-header">
          <div>
            <h3>Admin Workflow</h3>
            <p style={{ color: 'var(--text-light)' }}>Use the admin menu to move between approvals, user records, and role configuration.</p>
          </div>
          <Link className="btn btn-primary btn-sm" to="/admin/users">Open User Management</Link>
        </div>
        <div className="admin-stack">
          <div className="admin-list-item">
            <div>
              <h4>Pending Approvals</h4>
              <p>Review driver and staff applications before those roles become active.</p>
            </div>
          </div>
          <div className="admin-list-item">
            <div>
              <h4>Users</h4>
              <p>Maintain account identity, status, and the current active role for each user.</p>
            </div>
          </div>
          <div className="admin-list-item">
            <div>
              <h4>Role Access</h4>
              <p>Control assigned roles, verification states, and primary-role ownership.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  const renderPendingSection = () => (
    pendingReviewUsers.length > 0 ? (
      pendingReviewUsers.map((user) => (
        <div key={user._id} className="form-card admin-card">
          <div className="card-header">
            <div>
              <h3>{user.fullName}</h3>
              <p style={{ color: 'var(--text-light)' }}>{user.email}</p>
              <div className="pill-row" style={{ marginTop: '0.75rem' }}>
                <span className="badge badge-info">Active role: {user.activeRole}</span>
                <span className="badge badge-success">Primary role: {user.primaryRole}</span>
              </div>
            </div>
            <Link className="btn btn-outline btn-sm" to="/admin/users">Open User Record</Link>
          </div>
          {renderPendingApplications(user, getPendingApplications(user), true)}
        </div>
      ))
    ) : (
      <div className="form-card admin-empty-state">No pending provider approvals right now.</div>
    )
  );

  const renderUsersSection = () => (
    orderedUsers.length > 0 ? orderedUsers.map((user) => renderUserCard(user, 'full')) : (
      <div className="form-card admin-empty-state">No users found.</div>
    )
  );

  const renderRolesSection = () => (
    <>
      <div className="stats-grid">
        {roleSummary.map((item) => (
          <div key={item.roleKey} className="stat-card">
            <div className="stat-info">
              <h3>{item.usableCount}</h3>
              <p>{formatLabel(item.roleKey)} roles usable</p>
            </div>
          </div>
        ))}
      </div>
      {nonAdminUsers.length > 0 ? nonAdminUsers.map((user) => renderUserCard(user, 'roles')) : (
        <div className="form-card admin-empty-state">No non-admin user records are available for role management.</div>
      )}
    </>
  );

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>{currentSection.title}</h2>
          <p style={{ color: 'var(--text-light)' }}>{currentSection.description}</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {isOverviewPath && renderOverview()}
        {isPendingPath && renderPendingSection()}
        {isUsersPath && renderUsersSection()}
        {isRolesPath && renderRolesSection()}
      </main>
    </div>
  );
}
