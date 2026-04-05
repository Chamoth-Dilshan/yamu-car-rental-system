import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../api/axios';
import { buildUploadUrl } from '../api/config';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { formatDateTime } from '../utils/formatters';
import { isRoleManagementNotification } from '../utils/notifications';
import { formatRoleLabel, getProfilePathForRole } from '../utils/roles';

const blockedProfileStatuses = ['rejected', 'suspended', 'deactivated'];
const blockedApplicationStatuses = ['suspended', 'deactivated'];

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
export default function Profile() {
  const {
    user,
    setUser,
    switchRole,
    notifications,
    refreshNotifications
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState('');
  const roleMenuRef = useRef(null);
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

  useEffect(() => {
    if (!isRoleMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!roleMenuRef.current?.contains(event.target)) {
        setIsRoleMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsRoleMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRoleMenuOpen]);

  const customerRole = roleMap.customer;
  const driverRole = roleMap.driver;
  const staffRole = roleMap.staff;
  const adminRole = roleMap.admin;
  const driverApplication = applicationMap.driver;
  const staffApplication = applicationMap.staff;
  const activeRoleKey = user?.activeRole || user?.role || 'customer';

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

      const res = await API.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      setProfile((prev) => ({ ...prev, currentPassword: '', password: '' }));
      setIsEditMode(false);
      setMessage('User profile updated successfully');
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
  const baseProfileCompletion = calculateCompletionPercent([
    profile.fullName,
    profile.email,
    profile.phone,
    profile.address,
    profile.city,
    profile.preferredLanguage,
    profile.emergencyContactName,
    profile.emergencyContactPhone
  ]);
  const pendingApplicationsCount = (user?.providerApplications || []).filter((item) => item.status === 'pending').length;
  const managedNotifications = useMemo(() => (
    (notifications || []).filter((notification) => isRoleManagementNotification(notification))
  ), [notifications]);
  const unreadManagedNotificationsCount = managedNotifications.filter((notification) => !notification.isRead).length;
  const switchableRoles = useMemo(() => {
    const nextRoles = (user?.roles || []).filter((item) => item.roleStatus === 'active' && item.verificationStatus === 'verified');
    const currentRole = user?.activeRole || user?.role;

    if (currentRole && !nextRoles.some((item) => item.roleKey === currentRole)) {
      nextRoles.unshift({
        roleKey: currentRole,
        roleStatus: 'active',
        verificationStatus: 'verified',
        isPrimary: user?.primaryRole === currentRole
      });
    }

    return nextRoles;
  }, [user]);
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
  const defaultProfileSection = activeRoleKey === 'driver'
    ? 'driver'
    : activeRoleKey === 'staff'
      ? 'store'
      : activeRoleKey === 'admin'
        ? 'admin'
        : 'user';
  const pathSection = location.pathname.startsWith('/profile/')
    ? location.pathname.split('/')[2] || ''
    : '';
  const selectedProfileSection = ['user', 'driver', 'store', 'admin'].includes(pathSection)
    ? pathSection
    : defaultProfileSection;
  const profileTabs = [
    ...(activeRoleKey === 'customer' ? [{ key: 'user', to: '/profile/user', label: 'User Profile' }] : []),
    ...(['customer', 'driver'].includes(activeRoleKey) ? [{ key: 'driver', to: '/profile/driver', label: 'Driver Profile' }] : []),
    ...(activeRoleKey === 'staff' ? [{ key: 'store', to: '/profile/store', label: 'Store Profile' }] : []),
    ...(activeRoleKey === 'admin' ? [{ key: 'admin', to: '/profile/admin', label: 'Admin Profile' }] : [])
  ];
  const availableProfileSections = profileTabs.map((tab) => tab.key);
  const resolvedProfileSection = availableProfileSections.includes(selectedProfileSection)
    ? selectedProfileSection
    : defaultProfileSection;
  const selectedProfileLabel = resolvedProfileSection === 'driver'
    ? 'Driver Profile'
    : resolvedProfileSection === 'store'
      ? 'Store Profile'
      : resolvedProfileSection === 'admin'
        ? 'Admin Profile'
        : 'User Profile';
  const profileHeroName = resolvedProfileSection === 'store'
    ? staffProfile.storeName || user?.staffProfile?.storeName || user?.fullName
    : user?.fullName;
  const showUserProfile = resolvedProfileSection === 'user';
  const showDriverProfile = ['customer', 'driver'].includes(activeRoleKey) && resolvedProfileSection === 'driver';
  const showStaffProfile = activeRoleKey === 'staff' && resolvedProfileSection === 'store';
  const showAdminProfile = activeRoleKey === 'admin' && resolvedProfileSection === 'admin';
  const showRoleSwitcher = activeRoleKey !== 'admin';
  const visibleProfileCompletion = resolvedProfileSection === 'driver'
    ? driverReadiness
    : resolvedProfileSection === 'store'
      ? staffReadiness
      : baseProfileCompletion;

  useEffect(() => {
    if (!user) {
      return;
    }

    const targetProfilePath = getProfilePathForRole(resolvedProfileSection);

    if (location.pathname !== targetProfilePath) {
      navigate(targetProfilePath, { replace: true });
    }
  }, [location.pathname, navigate, resolvedProfileSection, user]);

  const handleRoleSwitch = async (roleKey) => {
    if (!roleKey || roleKey === activeRoleKey) {
      setIsRoleMenuOpen(false);
      return;
    }

    setMessage('');
    setError('');
    setSwitchingRole(roleKey);

    try {
      await switchRole(roleKey);
      setMessage(`Active role switched to ${roleLabel(roleKey)}`);
      setIsRoleMenuOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch role');
    } finally {
      setSwitchingRole('');
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

  return (
    <div className="dashboard-layout page-content profile-page">
      <Sidebar />
      <main className="dashboard-content">
        <section className="form-card profile-hero-card">
          <div className="profile-hero-main">
            <div className="profile-hero-identity">
              <img className="profile-hero-avatar" src={avatarSrc} alt={user?.fullName} />
              <div className="profile-hero-copy">
                <span className="profile-hero-kicker">{selectedProfileLabel}</span>
                <h2>{profileHeroName}</h2>
                <p>{user?.email}</p>
                <div className="profile-hero-meta">
                  <span className="badge badge-info">Active role: {roleLabel(user?.activeRole || 'customer')}</span>
                  <span className="badge badge-success">Primary role: {roleLabel(user?.primaryRole || user?.activeRole || 'customer')}</span>
                  <span className={getBadgeClass(getStatusTone(user?.accountStatus))}>Account: {formatStatusLabel(user?.accountStatus)}</span>
                </div>
              </div>
            </div>

            <div className="profile-hero-aside">
              <div className="profile-progress-card">
                <div className="profile-progress-header">
                  <strong>{visibleProfileCompletion}%</strong>
                  <span>profile completion</span>
                </div>
                <div className="account-progress-track">
                  <div className="account-progress-fill" style={{ width: `${visibleProfileCompletion}%` }} />
                </div>
                <p>{pendingApplicationsCount} pending role request(s) and {unreadManagedNotificationsCount} unread workflow notification(s).</p>
              </div>

              {showRoleSwitcher && (
                <div className="profile-hero-actions">
                  {showRoleSwitcher && (
                    <div className={`profile-role-switcher${isRoleMenuOpen ? ' open' : ''}`} ref={roleMenuRef}>
                      <button
                        className="btn btn-outline btn-sm profile-role-trigger"
                        type="button"
                        onClick={() => setIsRoleMenuOpen((prev) => !prev)}
                        aria-haspopup="menu"
                        aria-expanded={isRoleMenuOpen}
                        disabled={Boolean(switchingRole)}
                      >
                        <span>{switchingRole ? 'Switching...' : 'Switch Roles'}</span>
                        <span className="profile-role-trigger-icon" aria-hidden="true">v</span>
                      </button>

                      <div className="profile-role-menu" role="menu" aria-label="Available roles">
                        {switchableRoles.length > 0 ? switchableRoles.map((roleItem) => {
                          const isCurrentRole = roleItem.roleKey === activeRoleKey;
                          const isSwitchingThisRole = switchingRole === roleItem.roleKey;

                          return (
                            <button
                              key={roleItem.roleKey}
                              className={`profile-role-menu-item${isCurrentRole ? ' active' : ''}`}
                              type="button"
                              role="menuitem"
                              onClick={() => handleRoleSwitch(roleItem.roleKey)}
                              disabled={isCurrentRole || Boolean(switchingRole)}
                            >
                              <span>{roleLabel(roleItem.roleKey)}</span>
                              <small>
                                {isCurrentRole
                                  ? 'Current role'
                                  : isSwitchingThisRole
                                    ? 'Switching now...'
                                    : roleItem.isPrimary
                                      ? 'Primary role'
                                      : 'Available to switch'}
                              </small>
                            </button>
                          );
                        }) : (
                          <div className="profile-role-menu-empty">No verified roles available to switch.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {(driverApplication?.status === 'pending' || staffApplication?.status === 'pending') && (
          <div className="alert alert-info">
            A role application is waiting for admin review. Use Role Applications to review the role details and any admin feedback.
          </div>
        )}

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {showUserProfile && (
          <div id="common-profile" className="form-card profile-section-card" style={{ marginBottom: '1.5rem' }}>
            <div className="profile-section-heading">
              <div>
                <h3>User Profile</h3>
                <p>Update your main account details here.</p>
              </div>
              <label className="profile-edit-toggle">
                <input
                  type="checkbox"
                  checked={isEditMode}
                  onChange={(e) => setIsEditMode(e.target.checked)}
                />
                <span>Edit Mode</span>
              </label>
            </div>
            <form onSubmit={saveBasicProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input disabled={!isEditMode} value={profile.fullName} onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input disabled={!isEditMode} value={profile.username} onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input disabled={!isEditMode} type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input disabled={!isEditMode} value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input disabled={!isEditMode} value={profile.city} onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input disabled={!isEditMode} type="date" value={profile.dob} onChange={(e) => setProfile((prev) => ({ ...prev, dob: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Language</label>
                  <select
                    disabled={!isEditMode}
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
                    disabled={!isEditMode}
                    value={profile.emergencyContactName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input disabled={!isEditMode} value={profile.address} onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    disabled={!isEditMode}
                    value={profile.emergencyContactPhone}
                    onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    disabled={!isEditMode}
                    value={profile.emergencyContactRelationship}
                    onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bio</label>
                  <textarea disabled={!isEditMode} rows="3" value={profile.bio} onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input disabled={!isEditMode} type="password" value={profile.currentPassword} onChange={(e) => setProfile((prev) => ({ ...prev, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input disabled={!isEditMode} type="password" value={profile.password} onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))} />
                </div>
              </div>
              <div className="profile-form-actions">
                <button className="btn btn-primary" type="submit" disabled={busyAction === 'basic' || !isEditMode}>
                  {busyAction === 'basic' ? 'Saving...' : 'Save User Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {showDriverProfile && (
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
        )}

        {showStaffProfile && (
          <div id="staff-role" className="form-card profile-section-card role-onboarding-card" style={{ marginBottom: '1.5rem' }}>
            <div className="profile-section-heading">
              <div>
                <h3>Store Profile</h3>
                <p>Maintain store information, document placeholders, and the store provider request in one place.</p>
              </div>
              <span className={getBadgeClass(staffOnboardingState.tone)}>{staffOnboardingState.stateLabel}</span>
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
              <div className="profile-form-actions">
                {staffRole && (
                  <button className="btn btn-secondary" type="submit" disabled={busyAction === 'staff' || staffProfileBlocked}>
                    {busyAction === 'staff' ? 'Saving...' : 'Save Store Profile'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {showAdminProfile && adminRole && (
          <div id="admin-profile" className="form-card profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h3>Admin Profile</h3>
                <p>Update your admin account details here.</p>
              </div>
              <label className="profile-edit-toggle">
                <input
                  type="checkbox"
                  checked={isEditMode}
                  onChange={(e) => setIsEditMode(e.target.checked)}
                />
                <span>Edit Mode</span>
              </label>
            </div>
            <form onSubmit={saveBasicProfile}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input disabled={!isEditMode} value={profile.fullName} onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input disabled={!isEditMode} value={profile.username} onChange={(e) => setProfile((prev) => ({ ...prev, username: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input disabled={!isEditMode} type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input disabled={!isEditMode} value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input disabled={!isEditMode} value={profile.city} onChange={(e) => setProfile((prev) => ({ ...prev, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input disabled={!isEditMode} type="date" value={profile.dob} onChange={(e) => setProfile((prev) => ({ ...prev, dob: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Language</label>
                  <select
                    disabled={!isEditMode}
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
                    disabled={!isEditMode}
                    value={profile.emergencyContactName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input disabled={!isEditMode} value={profile.address} onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    disabled={!isEditMode}
                    value={profile.emergencyContactPhone}
                    onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    disabled={!isEditMode}
                    value={profile.emergencyContactRelationship}
                    onChange={(e) => setProfile((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bio</label>
                  <textarea disabled={!isEditMode} rows="3" value={profile.bio} onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input disabled={!isEditMode} type="password" value={profile.currentPassword} onChange={(e) => setProfile((prev) => ({ ...prev, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input disabled={!isEditMode} type="password" value={profile.password} onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))} />
                </div>
              </div>
              <div className="profile-form-actions">
                <button className="btn btn-primary" type="submit" disabled={busyAction === 'basic' || !isEditMode}>
                  {busyAction === 'basic' ? 'Saving...' : 'Save Admin Profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
