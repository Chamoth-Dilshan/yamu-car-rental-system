import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    description: 'Browse pending accounts first, then open a dedicated review page for each approval.'
  },
  '/admin/users': {
    title: 'User Management',
    description: 'Browse user cards first, then open a focused view or edit panel only when needed.'
  },
  '/admin/roles': {
    title: 'Role Access',
    description: 'Browse role-access cards first, then open a dedicated page to review or edit access.'
  }
};

const canUseRole = (role) => ['active', 'verified'].includes(role.roleStatus) && role.verificationStatus === 'verified';

const formatLabel = (value) => String(value)
  .replace(/([A-Z])/g, ' $1')
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase())
  .trim();

const getPendingApplications = (user) => (user.providerApplications || []).filter((item) => item.status === 'pending');
const getUserNic = (user) => (
  user.driverProfile?.nicId
  || user.providerApplications?.find((item) => item.applicationData?.nicId)?.applicationData?.nicId
  || 'Not provided'
);
const getStatusBadgeClass = (status) => {
  if (status === 'active') {
    return 'badge-success';
  }

  if (status === 'deactivated') {
    return 'badge-danger';
  }

  return 'badge-warning';
};

const getDocumentDetails = (documents = {}) => (
  Object.entries(documents)
    .map(([key, value]) => ({ key, value }))
    .filter(({ value }) => value && (value.reference || value.fileName || value.note || value.status !== 'not_provided'))
);

export default function AdminUsers() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, refreshNotifications } = useAuth();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const isPendingPath = location.pathname.startsWith('/admin/pending-approvals');
  const isUsersPath = location.pathname.startsWith('/admin/users');
  const isRolesPath = location.pathname.startsWith('/admin/roles');
  const isOverviewPath = !isPendingPath && !isUsersPath && !isRolesPath;
  const pendingDetailMatch = location.pathname.match(/^\/admin\/pending-approvals\/([^/]+)\/?$/);
  const userDetailMatch = location.pathname.match(/^\/admin\/users\/([^/]+?)(?:\/(edit))?\/?$/);
  const rolesDetailMatch = location.pathname.match(/^\/admin\/roles\/([^/]+?)(?:\/(edit))?\/?$/);
  const pendingDetailUserId = pendingDetailMatch?.[1] || '';
  const selectedUserId = userDetailMatch?.[1] || '';
  const roleDetailUserId = rolesDetailMatch?.[1] || '';
  const isPendingDetailPath = Boolean(pendingDetailMatch);
  const isUserDetailPath = Boolean(userDetailMatch);
  const isRolesDetailPath = Boolean(rolesDetailMatch);
  const isEditPath = userDetailMatch?.[2] === 'edit';
  const isRoleEditPath = rolesDetailMatch?.[2] === 'edit';

  const pendingReviewUsers = users.filter((user) => getPendingApplications(user).length > 0);
  const orderedUsers = [...users].sort((left, right) => {
    const pendingDelta = getPendingApplications(right).length - getPendingApplications(left).length;

    if (pendingDelta !== 0) {
      return pendingDelta;
    }

    return left.fullName.localeCompare(right.fullName);
  });
  const nonAdminUsers = orderedUsers.filter((user) => !user.roles.some((role) => role.roleKey === 'admin'));
  const normalizedSearch = userSearch.trim().toLowerCase();
  const filteredUsers = nonAdminUsers.filter((user) => {
    const matchesSearch = !normalizedSearch || [
      user.fullName,
      user.username,
      user.email,
      getUserNic(user)
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    const matchesRole = roleFilter === 'all' || user.roles.some((role) => role.roleKey === roleFilter);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && user.accountStatus === 'active')
      || (statusFilter === 'inactive' && ['suspended', 'deactivated'].includes(user.accountStatus));

    return matchesSearch && matchesRole && matchesStatus;
  });
  const selectedUser = nonAdminUsers.find((user) => user._id === selectedUserId) || null;
  const filteredPendingUsers = pendingReviewUsers.filter((user) => {
    const matchesSearch = !normalizedSearch || [
      user.fullName,
      user.username,
      user.email,
      getUserNic(user)
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    const matchesRole = roleFilter === 'all'
      || getPendingApplications(user).some((application) => application.roleKey === roleFilter);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && user.accountStatus === 'active')
      || (statusFilter === 'inactive' && ['suspended', 'deactivated'].includes(user.accountStatus));

    return matchesSearch && matchesRole && matchesStatus;
  });
  const selectedPendingUser = nonAdminUsers.find((user) => user._id === pendingDetailUserId) || null;
  const selectedRoleUser = nonAdminUsers.find((user) => user._id === roleDetailUserId) || null;
  let currentSection = adminSections['/admin/dashboard'];

  if (isPendingPath && isPendingDetailPath) {
    currentSection = {
      title: selectedPendingUser ? selectedPendingUser.fullName : 'Pending Approval',
      description: 'Review this user\'s pending role applications and approve or reject them.'
    };
  } else if (isUsersPath && isUserDetailPath) {
    currentSection = {
      title: selectedUser ? selectedUser.fullName : 'User Details',
      description: isEditPath
        ? 'Review and update this user record from one page.'
        : 'Review this user record and switch to edit when changes are needed.'
    };
  } else if (isRolesPath && isRolesDetailPath) {
    currentSection = {
      title: selectedRoleUser ? selectedRoleUser.fullName : 'Role Access',
      description: isRoleEditPath
        ? 'Update assigned roles, verification states, and primary-role ownership.'
        : 'Review this user\'s assigned roles and current access state.'
    };
  } else if (isPendingPath) {
    currentSection = adminSections['/admin/pending-approvals'];
  } else if (isUsersPath) {
    currentSection = adminSections['/admin/users'];
  } else if (isRolesPath) {
    currentSection = adminSections['/admin/roles'];
  }
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

  const updateDriverProfileField = (userId, field, value) => {
    setUsers((prev) => prev.map((user) => {
      if (user._id !== userId) {
        return user;
      }

      return {
        ...user,
        driverProfile: {
          ...(user.driverProfile || {}),
          [field]: value
        }
      };
    }));
  };

  const openUserPanel = (userId, mode) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(mode === 'edit' ? `/admin/users/${userId}/edit` : `/admin/users/${userId}`);
  };

  const openPendingPanel = (userId) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/admin/pending-approvals/${userId}`);
  };

  const openRolePanel = (userId, mode) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(mode === 'edit' ? `/admin/roles/${userId}/edit` : `/admin/roles/${userId}`);
  };

  const closeUserPanel = () => {
    navigate('/admin/users');
  };

  const closePendingPanel = () => {
    navigate('/admin/pending-approvals');
  };

  const closeRolePanel = () => {
    navigate('/admin/roles');
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

  const saveUser = async (user, destination = `/admin/users/${user._id}`) => {
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
        roles: user.roles,
        driverProfile: {
          nicId: user.driverProfile?.nicId || ''
        }
      };

      const res = await API.put(`/admin/users/${user._id}`, payload);
      setUsers((prev) => prev.map((item) => item._id === user._id ? res.data : item));
      await refreshNotifications().catch(() => {});
      setMessage(`Updated ${res.data.fullName}`);
      navigate(destination.replace(user._id, res.data._id));
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
      return null;
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
      await refreshNotifications().catch(() => {});
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review application');
    } finally {
      setBusyAction('');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Deactivate this user account?')) {
      return;
    }

    setBusyAction(`delete-${userId}`);
    setMessage('');
    setError('');

    try {
      const res = await API.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.map((user) => user._id === userId ? res.data.user : user));
      setMessage(res.data.message || 'Account deactivated');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setBusyAction('');
    }
  };

  const renderPendingApplications = (user, pendingApplications, compact = false) => (
    <div className="alert alert-info">
      {pendingApplications.map((application) => {
        const applicationData = Object.entries(application.applicationData || {})
          .filter(([field, value]) => field !== 'documents' && value);
        const documentDetails = getDocumentDetails(application.applicationData?.documents || {});

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
              {documentDetails.length > 0 && (
                <div className="admin-data-grid" style={{ marginTop: '0.75rem' }}>
                  {documentDetails.map(({ key, value }) => (
                    <div key={key} className="admin-data-item">
                      <span>{formatLabel(key)}</span>
                      <strong>{value.reference || value.fileName || 'Metadata added'}</strong>
                      <small style={{ color: 'var(--text-light)' }}>Status: {formatLabel(value.status)}</small>
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

  const renderPendingSummaryCard = (user) => {
    const pendingApplications = getPendingApplications(user);
    const isSelected = pendingDetailUserId === user._id;

    return (
      <article
        key={user._id}
        className={`form-card admin-user-summary-card${isSelected ? ' active' : ''}`}
      >
        <div className="admin-user-summary-main">
          <div>
            <h3>{user.fullName}</h3>
            <p>{user.email}</p>
            <div className="admin-user-summary-tags">
              <span className="badge badge-warning">{pendingApplications.length} pending</span>
              <span className={`badge ${getStatusBadgeClass(user.accountStatus)}`}>{formatLabel(user.accountStatus)}</span>
              {pendingApplications.map((application) => (
                <span key={application.roleKey} className="badge badge-info">{formatLabel(application.roleKey)}</span>
              ))}
            </div>
          </div>
          <span className="badge badge-info">{formatLabel(user.activeRole)}</span>
        </div>

        <div className="admin-user-card-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openPendingPanel(user._id)}>
            Review
          </button>
        </div>
      </article>
    );
  };

  const renderPendingDetailsPanel = () => {
    if (!selectedPendingUser) {
      return (
        <section className="form-card admin-user-detail-panel admin-empty-state">
          <p>Pending record not found.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={closePendingPanel}>
            Back to Queue
          </button>
        </section>
      );
    }

    const pendingApplications = getPendingApplications(selectedPendingUser);

    return (
      <section className="form-card admin-user-detail-panel">
        <div className="card-header">
          <div>
            <h3>Pending Approval Review</h3>
            <p style={{ color: 'var(--text-light)' }}>
              Review submitted applications and decide whether each requested role should be approved or rejected.
            </p>
          </div>
          <div className="pill-row">
            <Link className="btn btn-outline btn-sm" to={`/admin/users/${selectedPendingUser._id}`}>Open User</Link>
            <button type="button" className="btn btn-outline btn-sm" onClick={closePendingPanel}>
              Back to Queue
            </button>
          </div>
        </div>

        <div className="pill-row" style={{ marginBottom: '1rem' }}>
          <span className="badge badge-info">Active role: {selectedPendingUser.activeRole}</span>
          <span className={`badge ${getStatusBadgeClass(selectedPendingUser.accountStatus)}`}>Account: {formatLabel(selectedPendingUser.accountStatus)}</span>
          <span className="badge badge-warning">{pendingApplications.length} pending</span>
        </div>

        <div className="admin-user-detail-grid" style={{ marginBottom: '1rem' }}>
          <div className="admin-data-item">
            <span>Full Name</span>
            <strong>{selectedPendingUser.fullName}</strong>
          </div>
          <div className="admin-data-item">
            <span>Username</span>
            <strong>{selectedPendingUser.username || '-'}</strong>
          </div>
          <div className="admin-data-item">
            <span>Email</span>
            <strong>{selectedPendingUser.email}</strong>
          </div>
          <div className="admin-data-item">
            <span>NIC</span>
            <strong>{getUserNic(selectedPendingUser)}</strong>
          </div>
          <div className="admin-data-item">
            <span>Phone</span>
            <strong>{selectedPendingUser.phone || 'Not provided'}</strong>
          </div>
          <div className="admin-data-item">
            <span>City</span>
            <strong>{selectedPendingUser.city || 'Not provided'}</strong>
          </div>
        </div>

        {pendingApplications.length > 0
          ? renderPendingApplications(selectedPendingUser, pendingApplications)
          : <div className="admin-empty-state">This user has no pending applications right now.</div>}
      </section>
    );
  };

  const renderRoleSummaryCard = (user) => {
    const hasAdminRole = user.roles.some((role) => role.roleKey === 'admin');
    const pendingApplications = getPendingApplications(user);
    const isSelected = roleDetailUserId === user._id;

    return (
      <article
        key={user._id}
        className={`form-card admin-user-summary-card${isSelected ? ' active' : ''}`}
      >
        <div className="admin-user-summary-main">
          <div>
            <h3>{user.fullName}</h3>
            <p>{user.email}</p>
            <div className="admin-user-summary-tags">
              <span className={`badge ${getStatusBadgeClass(user.accountStatus)}`}>{formatLabel(user.accountStatus)}</span>
              <span className="badge badge-info">{user.roles.length} assigned roles</span>
              {pendingApplications.length > 0 && (
                <span className="badge badge-warning">{pendingApplications.length} pending</span>
              )}
              {hasAdminRole && <span className="badge badge-info">Read only</span>}
            </div>
          </div>
          <span className="badge badge-info">{formatLabel(user.primaryRole || user.activeRole)}</span>
        </div>

        <div className="admin-user-card-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openRolePanel(user._id, 'view')}>
            View
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={hasAdminRole}
            onClick={() => openRolePanel(user._id, 'edit')}
          >
            Edit
          </button>
        </div>
      </article>
    );
  };

  const renderRoleDetailsPanel = () => {
    if (!selectedRoleUser) {
      return (
        <section className="form-card admin-user-detail-panel admin-empty-state">
          <p>Role access record not found.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={closeRolePanel}>
            Back to Role Access
          </button>
        </section>
      );
    }

    const hasAdminRole = selectedRoleUser.roles.some((role) => role.roleKey === 'admin');
    const pendingApplications = getPendingApplications(selectedRoleUser);
    const switchableRoles = selectedRoleUser.roles.filter(canUseRole);
    const readOnlyMode = !isRoleEditPath || hasAdminRole;

    return (
      <section className="form-card admin-user-detail-panel">
        <div className="card-header">
          <div>
            <h3>{readOnlyMode ? 'Role Access Details' : 'Edit Role Access'}</h3>
            <p style={{ color: 'var(--text-light)' }}>
              {readOnlyMode
                ? 'Review assigned roles, verification states, and primary-role ownership.'
                : 'Update role assignments and verification settings from one page.'}
            </p>
          </div>
          <div className="pill-row">
            {!readOnlyMode && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/roles/${selectedRoleUser._id}`)}>
                View
              </button>
            )}
            {readOnlyMode && !hasAdminRole && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/roles/${selectedRoleUser._id}/edit`)}>
                Edit
              </button>
            )}
            <Link className="btn btn-outline btn-sm" to={`/admin/users/${selectedRoleUser._id}`}>Open User</Link>
            <button type="button" className="btn btn-outline btn-sm" onClick={closeRolePanel}>
              Close
            </button>
          </div>
        </div>

        <div className="pill-row" style={{ marginBottom: '1rem' }}>
          <span className="badge badge-info">Active role: {selectedRoleUser.activeRole}</span>
          <span className="badge badge-success">Primary role: {selectedRoleUser.primaryRole}</span>
          <span className={`badge ${getStatusBadgeClass(selectedRoleUser.accountStatus)}`}>Account: {formatLabel(selectedRoleUser.accountStatus)}</span>
        </div>

        {readOnlyMode ? (
          <>
            <div className="admin-user-detail-grid" style={{ marginBottom: '1rem' }}>
              <div className="admin-data-item">
                <span>Full Name</span>
                <strong>{selectedRoleUser.fullName}</strong>
              </div>
              <div className="admin-data-item">
                <span>Username</span>
                <strong>{selectedRoleUser.username || '-'}</strong>
              </div>
              <div className="admin-data-item">
                <span>Email</span>
                <strong>{selectedRoleUser.email}</strong>
              </div>
              <div className="admin-data-item">
                <span>Pending Applications</span>
                <strong>{pendingApplications.length}</strong>
              </div>
            </div>
            <div className="stats-grid admin-role-grid">
              {selectedRoleUser.roles.map((role) => (
                <div key={role.roleKey} className="card">
                  <div className="card-body">
                    <h4>{formatLabel(role.roleKey)}</h4>
                    <p className="admin-summary-line">Role status: <strong>{formatLabel(role.roleStatus)}</strong></p>
                    <p className="admin-summary-line">Verification: <strong>{formatLabel(role.verificationStatus)}</strong></p>
                    <p className="admin-summary-line">Primary: <strong>{role.isPrimary ? 'Yes' : 'No'}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input value={selectedRoleUser.username || ''} onChange={(e) => updateField(selectedRoleUser._id, 'username', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Account Status</label>
                <select value={selectedRoleUser.accountStatus} onChange={(e) => updateField(selectedRoleUser._id, 'accountStatus', e.target.value)}>
                  {accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Active Role</label>
                <select value={selectedRoleUser.activeRole || ''} onChange={(e) => updateField(selectedRoleUser._id, 'activeRole', e.target.value)}>
                  {(switchableRoles.length > 0 ? switchableRoles : selectedRoleUser.roles).map((role) => (
                    <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Primary Role</label>
                <select value={selectedRoleUser.primaryRole || ''} onChange={(e) => setPrimaryRole(selectedRoleUser._id, e.target.value)}>
                  {selectedRoleUser.roles.map((role) => (
                    <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Assigned Roles</label>
              <div className="checkbox-row">
                {manageableRoles.map((roleKey) => {
                  const checked = selectedRoleUser.roles.some((role) => role.roleKey === roleKey);
                  const disabled = roleKey === 'customer';

                  return (
                    <label key={roleKey} className="checkbox-chip">
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleAssignedRole(selectedRoleUser._id, roleKey)} />
                      {roleKey}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="stats-grid admin-role-grid">
              {selectedRoleUser.roles.map((role) => (
                <div key={role.roleKey} className="card">
                  <div className="card-body">
                    <h4>{formatLabel(role.roleKey)}</h4>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>Role Status</label>
                      <select value={role.roleStatus} onChange={(e) => updateRoleField(selectedRoleUser._id, role.roleKey, 'roleStatus', e.target.value)}>
                        {roleStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Verification</label>
                      <select value={role.verificationStatus} onChange={(e) => updateRoleField(selectedRoleUser._id, role.roleKey, 'verificationStatus', e.target.value)}>
                        {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <label className="checkbox-chip">
                      <input type="checkbox" checked={role.isPrimary} onChange={() => setPrimaryRole(selectedRoleUser._id, role.roleKey)} />
                      Primary role
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="pill-row">
              <button
                className="btn btn-primary"
                type="button"
                disabled={busyAction === `save-${selectedRoleUser._id}`}
                onClick={() => saveUser(selectedRoleUser, `/admin/roles/${selectedRoleUser._id}`)}
              >
                {busyAction === `save-${selectedRoleUser._id}` ? 'Saving...' : 'Save Role Access'}
              </button>
              <button className="btn btn-outline" type="button" onClick={closeRolePanel}>
                Close
              </button>
            </div>
          </>
        )}

        {hasAdminRole && (
          <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
            Seeded admin accounts are read only in this workflow.
          </div>
        )}

        {pendingApplications.length > 0 && (
          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            This user has {pendingApplications.length} pending application(s). Use the Pending Approvals page for approve/reject actions.
          </div>
        )}
      </section>
    );
  };

  const renderUserSummaryCard = (user) => {
    const hasAdminRole = user.roles.some((role) => role.roleKey === 'admin');
    const pendingApplications = getPendingApplications(user);
    const canDeleteUser = !hasAdminRole && currentUser?._id !== user._id && user.accountStatus !== 'deactivated';
    const isSelected = selectedUserId === user._id;

    return (
      <article
        key={user._id}
        className={`form-card admin-user-summary-card${isSelected ? ' active' : ''}`}
      >
        <div className="admin-user-summary-main">
          <div>
            <h3>{user.fullName}</h3>
            <p>{user.email}</p>
            <div className="admin-user-summary-tags">
              <span className={`badge ${getStatusBadgeClass(user.accountStatus)}`}>
                {formatLabel(user.accountStatus)}
              </span>
              {pendingApplications.length > 0 && (
                <span className="badge badge-warning">{pendingApplications.length} pending</span>
              )}
              {hasAdminRole && <span className="badge badge-info">Read only</span>}
            </div>
          </div>
          <span className={`badge ${hasAdminRole ? 'badge-warning' : 'badge-info'}`}>
            {formatLabel(user.activeRole)}
          </span>
        </div>

        <div className="admin-user-card-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => openUserPanel(user._id, 'view')}>
            View
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={hasAdminRole}
            onClick={() => openUserPanel(user._id, 'edit')}
          >
            Edit
          </button>
          {canDeleteUser && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busyAction === `delete-${user._id}`}
              onClick={() => deleteUser(user._id)}
            >
              {busyAction === `delete-${user._id}` ? 'Deactivating...' : 'Deactivate'}
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderUserDetailsPanel = () => {
    if (!selectedUser) {
      return (
        <section className="form-card admin-user-detail-panel admin-empty-state">
          <p>User record not found.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/admin/users')}>
            Back to Users
          </button>
        </section>
      );
    }

    const hasAdminRole = selectedUser.roles.some((role) => role.roleKey === 'admin');
    const pendingApplications = getPendingApplications(selectedUser);
    const switchableRoles = selectedUser.roles.filter(canUseRole);
    const readOnlyMode = !isEditPath || hasAdminRole;

    return (
      <section className="form-card admin-user-detail-panel">
        <div className="card-header">
          <div>
            <h3>{readOnlyMode ? 'User Details' : 'Edit User'}</h3>
            <p style={{ color: 'var(--text-light)' }}>
              {readOnlyMode
                ? 'Review user identity, account status, NIC, and current access.'
                : 'Update identity details and account settings from one focused panel.'}
            </p>
          </div>
          <div className="pill-row">
            {!readOnlyMode && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/users/${selectedUser._id}`)}>
                View
              </button>
            )}
            {readOnlyMode && !hasAdminRole && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/users/${selectedUser._id}/edit`)}>
                Edit
              </button>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={closeUserPanel}>
              Close
            </button>
          </div>
        </div>

        <div className="pill-row" style={{ marginBottom: '1rem' }}>
          <span className="badge badge-info">Active role: {selectedUser.activeRole}</span>
          <span className="badge badge-success">Primary role: {selectedUser.primaryRole}</span>
          <span className="badge badge-warning">Account: {selectedUser.accountStatus}</span>
        </div>

        {readOnlyMode ? (
          <div className="admin-user-detail-grid">
            <div className="admin-data-item">
              <span>Full Name</span>
              <strong>{selectedUser.fullName}</strong>
            </div>
            <div className="admin-data-item">
              <span>Username</span>
              <strong>{selectedUser.username || '-'}</strong>
            </div>
            <div className="admin-data-item">
              <span>Email</span>
              <strong>{selectedUser.email}</strong>
            </div>
            <div className="admin-data-item">
              <span>NIC</span>
              <strong>{getUserNic(selectedUser)}</strong>
            </div>
            <div className="admin-data-item">
              <span>Phone</span>
              <strong>{selectedUser.phone || 'Not provided'}</strong>
            </div>
            <div className="admin-data-item">
              <span>City</span>
              <strong>{selectedUser.city || 'Not provided'}</strong>
            </div>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value={selectedUser.fullName} onChange={(e) => updateField(selectedUser._id, 'fullName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input value={selectedUser.username || ''} onChange={(e) => updateField(selectedUser._id, 'username', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input value={selectedUser.email} onChange={(e) => updateField(selectedUser._id, 'email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>NIC</label>
                <input
                  value={selectedUser.driverProfile?.nicId || ''}
                  onChange={(e) => updateDriverProfileField(selectedUser._id, 'nicId', e.target.value)}
                  placeholder="Enter NIC / ID"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Account Status</label>
                <select value={selectedUser.accountStatus} onChange={(e) => updateField(selectedUser._id, 'accountStatus', e.target.value)}>
                  {accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Active Role</label>
                <select value={selectedUser.activeRole || ''} onChange={(e) => updateField(selectedUser._id, 'activeRole', e.target.value)}>
                  {(switchableRoles.length > 0 ? switchableRoles : selectedUser.roles).map((role) => (
                    <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Primary Role</label>
                <select value={selectedUser.primaryRole || ''} onChange={(e) => setPrimaryRole(selectedUser._id, e.target.value)}>
                  {selectedUser.roles.map((role) => (
                    <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Pending Applications</label>
                <input value={String(pendingApplications.length)} disabled />
              </div>
            </div>

            <div className="pill-row">
              <button
                className="btn btn-primary"
                type="button"
                disabled={busyAction === `save-${selectedUser._id}`}
                onClick={() => saveUser(selectedUser)}
              >
                {busyAction === `save-${selectedUser._id}` ? 'Saving...' : 'Save User'}
              </button>
              <button className="btn btn-outline" type="button" onClick={closeUserPanel}>
                Close
              </button>
            </div>
          </>
        )}

        {hasAdminRole && (
          <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
            Seeded admin accounts are read only in this workflow.
          </div>
        )}

        {readOnlyMode && pendingApplications.length > 0 && (
          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            This user has {pendingApplications.length} pending application(s). Use the Pending Approvals page for approve/reject actions.
          </div>
        )}
      </section>
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

    </>
  );

  const renderPendingSection = () => (
    pendingReviewUsers.length > 0 ? (
      <section className="form-card">
        <div className="card-header">
          <div>
            <h3>Pending Approval Cards</h3>
            <p style={{ color: 'var(--text-light)' }}>
              Browse pending accounts first, then open a dedicated review page for approve or reject actions.
            </p>
          </div>
          <span className="badge badge-info">{filteredPendingUsers.length} users</span>
        </div>
        <div className="admin-user-filters">
          <div className="form-group">
            <label htmlFor="pending-search">Search</label>
            <input
              id="pending-search"
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, email, username, or NIC"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pending-role-filter">Requested Role</label>
            <select id="pending-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {manageableRoles.map((role) => (
                <option key={role} value={role}>{formatLabel(role)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pending-status-filter">Status</label>
            <select id="pending-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="admin-user-grid">
          {filteredPendingUsers.length > 0
            ? filteredPendingUsers.map((user) => renderPendingSummaryCard(user))
            : <div className="admin-empty-state">No pending approvals match the current search and filters.</div>}
        </div>
      </section>
    ) : (
      <div className="form-card admin-empty-state">No pending provider approvals right now.</div>
    )
  );

  const renderUsersSection = () => (
    nonAdminUsers.length > 0 ? (
      <section className="form-card">
        <div className="admin-user-filters">
          <div className="form-group">
            <label htmlFor="user-search">Search</label>
            <input
              id="user-search"
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, email, username, or NIC"
            />
          </div>
          <div className="form-group">
            <label htmlFor="user-role-filter">Role</label>
            <select id="user-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              {manageableRoles.map((role) => (
                <option key={role} value={role}>{formatLabel(role)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="user-status-filter">Status</label>
            <select id="user-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="admin-user-grid">
          {filteredUsers.length > 0
            ? filteredUsers.map((user) => renderUserSummaryCard(user))
            : <div className="admin-empty-state">No users match the current search and filters.</div>}
        </div>
      </section>
    ) : (
      <div className="form-card admin-empty-state">No users found.</div>
    )
  );

  const renderRolesSection = () => (
    nonAdminUsers.length > 0 ? (
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
        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Role Access Cards</h3>
              <p style={{ color: 'var(--text-light)' }}>
                Browse compact role-access cards, then open a dedicated page to review or edit each record.
              </p>
            </div>
            <span className="badge badge-info">{filteredUsers.length} users</span>
          </div>
          <div className="admin-user-filters">
            <div className="form-group">
              <label htmlFor="role-search">Search</label>
              <input
                id="role-search"
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, username, or NIC"
              />
            </div>
            <div className="form-group">
              <label htmlFor="role-role-filter">Role</label>
              <select id="role-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                {manageableRoles.map((role) => (
                  <option key={role} value={role}>{formatLabel(role)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="role-status-filter">Status</label>
              <select id="role-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="admin-user-grid">
            {filteredUsers.length > 0
              ? filteredUsers.map((user) => renderRoleSummaryCard(user))
              : <div className="admin-empty-state">No role-access records match the current search and filters.</div>}
          </div>
        </section>
      </>
    ) : (
      <div className="form-card admin-empty-state">No non-admin user records are available for role management.</div>
    )
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
        {isPendingPath && (isPendingDetailPath ? renderPendingDetailsPanel() : renderPendingSection())}
        {isUsersPath && (isUserDetailPath ? renderUserDetailsPanel() : renderUsersSection())}
        {isRolesPath && (isRolesDetailPath ? renderRoleDetailsPanel() : renderRolesSection())}
      </main>
    </div>
  );
}
