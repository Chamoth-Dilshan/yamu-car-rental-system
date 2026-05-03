export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;
export const SRI_LANKAN_OLD_NIC_PATTERN = /^\d{9}[VX]$/;
export const SRI_LANKAN_NEW_NIC_PATTERN = /^\d{12}$/;
export const SRI_LANKAN_DRIVING_LICENSE_PATTERN = /^\d{10}$/;
export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const DOCUMENT_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

export const validateRequiredText = (value, label) => (
  String(value || '').trim() ? '' : `${label} is required`
);

export const validateEmail = (value, label = 'Email') => {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return `${label} is required`;
  }

  return EMAIL_PATTERN.test(normalized) ? '' : `${label} must be a valid email address`;
};

export const validateUsername = (value, label = 'Username') => {
  const normalized = normalizeUsername(value);

  if (!normalized) {
    return `${label} is required`;
  }

  return USERNAME_PATTERN.test(normalized)
    ? ''
    : `${label} must be 3-30 characters and use only letters, numbers, underscores, dots, or hyphens`;
};

export const validateOptionalPhone = (value, label = 'Phone number') => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  return PHONE_PATTERN.test(normalized) ? '' : `${label} must be a valid phone number`;
};

export const normalizeSriLankanNic = (value) => String(value || '').trim().toUpperCase();

export const normalizeSriLankanDrivingLicenseNumber = (value) => String(value || '').trim();

const getSriLankanNicDayCode = (value) => (
  SRI_LANKAN_OLD_NIC_PATTERN.test(value)
    ? Number(value.slice(2, 5))
    : Number(value.slice(4, 7))
);

const hasValidSriLankanNicDayCode = (dayCode) => {
  const dayOfYear = dayCode > 500 ? dayCode - 500 : dayCode;
  return (
    dayOfYear >= 1
    && dayOfYear <= 366
    && (dayCode <= 366 || (dayCode >= 501 && dayCode <= 866))
  );
};

export const validateSriLankanNic = (value, label = 'NIC / ID') => {
  const normalized = normalizeSriLankanNic(value);

  if (!normalized) {
    return `${label} is required`;
  }

  if (!SRI_LANKAN_OLD_NIC_PATTERN.test(normalized) && !SRI_LANKAN_NEW_NIC_PATTERN.test(normalized)) {
    return `${label} must be a Sri Lankan NIC: 9 digits followed by V/X or 12 digits`;
  }

  if (!hasValidSriLankanNicDayCode(getSriLankanNicDayCode(normalized))) {
    return `${label} must contain a valid Sri Lankan NIC day code`;
  }

  return '';
};

export const isValidSriLankanNic = (value) => !validateSriLankanNic(value);

export const validateSriLankanDrivingLicenseNumber = (value, label = 'Driving license number') => {
  const normalized = normalizeSriLankanDrivingLicenseNumber(value);

  if (!normalized) {
    return `${label} is required`;
  }

  return SRI_LANKAN_DRIVING_LICENSE_PATTERN.test(normalized)
    ? ''
    : `${label} must be a 10-digit Sri Lankan driving licence number`;
};

export const isValidSriLankanDrivingLicenseNumber = (value) => !validateSriLankanDrivingLicenseNumber(value);

export const validateLicenseExpiryDate = (value, label = 'License expiry date') => {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return `${label} is required`;
  }

  const parsed = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(parsed.valueOf())) {
    return `${label} must be a valid date`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsed >= today ? '' : `${label} must be today or a future date`;
};

export const isValidLicenseExpiryDate = (value) => !validateLicenseExpiryDate(value);

export const validatePasswordStrength = (value) => {
  const password = String(value || '');

  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number';
  }

  return '';
};

export const validateProfileImage = (file) => {
  if (!file) {
    return '';
  }

  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    return 'Profile image must be a JPG, PNG, GIF, or WebP file';
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    return 'Profile image must be 5 MB or smaller';
  }

  return '';
};

export const validateDocumentFile = (file, label = 'Document') => {
  if (!file) {
    return '';
  }

  if (!DOCUMENT_FILE_TYPES.includes(file.type)) {
    return `${label} must be a JPG, PNG, WebP, or PDF file`;
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE) {
    return `${label} must be 10 MB or smaller`;
  }

  return '';
};

export const hasDocumentMetadata = (document = {}) => Boolean(
  String(document?.fileName || '').trim()
  || String(document?.filePath || document?.reference || '').trim()
);
