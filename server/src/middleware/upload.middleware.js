const fs = require('fs');
const multer = require('multer');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const PUBLIC_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const PRIVATE_FILE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const PUBLIC_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PRIVATE_FILE_MAX_BYTES = 10 * 1024 * 1024;

const normalizeUploadDir = (dir = 'general') => (
  String(dir || 'general')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('/')
);

const createUploadDir = (dir) => {
  const normalizedDir = normalizeUploadDir(dir);
  const fullPath = path.join(UPLOAD_ROOT, normalizedDir);

  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    throw new Error('Invalid upload destination');
  }

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
};

const sanitizeBaseName = (value = 'upload') => {
  const parsedName = path.parse(String(value || 'upload')).name;
  const safeName = parsedName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return safeName || 'upload';
};

const createStorage = () => multer.diskStorage({
  destination(req, file, cb) {
    try {
      cb(null, createUploadDir(req.uploadDir || 'general'));
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizeBaseName(file.originalname)}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const createFileFilter = ({ allowedTypes, message }) => (req, file, cb) => {
  if (allowedTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error(message));
};

const createUpload = ({ allowedTypes, maxSize, message }) => multer({
  storage: createStorage(),
  limits: { fileSize: maxSize },
  fileFilter: createFileFilter({ allowedTypes, message })
});

const publicImageUpload = createUpload({
  allowedTypes: PUBLIC_IMAGE_TYPES,
  maxSize: PUBLIC_IMAGE_MAX_BYTES,
  message: 'Only image files are allowed'
});

const privateDocumentUpload = createUpload({
  allowedTypes: PRIVATE_FILE_TYPES,
  maxSize: PRIVATE_FILE_MAX_BYTES,
  message: 'Only JPG, PNG, WebP, or PDF files are allowed'
});

publicImageUpload.createUploadDir = createUploadDir;
publicImageUpload.createUpload = createUpload;
publicImageUpload.publicImageUpload = publicImageUpload;
publicImageUpload.privateDocumentUpload = privateDocumentUpload;
publicImageUpload.UPLOAD_ROOT = UPLOAD_ROOT;
publicImageUpload.PUBLIC_IMAGE_MAX_BYTES = PUBLIC_IMAGE_MAX_BYTES;
publicImageUpload.PRIVATE_FILE_MAX_BYTES = PRIVATE_FILE_MAX_BYTES;

module.exports = publicImageUpload;

