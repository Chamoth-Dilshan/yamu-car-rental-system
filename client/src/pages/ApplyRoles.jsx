import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { formatRoleLabel, getProfilePathForRole } from '../utils/roles';

const blockedProfileStatuses = ['rejected', 'suspended', 'deactivated'];
const blockedApplicationStatuses = ['suspended', 'deactivated'];
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

const roleLabel = (value) => formatRoleLabel(value);
const createDocumentDraft = (document = {}) => ({
  fileName: document?.fileName || '',
  filePath: document?.filePath || document?.reference || '',
  status: document?.status || 'not_uploaded',
  rejectionReason: document?.rejectionReason || '',
  uploadedAt: document?.uploadedAt || null,
  reviewedAt: document?.reviewedAt || null
});
const createDriverDocumentsDraft = (documents = {}) => ({
  nicDocument: createDocumentDraft(documents.nicDocument),
  drivingLicenseDocument: createDocumentDraft(documents.drivingLicenseDocument || documents.licenseProof),
  proofOfAddressDocument: createDocumentDraft(documents.proofOfAddressDocument)
});
const createStaffDocumentsDraft = (documents = {}) => ({
  businessRegistrationDocument: createDocumentDraft(documents.businessRegistrationDocument || documents.businessRegistrationProof),
  proofOfAddressDocument: createDocumentDraft(documents.proofOfAddressDocument)
});
const formatStatusLabel = (value) => String(value || '')
  .split('_')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');
const getStatusTone = (value) => {
  switch (value) {
    case 'active':
    case 'approved':
    case 'verified':
      return 'success';
    case 'pending':
    case 'pending_review':
    case 'uploaded':
    case 'unverified':
      return 'info';
    case 'missing_requirements':
    case 'not_uploaded':
    case 'withdrawn':
    case 'not_submitted':
    case 'not_assigned':
      return 'warning';
    case 'rejected':
    case 'suspended':
    case 'deactivated':
      return 'danger';
    default:
      return 'info';
  }
};
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
const hasDocumentReference = (document = {}) => Boolean(document?.fileName || document?.filePath);
const calculateCompletionPercent = (items = []) => {
  if (!items.length) {
    return 0;
  }

  const completed = items.filter(Boolean).length;
  return Math.round((completed / items.length) * 100);
};

export default function ApplyRoles() {
  const { user, setUser, refreshMe, refreshNotifications } = useAuth();
  const [driverProfile, setDriverProfile] = useState({
    drivingLicenseNumber: '',
    licenseExpiryDate: '',
    nicId: '',
    serviceArea: '',
    providerDetails: '',
    documents: createDriverDocumentsDraft()
  });
  const [staffProfile, setStaffProfile] = useState({
    storeName: '',
    storeOwner: '',
    businessRegistrationNumber: '',
    storeAddress: '',
    storeContactNumber: '',
    storeEmail: '',
    documents: createStaffDocumentsDraft()
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const roleMap = useMemo(() => (
    Object.fromEntries((user?.roles || []).map((item) => [item.roleKey, item]))
  ), [user]);
  const applicationMap = useMemo(() => (
    Object.fromEntries((user?.providerApplications || []).map((item) => [item.roleKey, item]))
  ), [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setDriverProfile({
      drivingLicenseNumber: user.driverProfile?.drivingLicenseNumber || '',
      licenseExpiryDate: user.driverProfile?.licenseExpiryDate ? String(user.driverProfile.licenseExpiryDate).slice(0, 10) : '',
      nicId: user.driverProfile?.nicId || '',
      serviceArea: user.driverProfile?.serviceArea || '',
      providerDetails: user.driverProfile?.providerDetails || '',
      documents: createDriverDocumentsDraft(user.driverProfile?.documents || {})
    });

    setStaffProfile({
      storeName: user.staffProfile?.storeName || '',
      storeOwner: user.staffProfile?.storeOwner || '',
      businessRegistrationNumber: user.staffProfile?.businessRegistrationNumber || '',
      storeAddress: user.staffProfile?.storeAddress || '',
      storeContactNumber: user.staffProfile?.storeContactNumber || '',
      storeEmail: user.staffProfile?.storeEmail || '',
      documents: createStaffDocumentsDraft(user.staffProfile?.documents || {})
    });
  }, [user]);

  const customerRole = roleMap.customer;
  const driverRole = roleMap.driver;
  const staffRole = roleMap.staff;
  const driverApplication = applicationMap.driver;
  const staffApplication = applicationMap.staff;
  const driverProfileBlocked = driverRole && blockedProfileStatuses.includes(driverRole.roleStatus);
  const staffProfileBlocked = staffRole && blockedProfileStatuses.includes(staffRole.roleStatus);
  const driverApplicationBlocked = driverRole && blockedApplicationStatuses.includes(driverRole.roleStatus);
  const staffApplicationBlocked = staffRole && blockedApplicationStatuses.includes(staffRole.roleStatus);
  const driverReadiness = calculateCompletionPercent([
    driverProfile.drivingLicenseNumber,
    driverProfile.licenseExpiryDate,
    driverProfile.nicId,
    driverProfile.serviceArea,
    driverProfile.providerDetails,
    hasDocumentReference(driverProfile.documents.nicDocument),
    hasDocumentReference(driverProfile.documents.drivingLicenseDocument),
    hasDocumentReference(driverProfile.documents.proofOfAddressDocument)
  ]);
  const staffReadiness = calculateCompletionPercent([
    staffProfile.storeName,
    staffProfile.storeOwner,
    staffProfile.businessRegistrationNumber,
    staffProfile.storeAddress,
    staffProfile.storeContactNumber,
    staffProfile.storeEmail,
    hasDocumentReference(staffProfile.documents.businessRegistrationDocument),
    hasDocumentReference(staffProfile.documents.proofOfAddressDocument)
  ]);

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

  const saveRoleProfile = async (endpoint, payload, successMessage, actionKey) => {
    setBusyAction(actionKey);
    setMessage('');
    setError('');

    try {
      const res = await API.put(endpoint, payload);
      setUser(res.data.user);
      setMessage(successMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setBusyAction('');
    }
  };

  const submitProviderApplication = async (roleKey, payload) => {
    setBusyAction(`apply-${roleKey}`);
    setMessage('');
    setError('');

    try {
      const res = await API.post(`/users/applications/${roleKey}`, payload);
      setUser(res.data.user);
      await refreshNotifications().catch(() => {});
      setMessage(`${roleLabel(roleKey)} application submitted for review`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setBusyAction('');
    }
  };

  const buildOnboardingState = (roleKey, roleItem, applicationItem, readinessPercent, profileBlocked, applicationBlocked) => {
    const roleName = roleLabel(roleKey);
    const approved = roleItem?.roleStatus === 'active' && roleItem?.verificationStatus === 'verified';

    if (profileBlocked || applicationBlocked) {
      return {
        tone: 'danger',
        stateLabel: 'Needs admin follow-up',
        helperTitle: `${roleName} access is blocked`,
        helperText: `This ${roleName.toLowerCase()} record is suspended or rejected. Review the admin note before making more changes.`,
        readinessPercent
      };
    }

    if (approved) {
      return {
        tone: 'success',
        stateLabel: 'Ready to use',
        helperTitle: `${roleName} access is approved`,
        helperText: 'Your role is active and verified. Keep the profile data current so future reviews stay smooth.',
        readinessPercent
      };
    }

    if (applicationItem?.status === 'pending') {
      return {
        tone: 'info',
        stateLabel: 'Waiting for review',
        helperTitle: `${roleName} request is pending`,
        helperText: 'Admin review is in progress. Keep your details and document metadata updated in case changes are requested.',
        readinessPercent
      };
    }

    if (applicationItem?.status === 'rejected') {
      return {
        tone: 'warning',
        stateLabel: 'Update and re-apply',
        helperTitle: `${roleName} request needs updates`,
        helperText: 'Review the rejection note, update the required details, then re-submit the role request.',
        readinessPercent
      };
    }

    if (roleItem) {
      return {
        tone: 'info',
        stateLabel: 'Profile in progress',
        helperTitle: `Finish the ${roleName.toLowerCase()} setup`,
        helperText: 'Complete the profile details first, then submit the role request when the profile is ready.',
        readinessPercent
      };
    }

    return {
      tone: 'warning',
      stateLabel: 'Not started',
      helperTitle: `Start the ${roleName.toLowerCase()} onboarding`,
      helperText: 'Add the required details below before you send the request for approval.',
      readinessPercent
    };
  };

  const driverOnboardingState = buildOnboardingState('driver', driverRole, driverApplication, driverReadiness, driverProfileBlocked, driverApplicationBlocked);
  const staffOnboardingState = buildOnboardingState('staff', staffRole, staffApplication, staffReadiness, staffProfileBlocked, staffApplicationBlocked);

  const updateDriverDocument = (documentKey, field, value) => {
    setDriverProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: {
          ...prev.documents[documentKey],
          [field]: value,
          ...(['fileName', 'filePath'].includes(field)
            ? (() => {
                const nextDocument = {
                  ...prev.documents[documentKey],
                  [field]: value
                };
                const hasFile = Boolean(nextDocument.fileName || nextDocument.filePath);

                return {
                  status: hasFile ? 'uploaded' : 'not_uploaded',
                  rejectionReason: '',
                  reviewedAt: null,
                  uploadedAt: hasFile ? (nextDocument.uploadedAt || new Date().toISOString()) : null
                };
              })()
            : {})
        }
      }
    }));
  };

  const updateStaffDocument = (documentKey, field, value) => {
    setStaffProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: {
          ...prev.documents[documentKey],
          [field]: value,
          ...(['fileName', 'filePath'].includes(field)
            ? (() => {
                const nextDocument = {
                  ...prev.documents[documentKey],
                  [field]: value
                };
                const hasFile = Boolean(nextDocument.fileName || nextDocument.filePath);

                return {
                  status: hasFile ? 'uploaded' : 'not_uploaded',
                  rejectionReason: '',
                  reviewedAt: null,
                  uploadedAt: hasFile ? (nextDocument.uploadedAt || new Date().toISOString()) : null
                };
              })()
            : {})
        }
      }
    }));
  };

  const renderDocumentMeta = (document) => (
    <>
      <div className="pill-row" style={{ marginTop: '0.75rem' }}>
        <span className={getBadgeClass(getStatusTone(document?.status))}>
          Status: {formatStatusLabel(document?.status || 'not_uploaded')}
        </span>
        {document?.uploadedAt && (
          <span className="badge badge-info">Uploaded: {formatDateTime(document.uploadedAt)}</span>
        )}
        {document?.reviewedAt && (
          <span className="badge badge-warning">Reviewed: {formatDateTime(document.reviewedAt)}</span>
        )}
      </div>
      {document?.rejectionReason && (
        <div className="alert alert-warning" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          Rejection reason: {document.rejectionReason}
        </div>
      )}
    </>
  );

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

        <div className="account-grid" style={{ marginBottom: '1.5rem' }}>
          {roleCards.map((item) => {
            const role = roleMap[item.key];
            const application = applicationMap[item.key];
            const isApproved = role?.roleStatus === 'active' && role?.verificationStatus === 'verified';
            const isPending = application?.status === 'pending';
            const isRejected = application?.status === 'rejected';
            const isWithdrawn = application?.status === 'withdrawn';
            const isCurrentRole = user?.activeRole === item.key;
            const target = isCurrentRole
              ? getProfilePathForRole(item.key)
              : isApproved
                ? '/switch-roles'
                : `/apply-roles#${item.key}-role`;
            const actionLabel = isCurrentRole
              ? 'Manage Active Profile'
              : isApproved
                ? 'Switch to Role'
                : 'Continue Application';

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
                      {isCurrentRole ? 'Edit Active Profile' : isApproved ? 'Switch to This Role' : 'Open Role Form'}
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

        <div id="driver-role" className="form-card profile-section-card role-onboarding-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Driver Profile</h3>
              <p>Maintain the driver profile, review application state, and manage the next action from one card.</p>
            </div>
            <span className={getBadgeClass(driverOnboardingState.tone)}>{driverOnboardingState.stateLabel}</span>
          </div>

          <div className="role-onboarding-summary-grid">
            <div className="admin-data-item">
              <span>Readiness</span>
              <strong>{driverOnboardingState.readinessPercent}%</strong>
            </div>
            <div className="admin-data-item">
              <span>Role status</span>
              <strong>{formatStatusLabel(driverRole?.roleStatus || 'not_assigned')}</strong>
            </div>
            <div className="admin-data-item">
              <span>Verification</span>
              <strong>{formatStatusLabel(driverRole?.verificationStatus || 'unverified')}</strong>
            </div>
            <div className="admin-data-item">
              <span>Application</span>
              <strong>{formatStatusLabel(driverApplication?.status || 'not_submitted')}</strong>
            </div>
          </div>

          <div className={`profile-next-step profile-next-step-${driverOnboardingState.tone}`}>
            <strong>{driverOnboardingState.helperTitle}</strong>
            <p>{driverOnboardingState.helperText}</p>
          </div>

          <div className="pill-row profile-panel-pills">
            <span className="badge badge-info">Role status: {driverRole?.roleStatus || 'not assigned'}</span>
            <span className="badge badge-warning">Verification: {driverRole?.verificationStatus || 'unverified'}</span>
            <span className="badge badge-success">Application: {driverApplication?.status || 'not submitted'}</span>
          </div>
          {driverApplication?.rejectionReason && (
            <div className="alert alert-warning">Admin note: {driverApplication.rejectionReason}</div>
          )}
          {driverProfileBlocked && (
            <div className="alert alert-danger">This role is blocked. Contact an admin before submitting further driver updates.</div>
          )}
          <form onSubmit={(e) => {
            e.preventDefault();
            saveRoleProfile('/users/driver-profile', driverProfile, 'Driver profile updated successfully', 'driver');
          }}
          >
            <div className="form-row">
              <div className="form-group">
                <label>Driving License Number</label>
                <input value={driverProfile.drivingLicenseNumber} onChange={(e) => setDriverProfile((prev) => ({ ...prev, drivingLicenseNumber: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>License Expiry Date</label>
                <input type="date" value={driverProfile.licenseExpiryDate} onChange={(e) => setDriverProfile((prev) => ({ ...prev, licenseExpiryDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>NIC / ID</label>
                <input value={driverProfile.nicId} onChange={(e) => setDriverProfile((prev) => ({ ...prev, nicId: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Service Area</label>
                <input value={driverProfile.serviceArea} onChange={(e) => setDriverProfile((prev) => ({ ...prev, serviceArea: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Provider Onboarding Details</label>
              <textarea rows="3" value={driverProfile.providerDetails} onChange={(e) => setDriverProfile((prev) => ({ ...prev, providerDetails: e.target.value }))} />
            </div>
            <div className="form-header" style={{ marginTop: '1rem' }}>
              <h3>Document Metadata</h3>
              <p style={{ color: 'var(--text-light)' }}>Add placeholder file details now. Real uploads can replace these paths later without changing the API shape.</p>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>NIC / ID File Name</label>
                <input
                  value={driverProfile.documents.nicDocument.fileName}
                  onChange={(e) => updateDriverDocument('nicDocument', 'fileName', e.target.value)}
                  placeholder="nic-scan.pdf"
                />
              </div>
              <div className="form-group">
                <label>NIC / ID File Path / Placeholder</label>
                <input
                  value={driverProfile.documents.nicDocument.filePath}
                  onChange={(e) => updateDriverDocument('nicDocument', 'filePath', e.target.value)}
                  placeholder="uploads/driver/nic-scan.pdf"
                />
              </div>
            </div>
            {renderDocumentMeta(driverProfile.documents.nicDocument)}
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Driving License File Name</label>
                <input
                  value={driverProfile.documents.drivingLicenseDocument.fileName}
                  onChange={(e) => updateDriverDocument('drivingLicenseDocument', 'fileName', e.target.value)}
                  placeholder="license-front.jpg"
                />
              </div>
              <div className="form-group">
                <label>Driving License File Path / Placeholder</label>
                <input
                  value={driverProfile.documents.drivingLicenseDocument.filePath}
                  onChange={(e) => updateDriverDocument('drivingLicenseDocument', 'filePath', e.target.value)}
                  placeholder="uploads/driver/license-front.jpg"
                />
              </div>
            </div>
            {renderDocumentMeta(driverProfile.documents.drivingLicenseDocument)}
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Proof of Address File Name</label>
                <input
                  value={driverProfile.documents.proofOfAddressDocument.fileName}
                  onChange={(e) => updateDriverDocument('proofOfAddressDocument', 'fileName', e.target.value)}
                  placeholder="utility-bill.pdf"
                />
              </div>
              <div className="form-group">
                <label>Proof of Address File Path / Placeholder</label>
                <input
                  value={driverProfile.documents.proofOfAddressDocument.filePath}
                  onChange={(e) => updateDriverDocument('proofOfAddressDocument', 'filePath', e.target.value)}
                  placeholder="uploads/driver/utility-bill.pdf"
                />
              </div>
            </div>
            {renderDocumentMeta(driverProfile.documents.proofOfAddressDocument)}
            <div className="profile-form-actions">
              {driverRole && (
                <button className="btn btn-secondary" type="submit" disabled={busyAction === 'driver' || driverProfileBlocked}>
                  {busyAction === 'driver' ? 'Saving...' : 'Save Driver Profile'}
                </button>
              )}
            </div>
          </form>
          {customerRole && !driverApplicationBlocked && (
            <div className="profile-form-actions">
              <button
                className="btn btn-primary"
                type="button"
                disabled={
                  busyAction === 'apply-driver'
                  || driverApplication?.status === 'pending'
                  || (driverRole?.roleStatus === 'active' && driverRole?.verificationStatus === 'verified')
                }
                onClick={() => submitProviderApplication('driver', driverProfile)}
              >
                {busyAction === 'apply-driver'
                  ? 'Submitting...'
                  : driverApplication?.status === 'pending'
                    ? 'Driver Application Pending'
                    : driverApplication?.status === 'rejected'
                      ? 'Re-apply for Driver Role'
                      : driverRole?.roleStatus === 'active' && driverRole?.verificationStatus === 'verified'
                        ? 'Driver Role Approved'
                        : 'Apply for Driver Role'}
              </button>
            </div>
          )}
        </div>

        <div id="staff-role" className="form-card profile-section-card role-onboarding-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Store Profile</h3>
              <p>Maintain store information, document placeholders, and the store provider request in one place.</p>
            </div>
            <span className={getBadgeClass(staffOnboardingState.tone)}>{staffOnboardingState.stateLabel}</span>
          </div>

          <div className="role-onboarding-summary-grid">
            <div className="admin-data-item">
              <span>Readiness</span>
              <strong>{staffOnboardingState.readinessPercent}%</strong>
            </div>
            <div className="admin-data-item">
              <span>Role status</span>
              <strong>{formatStatusLabel(staffRole?.roleStatus || 'not_assigned')}</strong>
            </div>
            <div className="admin-data-item">
              <span>Verification</span>
              <strong>{formatStatusLabel(staffRole?.verificationStatus || 'unverified')}</strong>
            </div>
            <div className="admin-data-item">
              <span>Application</span>
              <strong>{formatStatusLabel(staffApplication?.status || 'not_submitted')}</strong>
            </div>
          </div>

          <div className={`profile-next-step profile-next-step-${staffOnboardingState.tone}`}>
            <strong>{staffOnboardingState.helperTitle}</strong>
            <p>{staffOnboardingState.helperText}</p>
          </div>

          <div className="pill-row profile-panel-pills">
            <span className="badge badge-info">Role status: {staffRole?.roleStatus || 'not assigned'}</span>
            <span className="badge badge-warning">Verification: {staffRole?.verificationStatus || 'unverified'}</span>
            <span className="badge badge-success">Application: {staffApplication?.status || 'not submitted'}</span>
          </div>
          {staffApplication?.rejectionReason && (
            <div className="alert alert-warning">Admin note: {staffApplication.rejectionReason}</div>
          )}
          {staffProfileBlocked && (
            <div className="alert alert-danger">This role is blocked. Contact an admin before submitting further store updates.</div>
          )}
          <form onSubmit={(e) => {
            e.preventDefault();
            saveRoleProfile('/users/staff-profile', staffProfile, 'Store profile updated successfully', 'staff');
          }}
          >
            <div className="form-row">
              <div className="form-group">
                <label>Store Name</label>
                <input value={staffProfile.storeName} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Store Owner</label>
                <input value={staffProfile.storeOwner} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeOwner: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Business Registration Number</label>
                <input value={staffProfile.businessRegistrationNumber} onChange={(e) => setStaffProfile((prev) => ({ ...prev, businessRegistrationNumber: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Store Contact Number</label>
                <input value={staffProfile.storeContactNumber} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeContactNumber: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Store Email</label>
                <input type="email" value={staffProfile.storeEmail} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeEmail: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Store Address</label>
                <input value={staffProfile.storeAddress} onChange={(e) => setStaffProfile((prev) => ({ ...prev, storeAddress: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Business Registration File Name</label>
                <input
                  value={staffProfile.documents.businessRegistrationDocument.fileName}
                  onChange={(e) => updateStaffDocument('businessRegistrationDocument', 'fileName', e.target.value)}
                  placeholder="business-registration.pdf"
                />
              </div>
              <div className="form-group">
                <label>Business Registration File Path / Placeholder</label>
                <input
                  value={staffProfile.documents.businessRegistrationDocument.filePath}
                  onChange={(e) => updateStaffDocument('businessRegistrationDocument', 'filePath', e.target.value)}
                  placeholder="uploads/staff/business-registration.pdf"
                />
              </div>
            </div>
            {renderDocumentMeta(staffProfile.documents.businessRegistrationDocument)}
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Proof of Address File Name</label>
                <input
                  value={staffProfile.documents.proofOfAddressDocument.fileName}
                  onChange={(e) => updateStaffDocument('proofOfAddressDocument', 'fileName', e.target.value)}
                  placeholder="store-utility-bill.pdf"
                />
              </div>
              <div className="form-group">
                <label>Proof of Address File Path / Placeholder</label>
                <input
                  value={staffProfile.documents.proofOfAddressDocument.filePath}
                  onChange={(e) => updateStaffDocument('proofOfAddressDocument', 'filePath', e.target.value)}
                  placeholder="uploads/staff/store-utility-bill.pdf"
                />
              </div>
            </div>
            {renderDocumentMeta(staffProfile.documents.proofOfAddressDocument)}
            <div className="profile-form-actions">
              {staffRole && (
                <button className="btn btn-secondary" type="submit" disabled={busyAction === 'staff' || staffProfileBlocked}>
                  {busyAction === 'staff' ? 'Saving...' : 'Save Store Profile'}
                </button>
              )}
            </div>
          </form>
          {customerRole && !staffApplicationBlocked && (
            <div className="profile-form-actions">
              <button
                className="btn btn-primary"
                type="button"
                disabled={
                  busyAction === 'apply-staff'
                  || staffApplication?.status === 'pending'
                  || (staffRole?.roleStatus === 'active' && staffRole?.verificationStatus === 'verified')
                }
                onClick={() => submitProviderApplication('staff', staffProfile)}
              >
                {busyAction === 'apply-staff'
                  ? 'Submitting...'
                  : staffApplication?.status === 'pending'
                    ? 'Store Application Pending'
                    : staffApplication?.status === 'rejected'
                      ? 'Re-apply for Store Role'
                      : staffRole?.roleStatus === 'active' && staffRole?.verificationStatus === 'verified'
                        ? 'Store Role Approved'
                        : 'Apply for Store Role'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
