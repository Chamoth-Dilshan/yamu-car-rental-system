const {
  DRIVER_AD_AVAILABILITY,
  DRIVER_AD_VISIBILITY,
  parseListField
} = require('../../utils/reservationHelpers')

const buildDriverAdPayload = (body, file, existingAd, user) => {
  const title = String(body.title || existingAd?.title || '').trim()
  const dailyRate = Number(body.dailyRate ?? existingAd?.dailyRate ?? 0)
  const maxGroupSize = Number(body.maxGroupSize ?? existingAd?.maxGroupSize ?? 1)
  const experienceYears = Number(body.experienceYears ?? existingAd?.experienceYears ?? 0)
  const availability = body.availability || existingAd?.availability || 'available'
  const visibility = body.visibility || existingAd?.visibility || 'active'

  if (!title) {
    return { error: 'Advertisement title is required' }
  }

  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    return { error: 'Daily rate must be greater than zero' }
  }

  if (!DRIVER_AD_AVAILABILITY.includes(availability)) {
    return { error: 'Invalid ad availability value' }
  }

  if (!DRIVER_AD_VISIBILITY.includes(visibility)) {
    return { error: 'Invalid ad visibility value' }
  }

  return {
    payload: {
      title,
      tagline: String(body.tagline || existingAd?.tagline || '').trim(),
      serviceLocation: String(
        body.serviceLocation
        || existingAd?.serviceLocation
        || user.driverProfile?.serviceArea
        || user.city
        || ''
      ).trim(),
      languages: parseListField(body.languages || existingAd?.languages || []),
      experienceYears: Number.isFinite(experienceYears) && experienceYears >= 0 ? experienceYears : 0,
      dailyRate,
      maxGroupSize: Number.isFinite(maxGroupSize) && maxGroupSize > 0 ? maxGroupSize : 1,
      availability,
      visibility,
      preferredContact: String(body.preferredContact || existingAd?.preferredContact || '').trim(),
      specialties: parseListField(body.specialties || existingAd?.specialties || []),
      description: String(body.description || existingAd?.description || '').trim(),
      photo: file ? `driver-ads/${file.filename}` : (existingAd?.photo || (user.profilePic !== 'avatar.png' ? user.profilePic : ''))
    }
  }
}

module.exports = {
  buildDriverAdPayload
}
