import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel, getProfilePathForRole } from '../utils/roles';

const providerRoles = ['driver', 'staff'];

const formatLabel = (value) => String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);

export default function AccountOverview() {
  const { user } = useAuth();
  const accountHealth = user?.accountHealth;
  const providerApplications = (user?.providerApplications || []).filter((item) => providerRoles.includes(item.roleKey));
  const pendingCount = providerApplications.filter((item) => item.status === 'pending').length;
  const usableRoleCount = (user?.roles || []).filter((role) => role.roleStatus === 'active' && role.verificationStatus === 'verified').length;
  const stats = [
    { label: 'Active Role', value: formatRoleLabel(user?.activeRole || 'customer') },
    { label: 'Primary Role', value: formatRoleLabel(user?.primaryRole || user?.activeRole || 'customer') },
    { label: 'Approved Roles', value: String(usableRoleCount) },
    { label: 'Pending Applications', value: String(pendingCount) }
  ];
  const profileCompletion = user?.profileCompletion?.percent || 0;
  const profilePath = getProfilePathForRole(user?.activeRole || user?.role);
  const nextAction = accountHealth?.nextRoleAction?.guidance || (
    pendingCount > 0
      ? 'Track admin review for your pending provider request.'
      : providerApplications.some((item) => item.status === 'rejected')
        ? 'Update the rejected role profile and reapply.'
        : 'Complete role-specific details before requesting additional access.'
  );

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Account Overview</h2>
          <p style={{ color: 'var(--text-light)' }}>Manage your account profile, role applications, and active role from one workspace.</p>
        </div>

        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="stat-card">
              <div className="stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <h3>Account Health</h3>
              <p style={{ color: 'var(--text-light)' }}>Quick status for profile readiness, role verification, and the next step that matters.</p>
            </div>
            <span className={`badge ${accountHealth?.accountStatus === 'active' ? 'badge-success' : 'badge-danger'}`}>
              {accountHealth?.accountStatusLabel || 'Active'}
            </span>
          </div>
          <div className="pill-row" style={{ marginBottom: '1rem' }}>
            <span className="badge badge-info">Active role: {accountHealth?.activeRoleLabel || formatRoleLabel(user?.activeRole || 'customer')}</span>
            <span className="badge badge-success">Primary role: {accountHealth?.primaryRoleLabel || formatRoleLabel(user?.primaryRole || user?.activeRole || 'customer')}</span>
            <span className="badge badge-warning">Profile: {accountHealth?.profileCompletionPercent ?? profileCompletion}%</span>
            <span className="badge badge-info">Pending: {accountHealth?.pendingApplicationsCount ?? pendingCount}</span>
            <span className="badge badge-info">Unread: {accountHealth?.unreadNotificationsCount ?? user?.unreadNotificationCount ?? 0}</span>
            <span className={`badge ${accountHealth?.verificationTone === 'success' ? 'badge-success' : accountHealth?.verificationTone === 'danger' ? 'badge-danger' : accountHealth?.verificationTone === 'warning' ? 'badge-warning' : 'badge-info'}`}>
              Verification: {accountHealth?.verificationStateLabel || 'Not Started'}
            </span>
          </div>
          <div className="admin-list-item">
            <div>
              <h4>
                Next role action
                {accountHealth?.nextRoleAction?.roleLabel ? `: ${accountHealth.nextRoleAction.roleLabel}` : ''}
              </h4>
              <p>{nextAction}</p>
              {accountHealth?.nextRoleAction?.missingRequirements?.length > 0 && (
                <div className="pill-row" style={{ marginTop: '0.75rem' }}>
                  {accountHealth.nextRoleAction.missingRequirements.map((item) => (
                    <span key={item} className="badge badge-warning">{item}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="pill-row">
              <Link to={profilePath} className="btn btn-outline btn-sm">Profile</Link>
              <Link to="/apply-roles" className="btn btn-primary btn-sm">Role Applications</Link>
            </div>
          </div>
        </section>

        <div className="account-grid">
          <section className="form-card">
            <div className="card-header">
              <div>
                <h3>Profile Readiness</h3>
                <p style={{ color: 'var(--text-light)' }}>Keep your identity and contact information complete for rental and admin workflows.</p>
              </div>
              <Link to={profilePath} className="btn btn-primary btn-sm">Edit Profile</Link>
            </div>
            <div className="account-progress">
              <div className="account-progress-track">
                <div className="account-progress-fill" style={{ width: `${profileCompletion}%` }} />
              </div>
              <strong>{profileCompletion}% complete</strong>
            </div>
            <div className="admin-stack">
              <div className="admin-list-item">
                <div>
                  <h4>Identity</h4>
                  <p>{user?.fullName} ({user?.username})</p>
                </div>
              </div>
              <div className="admin-list-item">
                <div>
                  <h4>Contact</h4>
                  <p>{user?.email} {user?.phone ? `| ${user.phone}` : ''}</p>
                </div>
              </div>
              <div className="admin-list-item">
                <div>
                  <h4>Language & Emergency Contact</h4>
                  <p>
                    {user?.preferredLanguage || 'English'}
                    {user?.emergencyContact?.name
                      ? ` | ${user.emergencyContact.name}${user.emergencyContact.phone ? ` (${user.emergencyContact.phone})` : ''}`
                      : ' | Emergency contact not set'}
                  </p>
                </div>
              </div>
              <div className="admin-list-item">
                <div>
                  <h4>Location</h4>
                  <p>{user?.city || 'City not set'} {user?.address ? `| ${user.address}` : ''}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="form-card">
            <div className="card-header">
              <div>
                <h3>Role Access</h3>
                <p style={{ color: 'var(--text-light)' }}>Only admin-approved roles can be used as active roles.</p>
              </div>
              <Link to="/switch-roles" className="btn btn-outline btn-sm">Switch Role</Link>
            </div>
            <div className="admin-stack">
              {(user?.roles || []).map((role) => (
                <div key={role.roleKey} className="admin-list-item">
                  <div>
                    <h4>{formatRoleLabel(role.roleKey)}</h4>
                    <p>Status: {role.roleStatus} | Verification: {role.verificationStatus}</p>
                  </div>
                  <span className={`badge ${role.isPrimary ? 'badge-success' : 'badge-info'}`}>
                    {role.isPrimary ? 'Primary' : 'Assigned'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <h3>Role Applications</h3>
              <p style={{ color: 'var(--text-light)' }}>Track driver and store onboarding applications and any admin feedback.</p>
            </div>
            <Link to="/apply-roles" className="btn btn-primary btn-sm">Manage Applications</Link>
          </div>
          {providerApplications.length > 0 ? (
            <div className="admin-stack">
              {providerApplications.map((application) => (
                <div key={application.roleKey} className="admin-list-item account-request-item">
                  <div>
                    <h4>{formatRoleLabel(application.roleKey)} Application</h4>
                    <p>Status: {application.status}</p>
                    {application.submittedAt && <p>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</p>}
                    {application.reviewedAt && <p>Reviewed: {new Date(application.reviewedAt).toLocaleDateString()}</p>}
                    {application.rejectionReason && <p>Admin note: {application.rejectionReason}</p>}
                  </div>
                  <Link to={`/apply-roles#${application.roleKey}-role`} className="btn btn-outline btn-sm">Open Role Form</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">No provider role applications have been submitted yet.</div>
          )}
        </section>

        <section className="form-card">
          <div className="card-header">
            <div>
              <h3>Next Recommended Action</h3>
              <p style={{ color: 'var(--text-light)' }}>Standard user and role-management systems guide the user to the next unblocker.</p>
            </div>
          </div>
          <div className="admin-list-item">
            <div>
              <h4>What to do next</h4>
              <p>{nextAction}</p>
            </div>
            <div className="pill-row">
              <Link to={profilePath} className="btn btn-outline btn-sm">Profile</Link>
              <Link to="/apply-roles" className="btn btn-primary btn-sm">Role Applications</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
