import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaStar } from 'react-icons/fa'
import API from '../../../api/axios'
import { buildUploadUrl } from '../../../api/config'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDate, getBadgeClass } from '../../../utils/formatters'
import { getVehicleReviews } from '../../reviews/reviewApi'
import AvailablePromotions from '../../payments/components/AvailablePromotions'

const emptyReviewSummary = {
  ratingAverage: 0,
  reviewCount: 0,
  reviews: []
}

function RatingStars({ rating = 0 }) {
  return (
    <span className="quality-stars" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <FaStar key={value} className={value <= Math.round(Number(rating || 0)) ? 'filled' : ''} />
      ))}
    </span>
  )
}

function ReviewCard({ review }) {
  return (
    <article className="quality-review-card">
      <div className="quality-review-top">
        <div>
          <strong>{review.passengerName || 'Customer'}</strong>
          <span>{formatDate(review.createdAt)}</span>
        </div>
        <span className="quality-rating-pill">
          <FaStar /> {Number(review.vehicleRating || 0).toFixed(1)}
        </span>
      </div>
      <p className="quality-review-quote">&ldquo;{review.feedback}&rdquo;</p>
      <div className="quality-review-meta">
        <span>Vehicle <RatingStars rating={review.vehicleRating} /></span>
      </div>
    </article>
  )
}

export default function VehicleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshNotifications } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [reviewSummary, setReviewSummary] = useState(emptyReviewSummary)
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
  
  const [promoCode, setPromoCode] = useState('')
  const [priceDetails, setPriceDetails] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [promoError, setPromoError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    setReviewSummary(emptyReviewSummary)

    API.get(`/vehicles/${id}`)
      .then((res) => {
        setVehicle(res.data)
        setSelectedImage(res.data.images?.[0] || '')
        return getVehicleReviews(id)
          .then((reviewRes) => setReviewSummary({ ...emptyReviewSummary, ...reviewRes.data }))
          .catch(() => setReviewSummary(emptyReviewSummary))
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
  const ratingAverage = reviewSummary.reviewCount ? reviewSummary.ratingAverage : (vehicle?.ratingAverage || 0)
  const reviewCount = reviewSummary.reviewCount || vehicle?.reviewCount || 0

  useEffect(() => {
    if (totalAmount <= 0) {
      setPriceDetails(null);
      return;
    }

    let active = true;
    setIsSimulating(true);
    setPromoError('');

    API.post('/pricing/simulate', {
      bookingDetails: {
        basePrice: totalAmount, // pass the computed total as the base for the engine to discount from
        duration: 1, 
        startDate: bookingForm.startDate,
        endDate: bookingForm.endDate,
        vehicleCategory: vehicle?.category || 'any',
        bookingType: 'vehicle',
        isFirstBooking: false
      },
      promoCode
    })
      .then(res => {
        if (!active) return;
        setPriceDetails(res.data);
        
        if (promoCode) {
          const promoErrorItem = res.data.breakdown?.find(item => item.type === 'error');
          if (promoErrorItem) {
            setPromoError(promoErrorItem.name);
          }
        }
      })
      .catch(err => {
        if (!active) return;
        console.error('Simulation failed', err);
        setPromoError('Failed to calculate pricing or apply promo.');
      })
      .finally(() => {
        if (active) setIsSimulating(false);
      });

    return () => {
      active = false;
    };
  }, [totalAmount, promoCode, bookingForm.startDate, bookingForm.endDate, vehicle]);

  const bookingMock = {
    totalAmount: totalAmount,
    bookingType: 'vehicle',
    vehicle: { category: vehicle?.category || 'any' }
  };
  
  const finalAmount = priceDetails ? priceDetails.finalPrice : totalAmount;

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
        promoCode,
        ...bookingForm
      })
      await refreshNotifications().catch(() => {})
      navigate('/bookings', {
        state: { message: 'Your reservation request has been sent. Please wait for provider approval.' }
      })
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
                <span className="quality-rating-pill">
                  <FaStar /> {Number(ratingAverage || 0).toFixed(1)}
                  <span>({reviewCount})</span>
                </span>
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

                {billableDays > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <AvailablePromotions 
                      booking={bookingMock} 
                      onApplyPromo={setPromoCode} 
                      appliedPromo={promoCode} 
                      isSimulating={isSimulating}
                    />
                    {promoError && <div className="alert alert-danger" style={{ marginTop: '10px' }}>{promoError}</div>}
                    
                    {priceDetails && priceDetails.breakdown && priceDetails.breakdown.map((item, index) => {
                      if (item.type === 'error' || item.impact === 0) return null;
                      return (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', color: item.impact < 0 ? 'var(--success-color)' : 'inherit', margin: '10px 0', fontSize: '0.9rem' }}>
                          <span>{item.name}</span>
                          <strong>{item.impact < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.impact))}</strong>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="booking-total">
                  <span>Total</span>
                  <strong>{billableDays > 0 ? formatCurrency(finalAmount) : 'Select dates'}</strong>
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
                <div><span>Rating</span><strong>{Number(ratingAverage || 0).toFixed(1)}/5</strong></div>
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

            <div className="form-card">
              <div className="card-header">
                <div>
                  <h3>Recent Vehicle Reviews</h3>
                  <p style={{ color: 'var(--text-light)' }}>Approved feedback from completed vehicle reservations.</p>
                </div>
              </div>
              {(reviewSummary.reviews || []).length > 0 ? (
                <div className="quality-review-grid">
                  {reviewSummary.reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No approved reviews yet for this vehicle.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
