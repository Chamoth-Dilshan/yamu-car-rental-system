const SUPPORTED_LANGUAGES = ['English', 'Sinhala', 'Tamil'];
const DOCUMENT_STATUSES = [
  'not_uploaded',
  'uploaded',
  'pending',
  'approved',
  'rejected',
  'not_provided',
  'submitted',
  'verified'
];
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;
const PHONE_REGEX = /^\+?[\d\s().-]{7,20}$/;

const trimValue = (value, fallback = '') => (
  typeof value === 'string' ? value.trim() : (value ?? fallback)
);

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

const normalizePreferredLanguage = (value, fallback = 'English') => {
  const nextValue = trimValue(value, fallback) || fallback;
  return SUPPORTED_LANGUAGES.includes(nextValue) ? nextValue : fallback;
};

const normalizeEmergencyContact = (input = {}) => ({
  name: trimValue(input.name),
  phone: trimValue(input.phone),
  relationship: trimValue(input.relationship)
});

const validatePasswordStrength = (password) => {
  const value = String(password || '');

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Password must include at least one letter and one number';
  }

  return null;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const validateEmailAddress = (value, { label = 'Email', required = true } = {}) => {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return required
      ? { value: normalized, error: `${label} is required` }
      : { value: normalized, error: null };
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return { value: normalized, error: `${label} must be a valid email address` };
  }

  return { value: normalized, error: null };
};

const validateUsernameValue = (value, { label = 'Username', required = true } = {}) => {
  const normalized = normalizeUsername(value);

  if (!normalized) {
    return required
      ? { value: normalized, error: `${label} is required` }
      : { value: normalized, error: null };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      value: normalized,
      error: `${label} must be 3-30 characters and use only letters, numbers, underscores, dots, or hyphens`
    };
  }

  return { value: normalized, error: null };
};

const validateOptionalPhone = (value, { label = 'Phone number' } = {}) => {
  const normalized = trimValue(value, '');

  if (!normalized) {
    return { value: normalized, error: null };
  }

  if (!PHONE_REGEX.test(normalized)) {
    return { value: normalized, error: `${label} must be a valid phone number` };
  }

  return { value: normalized, error: null };
};

const hasDocumentFile = (input = {}) => Boolean(
  trimValue(input.filePath, '')
  || trimValue(input.reference, '')
  || trimValue(input.fileName, '')
  || trimValue(input.originalName, '')
);

const normalizeDocumentStatus = (status, hasFile = false) => {
  const value = trimValue(status, '');

  if (value === 'not_provided') {
    return 'not_uploaded';
  }

  if (value === 'submitted') {
    return 'uploaded';
  }

  if (value === 'verified') {
    return 'approved';
  }

  if (['not_uploaded', 'uploaded', 'pending', 'approved', 'rejected'].includes(value)) {
    return value;
  }

  return hasFile ? 'uploaded' : 'not_uploaded';
};

const buildDocumentMetadata = (input = {}, current = {}) => {
  const currentFileName = trimValue(current.fileName, current.originalName || '');
  const currentFilePath = trimValue(current.filePath, current.reference || '');
  const fileName = trimValue(input.fileName, currentFileName);
  const filePath = trimValue(input.filePath, input.reference || currentFilePath);
  const mimeType = trimValue(input.mimeType, current.mimeType || '');
  const size = Number(input.size ?? current.size ?? 0) || 0;
  const hasCurrentFile = hasDocumentFile(current);
  const hasNextFile = Boolean(fileName || filePath);
  const currentStatus = normalizeDocumentStatus(current.status, hasCurrentFile);
  const statusFromInput = input.status !== undefined
    ? normalizeDocumentStatus(input.status, hasNextFile)
    : '';
  const fileChanged = fileName !== currentFileName || filePath !== currentFilePath;
  let status = statusFromInput || currentStatus;

  if (!hasNextFile) {
    status = 'not_uploaded';
  } else if (fileChanged) {
    status = 'uploaded';
  }

  const uploadedAt = input.uploadedAt !== undefined
    ? parseDate(input.uploadedAt)
    : (fileChanged
      ? (hasNextFile ? new Date() : null)
      : (current.uploadedAt || (hasNextFile ? new Date() : null)));
  const reviewedAt = fileChanged
    ? null
    : (input.reviewedAt !== undefined ? parseDate(input.reviewedAt) : (current.reviewedAt || null));
  const rejectionReason = status === 'rejected' && !fileChanged
    ? trimValue(input.rejectionReason, current.rejectionReason || '')
    : '';

  return {
    fileName,
    filePath,
    reference: filePath,
    mimeType,
    size,
    status,
    rejectionReason,
    uploadedAt,
    reviewedAt
  };
};

const normalizeDocumentMetadata = (input = {}) => buildDocumentMetadata({}, input);

const normalizeDriverDocuments = (documents = {}) => ({
  nicDocument: normalizeDocumentMetadata(documents.nicDocument || {}),
  drivingLicenseDocument: normalizeDocumentMetadata(documents.drivingLicenseDocument || documents.licenseProof || {}),
  proofOfAddressDocument: normalizeDocumentMetadata(documents.proofOfAddressDocument || {})
});

const normalizeStaffDocuments = (documents = {}) => ({
  businessRegistrationDocument: normalizeDocumentMetadata(documents.businessRegistrationDocument || documents.businessRegistrationProof || {}),
  proofOfAddressDocument: normalizeDocumentMetadata(documents.proofOfAddressDocument || {})
});

const mergeDriverDocuments = (payload = {}, current = {}) => {
  const currentDocuments = normalizeDriverDocuments(current);

  return {
    nicDocument: buildDocumentMetadata(payload.nicDocument || {}, currentDocuments.nicDocument),
    drivingLicenseDocument: buildDocumentMetadata(
      payload.drivingLicenseDocument || payload.licenseProof || {},
      currentDocuments.drivingLicenseDocument
    ),
    proofOfAddressDocument: buildDocumentMetadata(
      payload.proofOfAddressDocument || {},
      currentDocuments.proofOfAddressDocument
    )
  };
};

const mergeStaffDocuments = (payload = {}, current = {}) => {
  const currentDocuments = normalizeStaffDocuments(current);

  return {
    businessRegistrationDocument: buildDocumentMetadata(
      payload.businessRegistrationDocument || payload.businessRegistrationProof || {},
      currentDocuments.businessRegistrationDocument
    ),
    proofOfAddressDocument: buildDocumentMetadata(
      payload.proofOfAddressDocument || {},
      currentDocuments.proofOfAddressDocument
    )
  };
};

const setDocumentCollectionStatus = (documents = {}, documentKeys = [], { status, rejectionReason = '', reviewedAt = null } = {}) => {
  const nextDocuments = { ...documents };

  documentKeys.forEach((documentKey) => {
    const currentDocument = normalizeDocumentMetadata(documents?.[documentKey] || {});

    if (!hasDocumentFile(currentDocument)) {
      nextDocuments[documentKey] = currentDocument;
      return;
    }

    nextDocuments[documentKey] = {
      ...currentDocument,
      status: normalizeDocumentStatus(status, true),
      rejectionReason: status === 'rejected' ? trimValue(rejectionReason, '') : '',
      reviewedAt: ['approved', 'rejected'].includes(status) ? (reviewedAt || new Date()) : null
    };
  });

  return nextDocuments;
};

const isFilled = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => isFilled(item));
  }

  return Boolean(trimValue(value));
};

const validateRequiredTextFields = (checks = []) => {
  const missingField = checks.find(([, value]) => !trimValue(value, ''));
  return missingField ? missingField[0] : '';
};

const computeProfileCompletion = (user = {}) => {
  const checkpoints = [
    ['fullName', user.fullName],
    ['email', user.email],
    ['phone', user.phone],
    ['address', user.address],
    ['city', user.city],
    ['preferredLanguage', user.preferredLanguage],
    ['emergencyContact.name', user.emergencyContact?.name],
    ['emergencyContact.phone', user.emergencyContact?.phone]
  ];

  const completed = checkpoints.filter(([, value]) => isFilled(value));
  const percent = Math.round((completed.length / checkpoints.length) * 100);

  return {
    completed: completed.length,
    total: checkpoints.length,
    percent,
    missingFields: checkpoints
      .filter(([, value]) => !isFilled(value))
      .map(([field]) => field),
    status: percent === 100 ? 'complete' : percent >= 60 ? 'in_progress' : 'starter'
  };
};

module.exports = {
  SUPPORTED_LANGUAGES,
  DOCUMENT_STATUSES,
  MIN_PASSWORD_LENGTH,
  EMAIL_REGEX,
  USERNAME_REGEX,
  PHONE_REGEX,
  trimValue,
  parseDate,
  normalizePreferredLanguage,
  normalizeEmergencyContact,
  validatePasswordStrength,
  normalizeEmail,
  normalizeUsername,
  validateEmailAddress,
  validateUsernameValue,
  validateOptionalPhone,
  hasDocumentFile,
  normalizeDocumentStatus,
  buildDocumentMetadata,
  normalizeDocumentMetadata,
  normalizeDriverDocuments,
  normalizeStaffDocuments,
  mergeDriverDocuments,
  mergeStaffDocuments,
  setDocumentCollectionStatus,
  validateRequiredTextFields,
  computeProfileCompletion
};
