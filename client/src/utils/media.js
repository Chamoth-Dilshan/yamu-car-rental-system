import { buildUploadUrl } from '../api/config'

export const getUserAvatar = (user, fallbackName = 'User') => {
  if (user?.profilePic && user.profilePic !== 'avatar.png') {
    return buildUploadUrl(user.profilePic)
  }

  const name = user?.fullName || fallbackName
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f0a500&color=0d1b2a&bold=true`
}

export const getMediaImage = (value, fallbackName = 'යමු') => {
  if (value && value !== 'avatar.png') {
    return buildUploadUrl(value)
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=f0a500&color=0d1b2a&bold=true`
}
