import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';
import { buildUploadUrl } from '../api/config';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { formatDateTime } from '../utils/formatters';

const blockedProfileStatuses = ['rejected', 'suspended', 'deactivated'];
const blockedApplicationStatuses = ['suspended', 'deactivated'];

const roleLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);
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
const isRoleManagementNotification = (notification = {}) => {
  const combinedText = [
    notification.title,
    notification.message,
    notification.link
  ].join(' ').toLowerCase();

  return [
    'profile',
    'role',
    'verification',
    'approve',
    'approval',
    'application',
    'switch',
    'admin/users',
    'admin/roles',
    'pending-approvals'
  ].some((token) => combinedText.includes(token));
};

export default function Profile() {
  const {
    user,
    setUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications
  } = useAuth();
  const [profile, setProfile] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    dob: '',
    bio: '',
    preferredLanguage: 'English',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    currentPassword: '',
    password: ''
  });
  const [customerProfile, setCustomerProfile] = useState({
    preferences: '',
    notes: ''
  });
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
  const [adminProfile, setAdminProfile] = useState({
    accessScope: '',
    controlNotes: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [roleHistory, setRoleHistory] = useState([]);
  const [roleHistoryLoading, setRoleHistoryLoading] = useState(false);

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

    setProfile({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      dob: user.dob || '',
      bio: user.bio || '',
      preferredLanguage: user.preferredLanguage || 'English',
      emergencyContactName: user.emergencyContact?.name || '',
      emergencyContactPhone: user.emergencyContact?.phone || '',
      emergencyContactRelationship: user.emergencyContact?.relationship || '',
      currentPassword: '',
      password: ''
    });

    setCustomerProfile({
      preferences: user.customerProfile?.preferences || '',
      notes: user.customerProfile?.notes || ''
    });

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

    setAdminProfile({
      accessScope: user.adminProfile?.accessScope || '',
      controlNotes: user.adminProfile?.controlNotes || ''
    });
  }, [user]);

  useEffect(() => {
    if (!user?._id) {
      setRoleHistory([]);
      return;
    }

    let active = true;
    setRoleHistoryLoading(true);

    API.get('/users/role-history')
      .then((res) => {
        if (active) {
          setRoleHistory(res.data.items || []);
        }
      })
      .catch(() => {
        if (active) {
          setRoleHistory([]);
        }
      })
      .finally(() => {
        if (active) {
          setRoleHistoryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?._id, user?.updatedAt]);

  const customerRole = roleMap.customer;
  const driverRole = roleMap.driver;
  const staffRole = roleMap.staff;
  const adminRole = roleMap.admin;
  const driverApplication = applicationMap.driver;
  const staffApplication = applicationMap.staff;

  const saveBasicProfile = async (event) => {
    event.preventDefault();
    setBusyAction('basic');
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (key === 'password') {
          if (value) {
            formData.append(key, value);
          }
          return;
        }

        if (key === 'currentPassword') {
          if (profile.password && value) {
            formData.append(key, value);
          }
          return;
        }

        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      if (profilePic) {
        formData.append('profilePic', profilePic);
      }

      const res = await API.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      setProfile((prev) => ({ ...prev, currentPassword: '', password: '' }));
      setProfilePic(null);
      setMessage('Common profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
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

  const avatarSrc = user?.profilePic && user.profilePic !== 'avatar.png'
    ? buildUploadUrl(user.profilePic)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&background=f0a500&color=0d1b2a&bold=true`;

  const driverProfileBlocked = driverRole && blockedProfileStatuses.includes(driverRole.roleStatus);
  const staffProfileBlocked = staffRole && blockedProfileStatuses.includes(staffRole.roleStatus);
  const driverApplicationBlocked = driverRole && blockedApplicationStatuses.includes(driverRole.roleStatus);
  const staffApplicationBlocked = staffRole && blockedApplicationStatuses.includes(staffRole.roleStatus);
  const profileCompletion = user?.profileCompletion?.percent || 0;
  const accountHealth = user?.accountHealth;
  const verificationCenter = user?.verificationCenter;
  const verificationItems = verificationCenter?.roleChecks || [];
  const currentVerification = verificationCenter?.currentRole;
  const pendingApplicationsCount = (user?.providerApplications || []).filter((item) => item.status === 'pending').length;
  const managedNotifications = useMemo(() => (
    (notifications || []).filter((notification) => isRoleManagementNotification(notification))
  ), [notifications]);
  const unreadManagedNotificationsCount = managedNotifications.filter((notification) => !notification.isRead).length;
  const switchableRolesCount = (user?.roles || []).filter((item) => item.roleStatus === 'active' && item.verificationStatus === 'verified').length;
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
  const activeRoleRecord = (user?.roles || []).find((item) => item.roleKey === user?.activeRole);
  const currentRoleReadiness = user?.activeRole === 'driver'
    ? driverReadiness
    : user?.activeRole === 'staff'
      ? staffReadiness
      : profileCompletion;

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

  const driverOnboardingState = buildOnboardingState(
    'driver',
    driverRole,
    driverApplication,
    driverReadiness,
    driverProfileBlocked,
    driverApplicationBlocked
  );
  const staffOnboardingState = buildOnboardingState(
    'staff',
    staffRole,
    staffApplication,
    staffReadiness,
    staffProfileBlocked,
    staffApplicationBlocked
  );

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

  const renderAccountHealthWidget = () => (
    <section className="profile-panel-card">
      <div className="card-header">
        <div>
          <h3>Account Health</h3>
          <p className="profile-panel-copy">
            A compact summary of your account status, role readiness, and the next action blocking role progress.
          </p>
        </div>
        <span className={getBadgeClass(accountHealth?.accountStatusTone)}>
          {accountHealth?.accountStatusLabel || formatStatusLabel(user?.accountStatus)}
        </span>
      </div>

      <div className="pill-row profile-panel-pills">
        <span className="badge badge-info">Active role: {accountHealth?.activeRoleLabel || roleLabel(user?.activeRole || 'customer')}</span>
        <span className="badge badge-success">Primary role: {accountHealth?.primaryRoleLabel || roleLabel(user?.primaryRole || user?.activeRole || 'customer')}</span>
        <span className="badge badge-warning">Profile: {accountHealth?.profileCompletionPercent ?? profileCompletion}%</span>
        <span className="badge badge-info">Pending: {accountHealth?.pendingApplicationsCount ?? pendingApplicationsCount}</span>
        <span className="badge badge-info">Unread: {accountHealth?.unreadNotificationsCount ?? unreadManagedNotificationsCount}</span>
        <span className={getBadgeClass(accountHealth?.verificationTone)}>
          Verification: {accountHealth?.verificationStateLabel || currentVerification?.stateLabel || 'Not Started'}
        </span>
      </div>

      <div className="admin-list-item profile-highlight-row">
        <div>
          <h4>
            Next role action
            {accountHealth?.nextRoleAction?.roleLabel ? `: ${accountHealth.nextRoleAction.roleLabel}` : ''}
          </h4>
          <p>{accountHealth?.nextRoleAction?.guidance || 'Keep your account details current so role workflows stay ready.'}</p>
          {accountHealth?.nextRoleAction?.missingRequirements?.length > 0 && (
            <div className="pill-row" style={{ marginTop: '0.75rem' }}>
              {accountHealth.nextRoleAction.missingRequirements.map((item) => (
                <span key={item} className="badge badge-warning">{item}</span>
              ))}
            </div>
          )}
        </div>
        <span className={getBadgeClass(accountHealth?.nextRoleAction?.tone)}>
          {accountHealth?.nextRoleAction?.stateLabel || 'All Set'}
        </span>
      </div>
    </section>
  );

  const renderRoleHistoryTimeline = () => (
    <section className="profile-panel-card">
      <div className="card-header">
        <div>
          <h3>Role History</h3>
          <p className="profile-panel-copy">
            Review how your role applications, approvals, switches, and primary-role changes happened over time.
          </p>
        </div>
        <span className="badge badge-info">{roleHistory.length} events</span>
      </div>

      {roleHistoryLoading ? (
        <div className="reservation-empty">Loading role history...</div>
      ) : roleHistory.length > 0 ? (
        <div className="notification-feed">
          {roleHistory.map((item) => (
            <div key={item.id} className="notification-card">
              <div className="notification-card-copy">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <small>
                  {formatDateTime(item.createdAt)}
                  {item.actor?.fullName ? ` | ${item.actor.isSelf ? 'You' : item.actor.fullName}` : ''}
                </small>
              </div>
              {item.roleKey && (
                <div className="notification-card-actions">
                  <span className="badge badge-info">{roleLabel(item.roleKey)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="reservation-empty">No role history yet. Role applications, approvals, switches, and primary-role changes will appear here.</div>
      )}
    </section>
  );

  return (
    <div className="dashboard-layout page-content profile-page">
      <Sidebar />
      <main className="dashboard-content">
        <section className="form-card profile-hero-card">
          <div className="profile-hero-main">
            <div className="profile-hero-identity">
              <img className="profile-hero-avatar" src={avatarSrc} alt={user?.fullName} />
              <div className="profile-hero-copy">
                <span className="profile-hero-kicker">Profile Hub</span>
                <h2>{user?.fullName}</h2>
                <p>{user?.email}</p>
                <div className="profile-hero-meta">
                  <span className="badge badge-info">Active role: {roleLabel(user?.activeRole || 'customer')}</span>
                  <span className="badge badge-success">Primary role: {roleLabel(user?.primaryRole || user?.activeRole || 'customer')}</span>
                  <span className={getBadgeClass(getStatusTone(user?.accountStatus))}>Account: {formatStatusLabel(user?.accountStatus)}</span>
                  <span className="badge badge-info">{switchableRolesCount} switchable role(s)</span>
                </div>
              </div>
            </div>

            <div className="profile-hero-aside">
              <div className="profile-progress-card">
                <div className="profile-progress-header">
                  <strong>{profileCompletion}%</strong>
                  <span>profile completion</span>
                </div>
                <div className="account-progress-track">
                  <div className="account-progress-fill" style={{ width: `${profileCompletion}%` }} />
                </div>
                <p>{pendingApplicationsCount} pending role request(s) and {unreadManagedNotificationsCount} unread workflow notification(s).</p>
              </div>

              <div className="profile-hero-actions">
                <a className="btn btn-primary btn-sm" href="#common-profile">Edit Common Profile</a>
                <Link className="btn btn-outline btn-sm" to="/switch-roles">Switch Roles</Link>
                <Link className="btn btn-outline btn-sm" to="/apply-roles">Open Role Requests</Link>
                <a className="btn btn-outline btn-sm" href="#notifications">Open Notifications</a>
              </div>
            </div>
          </div>
        </section>

        {(driverApplication?.status === 'pending' || staffApplication?.status === 'pending') && (
          <div className="alert alert-info">
            A role application is waiting for admin review. Pending roles stay visible for onboarding, but they cannot be used as active roles until approved.
          </div>
        )}

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <nav className="profile-section-nav" aria-label="Profile sections">
          {[
            ['#account-overview', 'Account Overview'],
            ['#common-profile', 'Common Profile'],
            ['#verification-status', 'Verification & Status'],
            ['#customer-profile', 'Customer Profile'],
            ['#driver-role', 'Driver Onboarding'],
            ['#staff-role', 'Staff Onboarding'],
            ['#admin-profile', 'Admin Profile'],
            ['#notifications', 'Notifications'],
            ['#role-history', 'Role History']
          ].map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>

        <div className="stats-grid profile-health-grid">
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{profileCompletion}%</h3>
              <p>Profile completion</p>
            </div>
          </div>
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{pendingApplicationsCount}</h3>
              <p>Pending applications</p>
            </div>
          </div>
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{unreadManagedNotificationsCount}</h3>
              <p>Unread role notifications</p>
            </div>
          </div>
          <div className="stat-card profile-stat-card">
            <div className="stat-info">
              <h3>{currentRoleReadiness}%</h3>
              <p>Current role readiness</p>
            </div>
          </div>
        </div>

        <section id="account-overview" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Account Overview</h3>
              <p>Review profile health, account status, and the current role state before making changes.</p>
            </div>
          </div>

          <div className="profile-overview-grid">
            {renderAccountHealthWidget()}

            <section className="profile-panel-card">
              <div className="card-header">
                <div>
                  <h3>Account Snapshot</h3>
                  <p className="profile-panel-copy">Key identity and role details in one compact view.</p>
                </div>
                <span className={getBadgeClass(getStatusTone(user?.accountStatus))}>{formatStatusLabel(user?.accountStatus)}</span>
              </div>

              <div className="admin-user-detail-grid">
                <div className="admin-data-item">
                  <span>Full name</span>
                  <strong>{user?.fullName || 'Not provided'}</strong>
                </div>
                <div className="admin-data-item">
                  <span>Username</span>
                  <strong>{user?.username || 'Not provided'}</strong>
                </div>
                <div className="admin-data-item">
                  <span>Phone</span>
                  <strong>{user?.phone || 'Not provided'}</strong>
                </div>
                <div className="admin-data-item">
                  <span>City</span>
                  <strong>{user?.city || 'Not provided'}</strong>
                </div>
                <div className="admin-data-item">
                  <span>Active role status</span>
                  <strong>{formatStatusLabel(activeRoleRecord?.roleStatus || 'active')}</strong>
                </div>
                <div className="admin-data-item">
                  <span>Active verification</span>
                  <strong>{formatStatusLabel(activeRoleRecord?.verificationStatus || 'not_started')}</strong>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="verification-status" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Verification &amp; Status</h3>
              <p className="profile-section-helper">
                Check your account status, role verification, and provider application progress before switching roles or applying for review.
              </p>
            </div>
            <span className={getBadgeClass(verificationCenter?.accountStatusTone)}>
              Account {verificationCenter?.accountStatusLabel || formatStatusLabel(user?.accountStatus)}
            </span>
          </div>

          <div className="role-onboarding-summary-grid">
            <div className="admin-data-item">
              <span>Current role</span>
              <strong>{roleLabel(user?.activeRole || 'customer')}</strong>
            </div>
            <div className="admin-data-item">
              <span>Primary role</span>
              <strong>{roleLabel(user?.primaryRole || user?.activeRole || 'customer')}</strong>
            </div>
            <div className="admin-data-item">
              <span>Current verification</span>
              <strong>{currentVerification?.stateLabel || 'Not Started'}</strong>
            </div>
            <div className="admin-data-item">
              <span>Profile completion</span>
              <strong>{profileCompletion}%</strong>
            </div>
          </div>

          <div className="pill-row profile-panel-pills">
            <span className="badge badge-info">Current role: {roleLabel(user?.activeRole || 'customer')}</span>
            <span className={getBadgeClass(currentVerification?.tone)}>
              Current verification: {currentVerification?.stateLabel || 'Not Started'}
            </span>
            <span className="badge badge-warning">Profile completion: {profileCompletion}%</span>
          </div>

          <p className="profile-section-helper">
            {verificationCenter?.accountGuidance || 'Complete your account details and keep role documents current so admin reviews move smoothly.'}
          </p>

          {currentVerification && (
            <div className={`alert alert-${currentVerification.tone === 'success' ? 'success' : currentVerification.tone === 'danger' ? 'danger' : currentVerification.tone === 'warning' ? 'warning' : 'info'}`}>
              Your current {currentVerification.roleLabel.toLowerCase()} role is marked as {currentVerification.stateLabel.toLowerCase()}.
            </div>
          )}

          <div className="admin-stack">
            {verificationItems.map((item) => (
              <div key={item.roleKey} className="admin-list-item profile-status-item">
                <div style={{ flex: 1 }}>
                  <h4>
                    {item.roleLabel}
                    {item.roleKey === user?.activeRole ? ' (Current Role)' : ''}
                  </h4>
                  <p style={{ marginBottom: '0.75rem' }}>{item.guidance}</p>
                  <div className="pill-row profile-panel-pills">
                    <span className={getBadgeClass(item.tone)}>{item.stateLabel}</span>
                    <span className={getBadgeClass(getStatusTone(item.roleStatus))}>Role status: {formatStatusLabel(item.roleStatus)}</span>
                    <span className={getBadgeClass(getStatusTone(item.verificationStatus))}>Verification: {formatStatusLabel(item.verificationStatus)}</span>
                    <span className={getBadgeClass(getStatusTone(item.applicationStatus))}>Application: {formatStatusLabel(item.applicationStatus)}</span>
                  </div>

                  {item.rejectionReason && (
                    <div className="alert alert-warning" style={{ marginBottom: '0.75rem' }}>
                      Rejection reason: {item.rejectionReason}
                    </div>
                  )}

                  {item.missingRequirements?.length > 0 && (
                    <div style={{ marginBottom: item.lastReviewedAt ? '0.75rem' : 0 }}>
                      <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Missing requirements</strong>
                      <div className="pill-row">
                        {item.missingRequirements.map((requirement) => (
                          <span key={`${item.roleKey}-${requirement}`} className="badge badge-warning">
                            {requirement}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.lastReviewedAt && (
                    <p className="profile-section-helper">
                      Last review: {formatDateTime(item.lastReviewedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div id="notifications" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Notifications</h3>
              <p>Focused updates for profile edits, role applications, approvals, verification changes, and switching access.</p>
            </div>
            <div className="pill-row">
              <span className="badge badge-info">{unreadManagedNotificationsCount} unread</span>
              {managedNotifications.length > 0 && (
                <button className="btn btn-outline btn-sm" type="button" onClick={() => markAllNotificationsRead()}>
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          <div className="profile-overview-grid">
            <section className="profile-panel-card">
              <div className="card-header">
                <div>
                  <h3>Top Preview</h3>
                  <p className="profile-panel-copy">Unread items and recent workflow updates appear here first.</p>
                </div>
              </div>

              {managedNotifications.length > 0 ? (
                <div className="notification-feed">
                  {managedNotifications.slice(0, 3).map((notification) => (
                    <div key={notification._id} className={`notification-card${notification.isRead ? '' : ' unread'}`}>
                      <div className="notification-card-copy">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <small>{formatDateTime(notification.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No profile or role workflow notifications yet.</div>
              )}
            </section>

            <section className="profile-panel-card">
              <div className="card-header">
                <div>
                  <h3>Notification Center</h3>
                  <p className="profile-panel-copy">Open, mark read, and clear profile-related updates from one feed.</p>
                </div>
              </div>

              {managedNotifications.length > 0 ? (
                <div className="notification-feed">
                  {managedNotifications.map((notification) => (
                    <div key={notification._id} className={`notification-card${notification.isRead ? '' : ' unread'}`}>
                      <div className="notification-card-copy">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <small>{formatDateTime(notification.createdAt)}</small>
                      </div>
                      <div className="notification-card-actions">
                        {!notification.isRead && (
                          <button
                            className="btn btn-outline btn-sm"
                            type="button"
                            onClick={() => markNotificationRead(notification._id)}
                          >
                            Mark Read
                          </button>
                        )}
                        {notification.link && (
                          <Link className="btn btn-primary btn-sm" to={notification.link}>
                            Open
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No notifications yet. Role and profile actions will appear here.</div>
              )}
            </section>
          </div>
        </div>

        <section id="role-history" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Role History</h3>
              <p>Review the full timeline of applications, approvals, switches, and role ownership changes.</p>
            </div>
          </div>
          {renderRoleHistoryTimeline()}
        </section>

        <div id="common-profile" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="profile-section-heading">
            <div>
              <h3>Common Profile</h3>
              <p>These details belong to your account regardless of the active role and drive overall completion.</p>
            </div>
            <span className="badge badge-warning">{profileCompletion}% complete</span>
          </div>
          <form onSubmit={saveBasicProfile}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value={profile.fullName} onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input value={profile.username} onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input value={profile.city} onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={profile.dob} onChange={(e) => setProfile((prev) => ({ ...prev, dob: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Language</label>
                <select
                  value={profile.preferredLanguage}
                  onChange={(e) => setProfile((prev) => ({ ...prev, preferredLanguage: e.target.value }))}
                >
                  <option value="English">English</option>
                  <option value="Sinhala">Sinhala</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>
              <div className="form-group">
                <label>Emergency Contact Name</label>
                <input
                  value={profile.emergencyContactName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <input value={profile.address} onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Emergency Contact Phone</label>
                <input
                  value={profile.emergencyContactPhone}
                  onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <input
                  value={profile.emergencyContactRelationship}
                  onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Bio</label>
                <textarea rows="3" value={profile.bio} onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={profile.currentPassword} onChange={(e) => setProfile((prev) => ({ ...prev, currentPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={profile.password} onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Profile Picture</label>
              <input type="file" accept="image/*" onChange={(e) => setProfilePic(e.target.files?.[0] || null)} />
            </div>
            <div className="profile-form-actions">
              <button className="btn btn-primary" type="submit" disabled={busyAction === 'basic'}>
                {busyAction === 'basic' ? 'Saving...' : 'Save Common Profile'}
              </button>
            </div>
          </form>
        </div>

        {customerRole && (
          <div id="customer-profile" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
            <div className="profile-section-heading">
              <div>
                <h3>Customer Profile</h3>
                <p>Customer-specific details stay available for booking-side workflows in the wider Yamu system.</p>
              </div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/customer-profile', customerProfile, 'Customer profile updated successfully', 'customer');
            }}
            >
              <div className="form-group">
                <label>Preferences</label>
                <textarea rows="3" value={customerProfile.preferences} onChange={(e) => setCustomerProfile((prev) => ({ ...prev, preferences: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows="3" value={customerProfile.notes} onChange={(e) => setCustomerProfile((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <div className="profile-form-actions">
                <button className="btn btn-primary" type="submit" disabled={busyAction === 'customer'}>
                  {busyAction === 'customer' ? 'Saving...' : 'Save Customer Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {(customerRole || driverRole) && (
          <div id="driver-role" className="form-card profile-section-card role-onboarding-card" style={{ marginBottom: '1.5rem' }}>
            <div className="profile-section-heading">
              <div>
                <h3>Driver Onboarding</h3>
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
        )}

        {(customerRole || staffRole) && (
          <div id="staff-role" className="form-card profile-section-card role-onboarding-card" style={{ marginBottom: '1.5rem' }}>
            <div className="profile-section-heading">
              <div>
                <h3>Staff Onboarding</h3>
                <p>Maintain rental center information, document placeholders, and the staff provider request in one place.</p>
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
              <div className="alert alert-danger">This role is blocked. Contact an admin before submitting further staff updates.</div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/staff-profile', staffProfile, 'Staff profile updated successfully', 'staff');
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
                    {busyAction === 'staff' ? 'Saving...' : 'Save Staff Profile'}
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
                      ? 'Staff Application Pending'
                      : staffApplication?.status === 'rejected'
                        ? 'Re-apply for Staff Role'
                        : staffRole?.roleStatus === 'active' && staffRole?.verificationStatus === 'verified'
                          ? 'Staff Role Approved'
                          : 'Apply for Staff Role'}
                </button>
              </div>
            )}
          </div>
        )}

        {adminRole && (
          <div id="admin-profile" className="form-card profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h3>Admin Profile</h3>
                <p>Reserved for seeded administrators and internal control notes.</p>
              </div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveRoleProfile('/users/admin-profile', adminProfile, 'Admin profile updated successfully', 'admin');
            }}
            >
              <div className="form-group">
                <label>Access Scope</label>
                <input value={adminProfile.accessScope} onChange={(e) => setAdminProfile((prev) => ({ ...prev, accessScope: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Control Notes</label>
                <textarea rows="4" value={adminProfile.controlNotes} onChange={(e) => setAdminProfile((prev) => ({ ...prev, controlNotes: e.target.value }))} />
              </div>
              <div className="profile-form-actions">
                <button className="btn btn-primary" type="submit" disabled={busyAction === 'admin'}>
                  {busyAction === 'admin' ? 'Saving...' : 'Save Admin Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
