import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import API from '../api/axios'
import { buildUploadUrl } from '../api/config'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  name: '',
  brand: '',
  model: '',
  year: '',
  category: '',
  fuelType: '',
  transmission: '',
  seats: '',
  location: '',
  engineCapacity: '',
  ownerContact: '',
  pricePerDay: '',
  status: 'available',
  featured: false,
  features: '',
  description: ''
}

export default function StaffVehicleForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditMode = Boolean(id)
  const [form, setForm] = useState(emptyForm)
  const [currentImages, setCurrentImages] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [loading, setLoading] = useState(isEditMode)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditMode) {
      setForm((prev) => ({
        ...prev,
        location: user?.staffProfile?.storeAddress || user?.city || '',
        ownerContact: user?.staffProfile?.storeContactNumber || user?.staffProfile?.storeEmail || user?.phone || user?.email || ''
      }))
      return
    }

    setLoading(true)
    setError('')

    API.get('/vehicles/mine/list')
      .then((res) => {
        const vehicle = (res.data.vehicles || []).find((item) => item._id === id)

        if (!vehicle) {
          setError('Vehicle not found')
          return
        }

        setForm({
          name: vehicle.name || '',
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          year: vehicle.year || '',
          category: vehicle.category || '',
          fuelType: vehicle.fuelType || '',
          transmission: vehicle.transmission || '',
          seats: vehicle.seats || '',
          location: vehicle.location || '',
          engineCapacity: vehicle.engineCapacity || '',
          ownerContact: vehicle.ownerContact || '',
          pricePerDay: vehicle.pricePerDay || '',
          status: vehicle.status || 'available',
          featured: Boolean(vehicle.featured),
          features: (vehicle.features || []).join(', '),
          description: vehicle.description || ''
        })
        setCurrentImages(vehicle.images || [])
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load vehicle'))
      .finally(() => setLoading(false))
  }, [id, isEditMode, user])

  const submitForm = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => formData.append(key, value))
      imageFiles.forEach((file) => formData.append('images', file))

      if (isEditMode) {
        await API.put(`/vehicles/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await API.post('/vehicles', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      setMessage(`Vehicle ${isEditMode ? 'updated' : 'created'} successfully`)
      navigate('/staff/vehicles')
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} vehicle`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>{isEditMode ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <p style={{ color: 'var(--text-light)' }}>Maintain the store vehicle details customers see before they submit a reservation.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="form-card reservation-empty">Loading vehicle...</div>
        ) : (
          <div className="form-card">
            <form onSubmit={submitForm}>
              {currentImages.length > 0 && (
                <div className="vehicle-detail-thumbs" style={{ marginBottom: '1.25rem' }}>
                  {currentImages.map((image) => (
                    <div key={image} className="vehicle-thumb-button active" style={{ pointerEvents: 'none' }}>
                      <img src={buildUploadUrl(image)} alt={form.name || 'Vehicle'} />
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label>Vehicle Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  required={!isEditMode && currentImages.length === 0}
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Name</label>
                  <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <input value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Model</label>
                  <input value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input type="number" min="1900" value={form.year} onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Fuel Type</label>
                  <input value={form.fuelType} onChange={(e) => setForm((prev) => ({ ...prev, fuelType: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Transmission</label>
                  <input value={form.transmission} onChange={(e) => setForm((prev) => ({ ...prev, transmission: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Seats</label>
                  <input type="number" min="1" value={form.seats} onChange={(e) => setForm((prev) => ({ ...prev, seats: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Engine Capacity</label>
                  <input value={form.engineCapacity} onChange={(e) => setForm((prev) => ({ ...prev, engineCapacity: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Owner Contact</label>
                  <input value={form.ownerContact} onChange={(e) => setForm((prev) => ({ ...prev, ownerContact: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Price Per Day</label>
                  <input type="number" min="1" value={form.pricePerDay} onChange={(e) => setForm((prev) => ({ ...prev, pricePerDay: e.target.value }))} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Featured</label>
                  <select value={String(form.featured)} onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.value === 'true' }))}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Features</label>
                <input
                  value={form.features}
                  onChange={(e) => setForm((prev) => ({ ...prev, features: e.target.value }))}
                  placeholder="Air conditioning, reverse camera, Bluetooth"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows="5" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
              </div>

              <div className="pill-row">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Saving...' : isEditMode ? 'Update Vehicle' : 'Create Vehicle'}
                </button>
                <button className="btn btn-outline" type="button" onClick={() => navigate('/staff/vehicles')}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
