import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatList, getBadgeClass } from '../utils/formatters'
import { getMediaImage, getUserAvatar } from '../utils/media'
import { getTodayDateInputValue, trimValue, validateReservationForm } from '../utils/validators'

export default function DriverDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshNotifications } = useAuth()
  const [ad, setAd] = useState(null)
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    pickupLocation: '',
    destination: '',
    notes: ''
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isOwnDriverAd = Boolean(user && ad?.driver?._id && String(ad.driver._id) === String(user._id))
  const todayDate = getTodayDateInputValue()

  useEffect(() => {
    setLoading(true)
    setError('')

    API.get(`/driver-ads/${id}`)
      .then((res) => setAd(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load driver profile'))
      .finally(() => setLoading(false))
  }, [id])

  const submitRequest = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!user) {
      navigate('/signin')
      return
    }

    if (isOwnDriverAd) {
      setError('You cannot book your own driver advertisement.')
      return
    }

    if ((user.activeRole || user.role) !== 'customer') {
      setError('Switch to the user role before requesting a driver.')
      return
    }

    const validationError = validateReservationForm(form)

    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)

    try {
      await API.post('/bookings/driver', {
        driverAdId: ad._id,
        ...form,
        pickupLocation: trimValue(form.pickupLocation),
        destination: trimValue(form.destination),
        notes: trimValue(form.notes)
      })
      await refreshNotifications().catch(() => {})
      setMessage('Driver request sent successfully. You can follow it from My Bookings.')
      setForm({
        startDate: '',
        endDate: '',
        pickupLocation: '',
        destination: '',
        notes: ''
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send driver request')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="page-content"><div className="container"><div className="form-card reservation-empty">Loading driver profile...</div></div></div>
  }

  if (error && !ad) {
    return <div className="page-content"><div className="container"><div className="alert alert-danger">{error}</div></div></div>
  }

  return (
    <div className="page-content reservation-page">
      <section className="page-banner page-banner-compact">
        <div className="container">
          <div className="page-banner-copy">
            <span className="page-banner-tag">Driver Profile</span>
            <h1>{ad.driver?.fullName || ad.title}</h1>
            <p>{ad.tagline}</p>
          </div>
        </div>
      </section>

      <section className="reservation-section">
        <div className="container">
          {message && <div className="alert alert-success">{message}</div>}
          {error && ad && <div className="alert alert-danger">{error}</div>}

          <div className="driver-detail-grid">
            <aside className="driver-summary-card">
              <img
                className="driver-profile-avatar"
                src={ad.photo ? getMediaImage(ad.photo, ad.driver?.fullName || ad.title) : getUserAvatar(ad.driver, ad.title)}
                alt={ad.driver?.fullName || ad.title}
              />
              <h3>{ad.driver?.fullName || ad.title}</h3>
              <p>{ad.title}</p>
              <div className="pill-row" style={{ marginTop: '1rem' }}>
                <span className={`badge ${getBadgeClass(ad.availability)}`}>{ad.availability}</span>
                <span className="badge badge-success">{ad.visibility}</span>
              </div>
              <div className="vehicle-meta-grid" style={{ marginTop: '1.5rem' }}>
                <div>
                  <span>Daily rate</span>
                  <strong>{formatCurrency(ad.dailyRate)}</strong>
                </div>
                <div>
                  <span>Experience</span>
                  <strong>{ad.experienceYears} years</strong>
                </div>
                <div>
                  <span>Trips</span>
                  <strong>{ad.completedTrips}</strong>
                </div>
              </div>
              <div className="driver-summary-actions">
                <a className="btn btn-outline btn-sm" href={`tel:${ad.driver?.phone || ''}`}>Call Driver</a>
                <a className="btn btn-secondary btn-sm" href={`mailto:${ad.driver?.email || ''}`}>Email Driver</a>
              </div>
            </aside>

            <div className="driver-detail-stack">
              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Driver Overview</h3>
                    <p style={{ color: 'var(--text-light)' }}>Public advertisement details customers can use before sending a booking request.</p>
                  </div>
                </div>
                <div className="info-grid">
                  <div><span>Service Area</span><strong>{ad.serviceLocation}</strong></div>
                  <div><span>Languages</span><strong>{formatList(ad.languages)}</strong></div>
                  <div><span>Preferred Contact</span><strong>{ad.preferredContact || 'Phone or email'}</strong></div>
                  <div><span>Max Group Size</span><strong>{ad.maxGroupSize} travellers</strong></div>
                </div>
                <h4 style={{ marginTop: '1.5rem' }}>Tour Specialties</h4>
                <div className="feature-list">
                  {(ad.specialties || []).map((specialty) => (
                    <span key={specialty} className="feature-chip">{specialty}</span>
                  ))}
                </div>
                <p className="detail-copy" style={{ marginTop: '1.5rem' }}>{ad.description}</p>
              </section>

              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Request This Driver</h3>
                    <p style={{ color: 'var(--text-light)' }}>Send a trip brief directly into the booking system for the driver to review.</p>
                  </div>
                  {(user && (user.activeRole || user.role) !== 'customer') && (
                    <Link className="btn btn-outline btn-sm" to="/switch-roles">Switch Role</Link>
                  )}
                </div>
                <form onSubmit={submitRequest}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        min={todayDate}
                        value={form.startDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        min={form.startDate || todayDate}
                        value={form.endDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Pickup Location</label>
                      <input
                        value={form.pickupLocation}
                        onChange={(e) => setForm((prev) => ({ ...prev, pickupLocation: e.target.value }))}
                        placeholder="Hotel, airport, or meeting point"
                      />
                    </div>
                    <div className="form-group">
                      <label>Destination</label>
                      <input
                        value={form.destination}
                        onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
                        placeholder="Drop-off or destination"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Trip Notes</label>
                    <textarea
                      rows="4"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Share traveller count, luggage, route notes, or any special request"
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={busy || isOwnDriverAd}>
                    {busy ? 'Sending...' : 'Send Request'}
                  </button>
                </form>
                {isOwnDriverAd && (
                  <p className="reservation-note" style={{ marginTop: '0.75rem' }}>
                    This is your own driver listing. Booking is disabled.
                  </p>
                )}
              </section>

              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Recent Reviews</h3>
                    <p style={{ color: 'var(--text-light)' }}>This screen is ready for future review integration once the review module is connected.</p>
                  </div>
                </div>
                <div className="reservation-empty">No public reviews yet for this driver advertisement.</div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
