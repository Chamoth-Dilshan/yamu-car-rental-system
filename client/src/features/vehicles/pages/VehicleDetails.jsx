import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import API from '../../../api/axios'
import { buildUploadUrl } from '../../../api/config'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, getBadgeClass } from '../../../utils/formatters'

export default function VehicleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshNotifications } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [selectedImage, setSelectedImage] = useState('')
  const [bookingForm, setBookingForm] = useState({
    startDate: '',
    endDate: '',
    pickupLocation: '',
    destination: '',
    notes: ''
  })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get(`/vehicles/${id}`)
      .then((res) => {
        setVehicle(res.data)
        setSelectedImage(res.data.images?.[0] || '')
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load vehicle details'))
      .finally(() => setLoading(false))
  }, [id])

  const billableDays = (() => {
    if (!bookingForm.startDate || !bookingForm.endDate) {
      return 0
    }

    const start = new Date(`${bookingForm.startDate}T00:00:00`)
    const end = new Date(`${bookingForm.endDate}T00:00:00`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0
    }

    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  })()

  const totalAmount = billableDays > 0 ? billableDays * Number(vehicle?.pricePerDay || 0) : 0
  const isOwnVehicleListing = Boolean(user && vehicle?.owner?._id && String(vehicle.owner._id) === String(user._id))
  const storeUnavailable = !vehicle?.owner
  const listedStoreName = vehicle?.owner?.storeName || vehicle?.owner?.fullName || ''

  const submitBooking = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!user) {
      navigate('/signin')
      return
    }

    if (isOwnVehicleListing) {
      setError('You cannot book your own store vehicle listing.')
      return
    }

    if (storeUnavailable) {
      setError('This vehicle listing is temporarily unavailable because no store profile is attached to it.')
      return
    }

    if ((user.activeRole || user.role) !== 'customer') {
      setError('Switch to the user role before creating a reservation.')
      return
    }

    setBusy(true)

    try {
      await API.post('/bookings/vehicle', {
        vehicleId: vehicle._id,
        ...bookingForm
      })
      await refreshNotifications().catch(() => {})
      setMessage('Reservation created successfully. You can review it from My Bookings.')
      setBookingForm({
        startDate: '',
        endDate: '',
        pickupLocation: '',
        destination: '',
        notes: ''
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create reservation')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="page-content"><div className="container"><div className="form-card reservation-empty">Loading vehicle details...</div></div></div>
  }

  if (error && !vehicle) {
    return <div className="page-content"><div className="container"><div className="alert alert-danger">{error}</div></div></div>
  }

  return (
    <div className="page-content reservation-page">
      <section className="page-banner page-banner-compact">
        <div className="container">
          <div className="page-banner-copy">
            <span className="page-banner-tag">Vehicle Details</span>
            <h1>{vehicle.name}</h1>
            <p>{vehicle.brand} {vehicle.model} - {vehicle.location}</p>
          </div>
        </div>
      </section>

      <section className="reservation-section">
        <div className="container">
          {message && <div className="alert alert-success">{message}</div>}
          {error && vehicle && <div className="alert alert-danger">{error}</div>}

          <div className="vehicle-detail-grid">
            <div className="vehicle-gallery-card">
              <img className="vehicle-detail-main-image" src={buildUploadUrl(selectedImage)} alt={vehicle.name} />
              <div className="vehicle-detail-thumbs">
                {(vehicle.images || []).map((image) => (
                  <button
                    key={image}
                    className={`vehicle-thumb-button${selectedImage === image ? ' active' : ''}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img src={buildUploadUrl(image)} alt={vehicle.name} />
                  </button>
                ))}
              </div>
            </div>

            <aside className="booking-card">
              <div className="booking-price">{formatCurrency(vehicle.pricePerDay)} <span>per day</span></div>
              <div className="pill-row">
                <span className={`badge ${getBadgeClass(vehicle.status)}`}>{vehicle.status}</span>
                <span className="badge badge-info">{vehicle.location}</span>
              </div>
              <form onSubmit={submitBooking}>
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={bookingForm.startDate}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={bookingForm.endDate}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pickup Location</label>
                  <input
                    value={bookingForm.pickupLocation}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, pickupLocation: e.target.value }))}
                    placeholder="Airport, hotel, or branch pickup"
                  />
                </div>
                <div className="form-group">
                  <label>Destination</label>
                  <input
                    value={bookingForm.destination}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, destination: e.target.value }))}
                    placeholder="Drop-off or travel destination"
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    rows="3"
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any trip notes or requirements"
                  />
                </div>
                <div className="booking-total">
                  <span>Total</span>
                  <strong>{billableDays > 0 ? formatCurrency(totalAmount) : 'Select dates'}</strong>
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={busy || vehicle.status !== 'available' || isOwnVehicleListing || storeUnavailable}>
                  {busy ? 'Booking...' : 'Reserve Vehicle'}
                </button>
              </form>
              {isOwnVehicleListing && (
                <p className="reservation-note">This is your own store listing. Booking is disabled.</p>
              )}
              {storeUnavailable && (
                <p className="reservation-note">This listing is visible, but reservations are disabled until a store profile is reconnected.</p>
              )}
              {(user && (user.activeRole || user.role) !== 'customer') && (
                <p className="reservation-note">
                  Need to book as a user? <Link to="/switch-roles">Switch active role</Link>
                </p>
              )}
            </aside>
          </div>

          <div className="vehicle-specs-grid">
            <div className="form-card">
              <div className="card-header">
                <div>
                  <h3>Vehicle Specifications</h3>
                  <p style={{ color: 'var(--text-light)' }}>A quick reservation-focused summary of the core vehicle details.</p>
                </div>
              </div>
              <div className="info-grid">
                <div><span>Brand</span><strong>{vehicle.brand}</strong></div>
                <div><span>Model</span><strong>{vehicle.model}</strong></div>
                <div><span>Year</span><strong>{vehicle.year}</strong></div>
                <div><span>Transmission</span><strong>{vehicle.transmission}</strong></div>
                <div><span>Fuel Type</span><strong>{vehicle.fuelType}</strong></div>
                <div><span>Seats</span><strong>{vehicle.seats}</strong></div>
                <div><span>Engine</span><strong>{vehicle.engineCapacity || 'Not specified'}</strong></div>
                <div><span>Location</span><strong>{vehicle.location}</strong></div>
                <div><span>Listed By</span><strong>{listedStoreName || 'Store pending'}</strong></div>
                <div><span>Owner Contact</span><strong>{vehicle.ownerContact || 'Available on request'}</strong></div>
                <div><span>Vehicle ID</span><strong>{vehicle.vehicleCode}</strong></div>
              </div>
            </div>

            <div className="form-card">
              <div className="card-header">
                <div>
                  <h3>Reservation Notes</h3>
                  <p style={{ color: 'var(--text-light)' }}>Use the vehicle description and features to decide whether this fits the trip.</p>
                </div>
              </div>
              <p className="detail-copy">{vehicle.description}</p>
              <div className="feature-list">
                {(vehicle.features || []).map((feature) => (
                  <span key={feature} className="feature-chip">{feature}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
