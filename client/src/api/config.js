const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '')

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || '/api')

const uploadsOrigin = trimTrailingSlash(import.meta.env.VITE_UPLOADS_URL || '')

export const buildUploadUrl = (fileName) => {
  if (!fileName) {
    return ''
  }

  if (/^https?:\/\//i.test(fileName)) {
    return fileName
  }

  return `${uploadsOrigin}/uploads/${fileName}`
}
