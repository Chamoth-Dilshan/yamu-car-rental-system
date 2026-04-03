import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const providerRoles = ['driver', 'staff'];

const formatLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export default function AccountOverview() {
  const { user } = useAuth();
  const providerApplications = (user?.providerApplications || []).filter((item) => providerRoles.includes(item.roleKey));
  const pendingCount = providerApplications.filter((item) => item.status === 'pending').length;
  const usableRoleCount = (user?.roles || []).filter((role) => role.roleStatus === 'active' && role.verificationStatus === 'verified').length;
  const stats = [
    { label: 'Active Role', value: formatLabel(user?.activeRole || 'customer') },
    { label: 'Primary Role', value: formatLabel(user?.primaryRole || user?.activeRole || 'customer') },
    { label: 'Approved Roles', value: String(usableRoleCount) },
    { label: 'Pending Requests', value: String(pendingCount) }
  ];
  const profileCompletion = user?.profileCompletion?.percent || 0;
  const nextAction = pendingCount > 0
    ? 'Track admin review for your pending provider request.'
    : providerApplications.some((item) => item.status === 'rejected')
      ? 'Update the rejected role profile and reapply.'
      : 'Complete role-specific details before requesting additional access.';

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Account Overview</h2>
          <p style={{ color: 'var(--text-light)' }}>Manage your account profile, role requests, and active role from one workspace.</p>
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

        <div className="account-grid">
          <section className="form-card">
            <div className="card-header">
              <div>
                <h3>Profile Readiness</h3>
                <p style={{ color: 'var(--text-light)' }}>Keep your identity and contact information complete for rental and admin workflows.</p>
              </div>
              <Link to="/profile" className="btn btn-primary btn-sm">Edit Profile</Link>
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
                    <h4>{formatLabel(role.roleKey)}</h4>
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
              <h3>Role Requests</h3>
              <p style={{ color: 'var(--text-light)' }}>Track driver and staff onboarding requests and any admin feedback.</p>
            </div>
            <Link to="/apply-roles" className="btn btn-primary btn-sm">Manage Requests</Link>
          </div>
          {providerApplications.length > 0 ? (
            <div className="admin-stack">
              {providerApplications.map((application) => (
                <div key={application.roleKey} className="admin-list-item account-request-item">
                  <div>
                    <h4>{formatLabel(application.roleKey)} Request</h4>
                    <p>Status: {application.status}</p>
                    {application.submittedAt && <p>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</p>}
                    {application.reviewedAt && <p>Reviewed: {new Date(application.reviewedAt).toLocaleDateString()}</p>}
                    {application.rejectionReason && <p>Admin note: {application.rejectionReason}</p>}
                  </div>
                  <Link to={`/profile#${application.roleKey}-role`} className="btn btn-outline btn-sm">Open Role Form</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">No provider role requests have been submitted yet.</div>
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
              <Link to="/profile" className="btn btn-outline btn-sm">Profile</Link>
              <Link to="/apply-roles" className="btn btn-primary btn-sm">Role Requests</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
