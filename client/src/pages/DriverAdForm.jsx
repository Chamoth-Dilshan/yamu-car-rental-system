import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import API from '../api/axios'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getMediaImage, getUserAvatar } from '../utils/media'
import { validateDriverAdInput } from '../utils/validators'

const emptyForm = {
  title: '',
  tagline: '',
  serviceLocation: '',
  languages: '',
  experienceYears: '',
  dailyRate: '',
  maxGroupSize: '',
  availability: 'available',
  visibility: 'active',
  preferredContact: '',
  specialties: '',
  description: ''
}

export default function DriverAdForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditMode = Boolean(id)
  const [form, setForm] = useState(emptyForm)
  const [currentPhoto, setCurrentPhoto] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(isEditMode)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditMode) {
      setForm((prev) => ({
        ...prev,
        serviceLocation: user?.driverProfile?.serviceArea || '',
        preferredContact: user?.phone ? 'Phone & Email' : ''
      }))
      return
    }

    setLoading(true)
    setError('')

    API.get('/driver-ads/mine/list')
      .then((res) => {
        const ad = (res.data.ads || []).find((item) => item._id === id)

        if (!ad) {
          setError('Driver advertisement not found')
          return
        }

        setForm({
          title: ad.title || '',
          tagline: ad.tagline || '',
          serviceLocation: ad.serviceLocation || '',
          languages: (ad.languages || []).join(', '),
          experienceYears: ad.experienceYears || '',
          dailyRate: ad.dailyRate || '',
          maxGroupSize: ad.maxGroupSize || '',
          availability: ad.availability || 'available',
          visibility: ad.visibility || 'active',
          preferredContact: ad.preferredContact || '',
          specialties: (ad.specialties || []).join(', '),
          description: ad.description || ''
        })
        setCurrentPhoto(ad.photo || ad.driver?.profilePic || '')
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load advertisement'))
      .finally(() => setLoading(false))
  }, [id, isEditMode, user])

  const submitForm = async (event) => {
    event.preventDefault()
    const validationError = validateDriverAdInput(form, { photoFile })

    if (validationError) {
      setError(validationError)
      setMessage('')
      return
    }

    setBusy(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => formData.append(key, value))
      if (photoFile) {
        formData.append('photo', photoFile)
      }

      if (isEditMode) {
        await API.put(`/driver-ads/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await API.post('/driver-ads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      setMessage(`Driver advertisement ${isEditMode ? 'updated' : 'created'} successfully`)
      navigate('/driver/ads')
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} advertisement`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>{isEditMode ? 'Edit Driver Advertisement' : 'Create Driver Advertisement'}</h2>
          <p style={{ color: 'var(--text-light)' }}>Reuse the current project theme, but keep the structure needed for a public driver card and detail page.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="form-card reservation-empty">Loading advertisement...</div>
        ) : (
          <div className="form-card driver-ad-form-card">
            <form onSubmit={submitForm}>
              <div className="driver-ad-photo-panel">
                <div className="driver-ad-photo-preview">
                  <img
                    src={currentPhoto ? getMediaImage(currentPhoto, user?.fullName || 'Driver') : getUserAvatar(user)}
                    alt={user?.fullName || 'Driver'}
                  />
                </div>
                <div>
                  <h3>Driver Photo</h3>
                  <p style={{ color: 'var(--text-light)' }}>Upload a clean headshot. If you skip this, your current profile picture stays in use.</p>
                  <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Advertisement Title</label>
                  <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Short Tagline</label>
                  <input value={form.tagline} onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Service Location</label>
                  <input value={form.serviceLocation} onChange={(e) => setForm((prev) => ({ ...prev, serviceLocation: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Languages</label>
                  <input value={form.languages} onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))} placeholder="English, Sinhala, Tamil" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Experience (Years)</label>
                  <input type="number" min="0" value={form.experienceYears} onChange={(e) => setForm((prev) => ({ ...prev, experienceYears: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Daily Rate</label>
                  <input type="number" min="1" value={form.dailyRate} onChange={(e) => setForm((prev) => ({ ...prev, dailyRate: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Group Size</label>
                  <input type="number" min="1" value={form.maxGroupSize} onChange={(e) => setForm((prev) => ({ ...prev, maxGroupSize: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Preferred Contact</label>
                  <input value={form.preferredContact} onChange={(e) => setForm((prev) => ({ ...prev, preferredContact: e.target.value }))} placeholder="Phone & Email" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Availability</label>
                  <select value={form.availability} onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))}>
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Visibility</label>
                  <select value={form.visibility} onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}>
                    <option value="active">Publish Now</option>
                    <option value="draft">Save as Draft</option>
                    <option value="paused">Pause Listing</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tour Specialties</label>
                <input
                  value={form.specialties}
                  onChange={(e) => setForm((prev) => ({ ...prev, specialties: e.target.value }))}
                  placeholder="Airport transfer, day tours, wedding transport"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows="6" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
              </div>

              <div className="pill-row">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Saving...' : isEditMode ? 'Update Advertisement' : 'Create Advertisement'}
                </button>
                <button className="btn btn-outline" type="button" onClick={() => navigate('/driver/ads')}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
