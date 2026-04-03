const SUPPORTED_LANGUAGES = ['English', 'Sinhala', 'Tamil'];
const DOCUMENT_STATUSES = ['not_provided', 'submitted', 'verified', 'rejected'];

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

const buildDocumentMetadata = (input = {}, current = {}) => {
  const reference = trimValue(input.reference, current.reference || '');
  const fileName = trimValue(input.fileName, current.fileName || '');
  const originalName = trimValue(input.originalName, current.originalName || '');
  const note = trimValue(input.note, current.note || '');
  const explicitStatus = trimValue(input.status, current.status || '');
  const hasDocumentData = Boolean(reference || fileName || originalName);
  const status = DOCUMENT_STATUSES.includes(explicitStatus)
    ? explicitStatus
    : (hasDocumentData ? 'submitted' : 'not_provided');

  return {
    reference,
    fileName,
    originalName,
    status,
    note,
    uploadedAt: input.uploadedAt !== undefined
      ? parseDate(input.uploadedAt)
      : (current.uploadedAt || (hasDocumentData ? new Date() : null))
  };
};

const mergeDriverDocuments = (payload = {}, current = {}) => ({
  nicDocument: buildDocumentMetadata(payload.nicDocument || {}, current.nicDocument || {}),
  licenseProof: buildDocumentMetadata(payload.licenseProof || {}, current.licenseProof || {})
});

const mergeStaffDocuments = (payload = {}, current = {}) => ({
  businessRegistrationProof: buildDocumentMetadata(
    payload.businessRegistrationProof || {},
    current.businessRegistrationProof || {}
  )
});

const isFilled = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => isFilled(item));
  }

  return Boolean(trimValue(value));
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
  trimValue,
  parseDate,
  normalizePreferredLanguage,
  normalizeEmergencyContact,
  buildDocumentMetadata,
  mergeDriverDocuments,
  mergeStaffDocuments,
  computeProfileCompletion
};
