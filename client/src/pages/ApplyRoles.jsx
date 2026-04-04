import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel } from '../utils/roles';

const roleCards = [
  {
    key: 'driver',
    title: 'Driver Role',
    description: 'Maintain license details, define service coverage, and request driver access for provider workflows.'
  },
  {
    key: 'staff',
    title: 'Store Role',
    description: 'Maintain store identity, contact details, and request store access for vehicle operations.'
  }
];

export default function ApplyRoles() {
  const { user, refreshMe, refreshNotifications } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const roleMap = Object.fromEntries((user?.roles || []).map((item) => [item.roleKey, item]));
  const applicationMap = Object.fromEntries((user?.providerApplications || []).map((item) => [item.roleKey, item]));

  const withdrawApplication = async (roleKey) => {
    setBusyAction(`withdraw-${roleKey}`);
    setMessage('');
    setError('');

    try {
      const res = await API.put(`/users/applications/${roleKey}/withdraw`);
      await refreshMe();
      await refreshNotifications().catch(() => {});
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to withdraw application');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Role Applications</h2>
          <p style={{ color: 'var(--text-light)' }}>Apply for driver or store access, track review status, and update role onboarding details.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="account-grid">
          {roleCards.map((item) => {
            const role = roleMap[item.key];
            const application = applicationMap[item.key];
            const isApproved = role?.roleStatus === 'active' && role?.verificationStatus === 'verified';
            const isPending = application?.status === 'pending';
            const isRejected = application?.status === 'rejected';
            const isWithdrawn = application?.status === 'withdrawn';
            const isCurrentRole = user?.activeRole === item.key;
            const target = isCurrentRole
              ? '/profile'
              : isApproved
                ? '/switch-roles'
                : `/profile#${item.key}-role`;
            const actionLabel = isCurrentRole
              ? 'Manage Profile'
              : isApproved
                ? 'Switch to Role'
                : 'Open Role Form';

            return (
              <div key={item.key} className="form-card">
                <div className="card-header">
                  <div>
                    <h3>{item.title}</h3>
                    <p style={{ color: 'var(--text-light)' }}>{item.description}</p>
                  </div>
                  {actionLabel && (
                    <Link to={target} className="btn btn-outline btn-sm">
                      {actionLabel}
                    </Link>
                  )}
                </div>

                <div className="pill-row" style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-info">Role: {role?.roleStatus || 'not assigned'}</span>
                  <span className="badge badge-warning">Verification: {role?.verificationStatus || 'unverified'}</span>
                  <span className="badge badge-success">Application: {application?.status || 'not submitted'}</span>
                </div>

                <div className="admin-stack">
                  <div className="admin-list-item">
                    <div>
                      <h4>Current State</h4>
                      <p>
                        {isApproved
                          ? `${formatRoleLabel(item.key)} access is approved and available for role switching.`
                          : isPending
                            ? `${formatRoleLabel(item.key)} application is waiting for admin review.`
                            : isRejected
                              ? `${formatRoleLabel(item.key)} application was rejected. Review the admin note and update the form before reapplying.`
                              : isWithdrawn
                                ? `${formatRoleLabel(item.key)} application was withdrawn.`
                                : `No ${formatRoleLabel(item.key).toLowerCase()} application has been submitted yet.`}
                      </p>
                    </div>
                  </div>

                  {application?.submittedAt && (
                    <div className="admin-list-item">
                      <div>
                        <h4>Submission Timeline</h4>
                        <p>Submitted: {new Date(application.submittedAt).toLocaleDateString()}</p>
                        {application.reviewedAt && <p>Reviewed: {new Date(application.reviewedAt).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  )}

                  {application?.rejectionReason && (
                    <div className="alert alert-warning">Admin note: {application.rejectionReason}</div>
                  )}
                </div>

                <div className="pill-row" style={{ marginTop: '1.25rem' }}>
                  {actionLabel && (
                    <Link to={target} className="btn btn-primary btn-sm">
                      {isCurrentRole ? 'Edit Role Profile' : isApproved ? 'Switch to This Role' : 'Open Role Form'}
                    </Link>
                  )}
                  {isPending && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyAction === `withdraw-${item.key}`}
                      onClick={() => withdrawApplication(item.key)}
                    >
                      {busyAction === `withdraw-${item.key}` ? 'Withdrawing...' : 'Withdraw Application'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
