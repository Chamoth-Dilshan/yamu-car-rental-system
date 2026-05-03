export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;
export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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

export const hasDocumentMetadata = (document = {}) => Boolean(
  String(document?.fileName || '').trim()
  || String(document?.filePath || document?.reference || '').trim()
);
