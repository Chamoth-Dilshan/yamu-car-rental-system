const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

const createGoogleAuthError = (message, statusCode = 401) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const verifyGoogleIdToken = async (idToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw createGoogleAuthError('Google authentication is not configured.', 500);
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId
    });
  } catch {
    throw createGoogleAuthError('Invalid Google credential.');
  }

  const payload = ticket.getPayload();

  if (!payload?.sub) {
    throw createGoogleAuthError('Invalid Google credential.');
  }

  if (!payload.email_verified) {
    throw createGoogleAuthError('Google email is not verified.', 400);
  }

  return {
    googleId: payload.sub,
    email: String(payload.email || '').trim().toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    fullName: String(payload.name || '').trim(),
    picture: String(payload.picture || '').trim()
  };
};

module.exports = {
  verifyGoogleIdToken
};
