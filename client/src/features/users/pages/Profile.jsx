import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../../../api/axios';
import { buildUploadUrl } from '../../../api/config';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../../../components/layout/Sidebar';
import { formatDateTime } from '../../../utils/formatters';
import { isRoleManagementNotification } from '../../../utils/notifications';
import { buildLatestProviderApplicationMap } from '../../../utils/providerApplications';
import { openProtectedFile } from '../../../utils/protectedFiles';
import { formatRoleLabel, getProfilePathForRole } from '../../../utils/roles';
import {
  hasDocumentMetadata,
  isValidLicenseExpiryDate,
  isValidSriLankanDrivingLicenseNumber,
  isValidSriLankanNic,
  validateDocumentFile,
  validateEmail,
  validateLicenseExpiryDate,
  validateOptionalPhone,
  validatePasswordStrength,
  validateProfileImage,
  validateRequiredText,
  validateSriLankanDrivingLicenseNumber,
  validateSriLankanNic,
  validateUsername
} from '../../../utils/validation';

const blockedProfileStatuses = ['rejected', 'suspended', 'deactivated'];
const blockedApplicationStatuses = ['suspended', 'deactivated'];
const providerDocumentAccept = 'image/jpeg,image/png,image/webp,application/pdf';

const roleLabel = (value) => formatRoleLabel(value);
const createDocumentDraft = (document = {}) => ({
  fileName: document?.fileName || '',
  filePath: document?.filePath || document?.reference || '',
  mimeType: document?.mimeType || '',
  size: document?.size || 0,
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
const providerApplicationRequirements = {
  driver: {
    fields: [
      ['drivingLicenseNumber', 'Driving license number'],
      ['licenseExpiryDate', 'License expiry date'],
      ['nicId', 'NIC / ID'],
      ['serviceArea', 'Service area']
    ],
    documents: [
      ['nicDocument', 'NIC / ID document'],
      ['drivingLicenseDocument', 'Driving license document'],
      ['proofOfAddressDocument', 'Proof of address document']
    ]
  },
  staff: {
    fields: [
      ['storeName', 'Store name'],
      ['businessRegistrationNumber', 'Business registration number'],
      ['storeAddress', 'Store address'],
      ['storeContactNumber', 'Store contact number'],
      ['storeEmail', 'Store email']
    ],
    documents: [
      ['businessRegistrationDocument', 'Business registration document'],
      ['proofOfAddressDocument', 'Proof of address document']
    ]
  }
};
const canUseAssignedRole = (role = null) => role?.roleStatus === 'active' && role?.verificationStatus === 'verified';
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
    password: '',
    confirmPassword: ''
  });
  const [profileImage, setProfileImage] = useState(null);
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
  const [driverDocumentFiles, setDriverDocumentFiles] = useState({});
  const [staffDocumentFiles, setStaffDocumentFiles] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [providerErrors, setProviderErrors] = useState({ driver: {}, staff: {} });
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
    buildLatestProviderApplicationMap(user?.providerApplications || [])
  ), [user?.providerApplications]);

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
      password: '',
      confirmPassword: ''
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
    setDriverDocumentFiles({});
    setStaffDocumentFiles({});
    setProfileErrors({});
    setProviderErrors({ driver: {}, staff: {} });
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
  const hasUsableCustomerRole = canUseAssignedRole(customerRole);

  const clearProfileFieldError = (field) => {
    setProfileErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearProviderFieldError = (roleKey, field) => {
    setProviderErrors((current) => {
      if (!current[roleKey]?.[field]) {
        return current;
      }

      const nextRoleErrors = { ...current[roleKey] };
      delete nextRoleErrors[field];
      return { ...current, [roleKey]: nextRoleErrors };
    });
  };

  const updateProfileField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    clearProfileFieldError(field);

    if (field === 'password') {
      clearProfileFieldError('confirmPassword');
    }
  };

  const updateDriverProfileField = (field, value) => {
    setDriverProfile((prev) => ({ ...prev, [field]: value }));
    clearProviderFieldError('driver', field);
  };

  const updateStaffProfileField = (field, value) => {
    setStaffProfile((prev) => ({ ...prev, [field]: value }));
    clearProviderFieldError('staff', field);
  };

  const renderProfileFieldError = (field) => (
    profileErrors[field] ? <small className="field-error">{profileErrors[field]}</small> : null
  );

  const renderProviderFieldError = (roleKey, field) => (
    providerErrors[roleKey]?.[field] ? <small className="field-error">{providerErrors[roleKey][field]}</small> : null
  );

  const getInvalidFieldClass = (hasError) => (hasError ? 'field-invalid' : undefined);

  const validateBasicProfileForm = () => {
    const nextErrors = {};
    const passwordFieldsTouched = Boolean(profile.password || profile.currentPassword || profile.confirmPassword);
    const fullNameError = validateRequiredText(profile.fullName, 'Full name');
    const usernameError = validateUsername(profile.username);
    const emailError = validateEmail(profile.email);
    const phoneError = validateOptionalPhone(profile.phone);
    const emergencyContactPhoneError = validateOptionalPhone(profile.emergencyContactPhone, 'Emergency contact phone');
    const profileImageError = validateProfileImage(profileImage);

    if (fullNameError) {
      nextErrors.fullName = fullNameError;
    }

    if (usernameError) {
      nextErrors.username = usernameError;
    }

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (phoneError) {
      nextErrors.phone = phoneError;
    }

    if (emergencyContactPhoneError) {
      nextErrors.emergencyContactPhone = emergencyContactPhoneError;
    }

    if (profileImageError) {
      nextErrors.profileImage = profileImageError;
    }

    if (passwordFieldsTouched) {
      const passwordRequiredError = validateRequiredText(profile.password, 'New password');
      const passwordStrengthError = passwordRequiredError ? '' : validatePasswordStrength(profile.password);
      const currentPasswordError = validateRequiredText(profile.currentPassword, 'Current password');
      const confirmPasswordError = validateRequiredText(profile.confirmPassword, 'Confirm password');

      if (passwordRequiredError || passwordStrengthError) {
        nextErrors.password = passwordRequiredError || passwordStrengthError;
      }

      if (currentPasswordError) {
        nextErrors.currentPassword = currentPasswordError;
      }

      if (confirmPasswordError) {
        nextErrors.confirmPassword = confirmPasswordError;
      } else if (profile.password !== profile.confirmPassword) {
        nextErrors.confirmPassword = 'Passwords do not match';
      }
    }

    return nextErrors;
  };

  const validateProviderApplicationForm = (roleKey, payload) => {
    const nextErrors = {};
    const config = providerApplicationRequirements[roleKey] || { fields: [], documents: [] };

    config.fields.forEach(([key, label]) => {
      if (!String(payload?.[key] || '').trim()) {
        nextErrors[key] = `${label} is required`;
      }
    });

    if (roleKey === 'driver') {
      const drivingLicenseError = validateSriLankanDrivingLicenseNumber(payload.drivingLicenseNumber);
      const licenseExpiryError = validateLicenseExpiryDate(payload.licenseExpiryDate);
      const nicError = validateSriLankanNic(payload.nicId);

      if (drivingLicenseError) {
        nextErrors.drivingLicenseNumber = drivingLicenseError;
      }

      if (licenseExpiryError) {
        nextErrors.licenseExpiryDate = licenseExpiryError;
      }

      if (nicError) {
        nextErrors.nicId = nicError;
      }
    }

    if (roleKey === 'staff') {
      const storeEmailError = validateEmail(payload.storeEmail, 'Store email');
      if (storeEmailError && !nextErrors.storeEmail) {
        nextErrors.storeEmail = storeEmailError;
      }
    }

    config.documents.forEach(([key, label]) => {
      if (!hasDocumentMetadata(payload?.documents?.[key] || {})) {
        nextErrors[key] = `${label} metadata is required`;
      }
    });

    return nextErrors;
  };

  const saveBasicProfile = async (event) => {
    event.preventDefault();
    const validationErrors = validateBasicProfileForm();

    if (Object.keys(validationErrors).length) {
      setMessage('');
      setError('');
      setProfileErrors(validationErrors);
      return;
    }

    setBusyAction('basic');
    setMessage('');
    setError('');
    setProfileErrors({});

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

        if (key === 'confirmPassword') {
          if (profile.password && value) {
            formData.append(key, value);
          }
          return;
        }

        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      if (profileImage) {
        formData.append('profilePic', profileImage);
      }

      const res = await API.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      setProfile((prev) => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));
      setProfileImage(null);
      setIsEditMode(false);
      setMessage('User profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setBusyAction('');
    }
  };

  const getProviderDocumentFiles = (roleKey) => (
    roleKey === 'driver' ? driverDocumentFiles : staffDocumentFiles
  );

  const clearProviderDocumentFiles = (roleKey) => {
    if (roleKey === 'driver') {
      setDriverDocumentFiles({});
      return;
    }

    setStaffDocumentFiles({});
  };

  const buildProviderFormData = (payload, files) => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    Object.entries(files || {}).forEach(([documentKey, file]) => {
      if (file) {
        formData.append(documentKey, file);
      }
    });

    return formData;
  };

  const saveRoleProfile = async (endpoint, payload, successMessage, actionKey) => {
    const validationErrors = validateProviderApplicationForm(actionKey, payload);

    if (Object.keys(validationErrors).length) {
      setMessage('');
      setError('');
      setProviderErrors((current) => ({ ...current, [actionKey]: validationErrors }));
      return;
    }

    setBusyAction(actionKey);
    setMessage('');
    setError('');
    setProviderErrors((current) => ({ ...current, [actionKey]: {} }));

    try {
      const res = await API.put(endpoint, buildProviderFormData(payload, getProviderDocumentFiles(actionKey)), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      clearProviderDocumentFiles(actionKey);
      setMessage(successMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setBusyAction('');
    }
  };

  const submitProviderApplication = async (roleKey, payload) => {
    const validationErrors = validateProviderApplicationForm(roleKey, payload);

    if (Object.keys(validationErrors).length) {
      setMessage('');
      setError('');
      setProviderErrors((current) => ({ ...current, [roleKey]: validationErrors }));
      return;
    }

    setBusyAction(`apply-${roleKey}`);
    setMessage('');
    setError('');
    setProviderErrors((current) => ({ ...current, [roleKey]: {} }));

    try {
      const res = await API.post(`/users/applications/${roleKey}`, buildProviderFormData(payload, getProviderDocumentFiles(roleKey)), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      clearProviderDocumentFiles(roleKey);
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
    isValidSriLankanDrivingLicenseNumber(driverProfile.drivingLicenseNumber),
    isValidLicenseExpiryDate(driverProfile.licenseExpiryDate),
    isValidSriLankanNic(driverProfile.nicId),
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
  const rawPathSection = location.pathname.startsWith('/profile/')
    ? location.pathname.split('/')[2] || ''
    : '';
  const pathSection = rawPathSection === 'driverapplication' ? 'driver' : rawPathSection;
  const selectedProfileSection = ['user', 'driver', 'store', 'admin'].includes(pathSection)
    ? pathSection
    : defaultProfileSection;
  const profileTabs = [
    ...(activeRoleKey === 'customer' ? [{ key: 'user', to: '/profile/user', label: 'User Profile' }] : []),
    ...(['customer', 'driver'].includes(activeRoleKey) ? [{ key: 'driver', to: '/profile/driverapplication', label: 'Driver Application' }] : []),
    ...(activeRoleKey === 'staff' || hasUsableCustomerRole ? [{ key: 'store', to: '/profile/store', label: 'Store Profile' }] : []),
    ...(activeRoleKey === 'admin' ? [{ key: 'admin', to: '/profile/admin', label: 'Admin Profile' }] : [])
  ];
  const availableProfileSections = profileTabs.map((tab) => tab.key);
  const resolvedProfileSection = availableProfileSections.includes(selectedProfileSection)
    ? selectedProfileSection
    : defaultProfileSection;
  const selectedProfileLabel = resolvedProfileSection === 'driver'
    ? 'Driver Application'
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
  const showStaffProfile = (activeRoleKey === 'staff' || hasUsableCustomerRole) && resolvedProfileSection === 'store';
  const showAdminProfile = activeRoleKey === 'admin' && resolvedProfileSection === 'admin';
  const showProfileHero = resolvedProfileSection !== 'driver';
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

  const updateDriverDocumentDraft = (documentKey, updates) => {
    setDriverProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: {
          ...prev.documents[documentKey],
          ...updates
        }
      }
    }));
  };

  const updateStaffDocumentDraft = (documentKey, updates) => {
    setStaffProfile((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentKey]: {
          ...prev.documents[documentKey],
          ...updates
        }
      }
    }));
  };

  const getSelectedFileMetadata = (file) => ({
    fileName: file.name,
    filePath: '',
    mimeType: file.type,
    size: file.size,
    status: 'uploaded',
    rejectionReason: '',
    reviewedAt: null,
    uploadedAt: new Date().toISOString()
  });

  const handleProviderDocumentChange = (roleKey, documentKey, label, event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      return;
    }

    const validationError = validateDocumentFile(file, label);
    if (validationError) {
      event.target.value = '';
      setMessage('');
      setError('');
      setProviderErrors((current) => ({
        ...current,
        [roleKey]: {
          ...(current[roleKey] || {}),
          [documentKey]: validationError
        }
      }));
      return;
    }

    if (roleKey === 'driver') {
      setDriverDocumentFiles((prev) => ({ ...prev, [documentKey]: file }));
      updateDriverDocumentDraft(documentKey, getSelectedFileMetadata(file));
    } else {
      setStaffDocumentFiles((prev) => ({ ...prev, [documentKey]: file }));
      updateStaffDocumentDraft(documentKey, getSelectedFileMetadata(file));
    }

    setError('');
    clearProviderFieldError(roleKey, documentKey);
  };

  const hasProtectedDocumentFile = (document = {}) => Boolean(
    document?.filePath && !/^\/?uploads\//i.test(document.filePath)
  );

  const viewProviderDocument = async (roleKey, documentKey) => {
    setMessage('');
    setError('');

    try {
      await openProtectedFile(`/users/documents/${roleKey}/${documentKey}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open document');
    }
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    const validationError = validateProfileImage(file);

    if (validationError) {
      event.target.value = '';
      setProfileImage(null);
      setMessage('');
      setError('');
      setProfileErrors((current) => ({ ...current, profileImage: validationError }));
      return;
    }

    setProfileImage(file);
    setError('');
    clearProfileFieldError('profileImage');
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

  const renderDocumentUpload = ({ roleKey, documentKey, label, document, selectedFile }) => (
    <div className="provider-document-upload">
      <div className="provider-document-upload-main">
        <div className="form-group">
          <label>{label}</label>
          <input
            className={getInvalidFieldClass(providerErrors[roleKey]?.[documentKey])}
            type="file"
            accept={providerDocumentAccept}
            onChange={(event) => handleProviderDocumentChange(roleKey, documentKey, label, event)}
          />
          {renderProviderFieldError(roleKey, documentKey)}
        </div>
        <div className="provider-document-current">
          <strong>{selectedFile?.name || document?.fileName || 'No file selected'}</strong>
          {document?.filePath && (
            <span>
              {hasProtectedDocumentFile(document) ? 'Stored file available' : `Legacy reference: ${document.filePath}`}
            </span>
          )}
        </div>
      </div>
      <div className="pill-row">
        {hasProtectedDocumentFile(document) && (
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => viewProviderDocument(roleKey, documentKey)}
          >
            View File
          </button>
        )}
      </div>
      {renderDocumentMeta(document)}
    </div>
  );

  return (
    <div className="dashboard-layout page-content profile-page">
      <Sidebar />
      <main className="dashboard-content">
        {showProfileHero && (
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
        )}

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
                  <input
                    className={getInvalidFieldClass(profileErrors.fullName)}
                    disabled={!isEditMode}
                    value={profile.fullName}
                    onChange={(e) => updateProfileField('fullName', e.target.value)}
                  />
                  {renderProfileFieldError('fullName')}
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.username)}
                    disabled={!isEditMode}
                    value={profile.username}
                    onChange={(e) => updateProfileField('username', e.target.value)}
                  />
                  {renderProfileFieldError('username')}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.email)}
                    disabled={!isEditMode}
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfileField('email', e.target.value)}
                  />
                  {renderProfileFieldError('email')}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.phone)}
                    disabled={!isEditMode}
                    value={profile.phone}
                    onChange={(e) => updateProfileField('phone', e.target.value)}
                  />
                  {renderProfileFieldError('phone')}
                </div>
              </div>
              <div className="form-group">
                <label>Profile Image</label>
                <input
                  className={getInvalidFieldClass(profileErrors.profileImage)}
                  disabled={!isEditMode}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleProfileImageChange}
                />
                {renderProfileFieldError('profileImage')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input disabled={!isEditMode} value={profile.city} onChange={(e) => updateProfileField('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input disabled={!isEditMode} type="date" value={profile.dob} onChange={(e) => updateProfileField('dob', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Language</label>
                  <select
                    disabled={!isEditMode}
                    value={profile.preferredLanguage}
                    onChange={(e) => updateProfileField('preferredLanguage', e.target.value)}
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
                    onChange={(e) => updateProfileField('emergencyContactName', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input disabled={!isEditMode} value={profile.address} onChange={(e) => updateProfileField('address', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.emergencyContactPhone)}
                    disabled={!isEditMode}
                    value={profile.emergencyContactPhone}
                    onChange={(e) => updateProfileField('emergencyContactPhone', e.target.value)}
                  />
                  {renderProfileFieldError('emergencyContactPhone')}
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    disabled={!isEditMode}
                    value={profile.emergencyContactRelationship}
                    onChange={(e) => updateProfileField('emergencyContactRelationship', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bio</label>
                  <textarea disabled={!isEditMode} rows="3" value={profile.bio} onChange={(e) => updateProfileField('bio', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.currentPassword)}
                    disabled={!isEditMode}
                    type="password"
                    value={profile.currentPassword}
                    onChange={(e) => updateProfileField('currentPassword', e.target.value)}
                  />
                  {renderProfileFieldError('currentPassword')}
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.password)}
                    disabled={!isEditMode}
                    type="password"
                    minLength={8}
                    value={profile.password}
                    onChange={(e) => updateProfileField('password', e.target.value)}
                  />
                  {renderProfileFieldError('password')}
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.confirmPassword)}
                    disabled={!isEditMode}
                    type="password"
                    value={profile.confirmPassword}
                    onChange={(e) => updateProfileField('confirmPassword', e.target.value)}
                  />
                  {renderProfileFieldError('confirmPassword')}
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
                <h3>Driver Application</h3>
                <p>Maintain driver details, review application state, and manage the next action from one card.</p>
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
              saveRoleProfile('/users/driver-profile', driverProfile, 'Driver application updated successfully', 'driver');
            }}
            >
              <div className="form-row">
                <div className="form-group">
                  <label>Driving License Number</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.driver?.drivingLicenseNumber)}
                    inputMode="numeric"
                    maxLength="10"
                    placeholder="e.g. 2000096271"
                    value={driverProfile.drivingLicenseNumber}
                    onChange={(e) => updateDriverProfileField('drivingLicenseNumber', e.target.value)}
                  />
                  {renderProviderFieldError('driver', 'drivingLicenseNumber')}
                </div>
                <div className="form-group">
                  <label>License Expiry Date</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.driver?.licenseExpiryDate)}
                    type="date"
                    value={driverProfile.licenseExpiryDate}
                    onChange={(e) => updateDriverProfileField('licenseExpiryDate', e.target.value)}
                  />
                  {renderProviderFieldError('driver', 'licenseExpiryDate')}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>NIC / ID</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.driver?.nicId)}
                    autoCapitalize="characters"
                    maxLength="12"
                    placeholder="e.g. 901234567V or 199012345678"
                    value={driverProfile.nicId}
                    onChange={(e) => updateDriverProfileField('nicId', e.target.value)}
                  />
                  {renderProviderFieldError('driver', 'nicId')}
                </div>
                <div className="form-group">
                  <label>Service Area</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.driver?.serviceArea)}
                    value={driverProfile.serviceArea}
                    onChange={(e) => updateDriverProfileField('serviceArea', e.target.value)}
                  />
                  {renderProviderFieldError('driver', 'serviceArea')}
                </div>
              </div>
              <div className="form-group">
                <label>Provider Onboarding Details</label>
                <textarea rows="3" value={driverProfile.providerDetails} onChange={(e) => updateDriverProfileField('providerDetails', e.target.value)} />
              </div>
              <div className="form-header" style={{ marginTop: '1rem' }}>
                <h3>Verification Documents</h3>
              </div>
              <div className="provider-document-stack">
                {renderDocumentUpload({
                  roleKey: 'driver',
                  documentKey: 'nicDocument',
                  label: 'NIC / ID Document',
                  document: driverProfile.documents.nicDocument,
                  selectedFile: driverDocumentFiles.nicDocument
                })}
                {renderDocumentUpload({
                  roleKey: 'driver',
                  documentKey: 'drivingLicenseDocument',
                  label: 'Driving License Document',
                  document: driverProfile.documents.drivingLicenseDocument,
                  selectedFile: driverDocumentFiles.drivingLicenseDocument
                })}
                {renderDocumentUpload({
                  roleKey: 'driver',
                  documentKey: 'proofOfAddressDocument',
                  label: 'Proof of Address Document',
                  document: driverProfile.documents.proofOfAddressDocument,
                  selectedFile: driverDocumentFiles.proofOfAddressDocument
                })}
              </div>
              <div className="profile-form-actions">
                {driverRole && (
                  <button className="btn btn-secondary" type="submit" disabled={busyAction === 'driver' || driverProfileBlocked}>
                    {busyAction === 'driver' ? 'Saving...' : 'Save Driver Application'}
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
                        ? 'Re-submit Driver Application'
                        : driverRole?.roleStatus === 'active' && driverRole?.verificationStatus === 'verified'
                          ? 'Driver Role Approved'
                          : 'Submit Driver Application'}
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
                  <input
                    className={getInvalidFieldClass(providerErrors.staff?.storeName)}
                    value={staffProfile.storeName}
                    onChange={(e) => updateStaffProfileField('storeName', e.target.value)}
                  />
                  {renderProviderFieldError('staff', 'storeName')}
                </div>
                <div className="form-group">
                  <label>Store Owner</label>
                  <input value={staffProfile.storeOwner} onChange={(e) => updateStaffProfileField('storeOwner', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Business Registration Number</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.staff?.businessRegistrationNumber)}
                    value={staffProfile.businessRegistrationNumber}
                    onChange={(e) => updateStaffProfileField('businessRegistrationNumber', e.target.value)}
                  />
                  {renderProviderFieldError('staff', 'businessRegistrationNumber')}
                </div>
                <div className="form-group">
                  <label>Store Contact Number</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.staff?.storeContactNumber)}
                    value={staffProfile.storeContactNumber}
                    onChange={(e) => updateStaffProfileField('storeContactNumber', e.target.value)}
                  />
                  {renderProviderFieldError('staff', 'storeContactNumber')}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Store Email</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.staff?.storeEmail)}
                    type="email"
                    value={staffProfile.storeEmail}
                    onChange={(e) => updateStaffProfileField('storeEmail', e.target.value)}
                  />
                  {renderProviderFieldError('staff', 'storeEmail')}
                </div>
                <div className="form-group">
                  <label>Store Address</label>
                  <input
                    className={getInvalidFieldClass(providerErrors.staff?.storeAddress)}
                    value={staffProfile.storeAddress}
                    onChange={(e) => updateStaffProfileField('storeAddress', e.target.value)}
                  />
                  {renderProviderFieldError('staff', 'storeAddress')}
                </div>
              </div>
              <div className="form-header" style={{ marginTop: '1rem' }}>
                <h3>Verification Documents</h3>
              </div>
              <div className="provider-document-stack">
                {renderDocumentUpload({
                  roleKey: 'staff',
                  documentKey: 'businessRegistrationDocument',
                  label: 'Business Registration Document',
                  document: staffProfile.documents.businessRegistrationDocument,
                  selectedFile: staffDocumentFiles.businessRegistrationDocument
                })}
                {renderDocumentUpload({
                  roleKey: 'staff',
                  documentKey: 'proofOfAddressDocument',
                  label: 'Proof of Address Document',
                  document: staffProfile.documents.proofOfAddressDocument,
                  selectedFile: staffDocumentFiles.proofOfAddressDocument
                })}
              </div>
              <div className="profile-form-actions">
                {staffRole && (
                  <button className="btn btn-secondary" type="submit" disabled={busyAction === 'staff' || staffProfileBlocked}>
                    {busyAction === 'staff' ? 'Saving...' : 'Save Store Profile'}
                  </button>
                )}
              </div>
            </form>
            {hasUsableCustomerRole && !staffApplicationBlocked && (
              <div className="profile-form-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={
                    busyAction === 'apply-staff'
                    || staffApplication?.status === 'pending'
                    || canUseAssignedRole(staffRole)
                  }
                  onClick={() => submitProviderApplication('staff', staffProfile)}
                >
                  {busyAction === 'apply-staff'
                    ? 'Submitting...'
                    : staffApplication?.status === 'pending'
                      ? 'Store Application Pending'
                      : staffApplication?.status === 'rejected'
                        ? 'Re-apply for Store Role'
                        : canUseAssignedRole(staffRole)
                          ? 'Store Role Approved'
                          : 'Apply for Store Role'}
                </button>
              </div>
            )}
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
                  <input
                    className={getInvalidFieldClass(profileErrors.fullName)}
                    disabled={!isEditMode}
                    value={profile.fullName}
                    onChange={(e) => updateProfileField('fullName', e.target.value)}
                  />
                  {renderProfileFieldError('fullName')}
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.username)}
                    disabled={!isEditMode}
                    value={profile.username}
                    onChange={(e) => updateProfileField('username', e.target.value)}
                  />
                  {renderProfileFieldError('username')}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.email)}
                    disabled={!isEditMode}
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfileField('email', e.target.value)}
                  />
                  {renderProfileFieldError('email')}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.phone)}
                    disabled={!isEditMode}
                    value={profile.phone}
                    onChange={(e) => updateProfileField('phone', e.target.value)}
                  />
                  {renderProfileFieldError('phone')}
                </div>
              </div>
              <div className="form-group">
                <label>Profile Image</label>
                <input
                  className={getInvalidFieldClass(profileErrors.profileImage)}
                  disabled={!isEditMode}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleProfileImageChange}
                />
                {renderProfileFieldError('profileImage')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input disabled={!isEditMode} value={profile.city} onChange={(e) => updateProfileField('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input disabled={!isEditMode} type="date" value={profile.dob} onChange={(e) => updateProfileField('dob', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Language</label>
                  <select
                    disabled={!isEditMode}
                    value={profile.preferredLanguage}
                    onChange={(e) => updateProfileField('preferredLanguage', e.target.value)}
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
                    onChange={(e) => updateProfileField('emergencyContactName', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input disabled={!isEditMode} value={profile.address} onChange={(e) => updateProfileField('address', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.emergencyContactPhone)}
                    disabled={!isEditMode}
                    value={profile.emergencyContactPhone}
                    onChange={(e) => updateProfileField('emergencyContactPhone', e.target.value)}
                  />
                  {renderProfileFieldError('emergencyContactPhone')}
                </div>
                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    disabled={!isEditMode}
                    value={profile.emergencyContactRelationship}
                    onChange={(e) => updateProfileField('emergencyContactRelationship', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bio</label>
                  <textarea disabled={!isEditMode} rows="3" value={profile.bio} onChange={(e) => updateProfileField('bio', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.currentPassword)}
                    disabled={!isEditMode}
                    type="password"
                    value={profile.currentPassword}
                    onChange={(e) => updateProfileField('currentPassword', e.target.value)}
                  />
                  {renderProfileFieldError('currentPassword')}
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.password)}
                    disabled={!isEditMode}
                    type="password"
                    minLength={8}
                    value={profile.password}
                    onChange={(e) => updateProfileField('password', e.target.value)}
                  />
                  {renderProfileFieldError('password')}
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    className={getInvalidFieldClass(profileErrors.confirmPassword)}
                    disabled={!isEditMode}
                    type="password"
                    value={profile.confirmPassword}
                    onChange={(e) => updateProfileField('confirmPassword', e.target.value)}
                  />
                  {renderProfileFieldError('confirmPassword')}
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
