const crypto = require('crypto');
const User = require('../users/user.model');

const normalizeUsernameCandidate = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return normalized.slice(0, 30);
};

const buildUsernameBase = ({ email = '', fullName = '' } = {}) => {
  const emailPrefix = String(email || '').split('@')[0];

  return normalizeUsernameCandidate(emailPrefix)
    || normalizeUsernameCandidate(fullName)
    || 'user';
};

const generateUniqueUsername = async ({ email, fullName } = {}) => {
  const base = buildUsernameBase({ email, fullName });
  let candidate = base;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
};

const generatePlaceholderPassword = () => (
  `google-${crypto.randomBytes(48).toString('hex')}`
);

const getInactiveAccountMessage = (accountStatus) => (
  accountStatus === 'pending'
    ? 'Your account is pending admin approval'
    : 'Your account is not active'
);

module.exports = {
  generatePlaceholderPassword,
  generateUniqueUsername,
  getInactiveAccountMessage
};
