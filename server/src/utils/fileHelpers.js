const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const PUBLIC_UPLOAD_DIRS = ['profiles', 'vehicles', 'driver-ads'];

const normalizeRelativePath = (value = '') => (
  String(value || '')
    .replace(/^\/?uploads\//, '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('/')
);

const getUploadRelativePath = (uploadDir = '', fileName = '') => (
  normalizeRelativePath(path.posix.join(normalizeRelativePath(uploadDir), fileName))
);

const getFileMetadataFromUpload = (file, uploadDir) => {
  if (!file) {
    return null;
  }

  const filePath = getUploadRelativePath(uploadDir, file.filename);

  return {
    fileName: file.originalname || file.filename,
    filePath,
    reference: filePath,
    mimeType: file.mimetype || '',
    size: file.size || 0,
    status: 'uploaded',
    rejectionReason: '',
    uploadedAt: new Date(),
    reviewedAt: null
  };
};

const getFilesByField = (files = []) => {
  if (!files) {
    return {};
  }

  if (Array.isArray(files)) {
    return files.reduce((acc, file) => ({
      ...acc,
      [file.fieldname]: file
    }), {});
  }

  return Object.fromEntries(
    Object.entries(files).map(([field, values]) => [field, Array.isArray(values) ? values[0] : values])
  );
};

const resolveUploadPath = (filePath = '') => {
  const relativePath = normalizeRelativePath(filePath);

  if (!relativePath) {
    return null;
  }

  const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);
  const uploadRootWithSeparator = `${path.resolve(UPLOAD_ROOT)}${path.sep}`;

  if (!absolutePath.startsWith(uploadRootWithSeparator)) {
    return null;
  }

  return { absolutePath, relativePath };
};

const isPublicUploadPath = (filePath = '') => {
  const relativePath = normalizeRelativePath(filePath);
  return PUBLIC_UPLOAD_DIRS.some((dir) => relativePath === dir || relativePath.startsWith(`${dir}/`));
};

const sendProtectedUpload = (res, document = {}) => {
  const resolvedPath = resolveUploadPath(document.filePath || document.reference);

  if (!resolvedPath || !fs.existsSync(resolvedPath.absolutePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  const displayName = path.basename(document.fileName || resolvedPath.relativePath);
  res.setHeader('Content-Disposition', `inline; filename="${displayName.replace(/"/g, '')}"`);
  return res.sendFile(resolvedPath.absolutePath);
};

const removeUploadedFiles = (files = []) => {
  const fileList = Array.isArray(files)
    ? files
    : Object.values(files || {}).flat();

  fileList.forEach((file) => {
    if (!file?.path) {
      return;
    }

    fs.promises.unlink(file.path).catch(() => {});
  });
};

module.exports = {
  UPLOAD_ROOT,
  PUBLIC_UPLOAD_DIRS,
  getFileMetadataFromUpload,
  getFilesByField,
  getUploadRelativePath,
  isPublicUploadPath,
  normalizeRelativePath,
  removeUploadedFiles,
  resolveUploadPath,
  sendProtectedUpload
};
