import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCarSide, FaStar, FaUserTie } from 'react-icons/fa';
import API from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import { getMediaImage } from '../../../utils/media';
import { getPublicQualityDashboard } from '../../reviews/reviewApi';

const emptyQualityStats = {
  averageDriverRating: 0,
  averageVehicleRating: 0,
  driverRatingCount: 0,
  vehicleRatingCount: 0,
  newestReviews: [],
  topDrivers: [],
  topVehicles: []
};

const formatRating = (value) => `${Number(value || 0).toFixed(1)}/5`;

const getReviewRating = (review) => {
  const ratings = [review?.vehicleRating, review?.driverRating]
    .map(Number)
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

  if (!ratings.length) {
    return 0;
  }

  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
};

function RatingStars({ rating = 0 }) {
  const roundedRating = Math.round(Number(rating || 0));

  return (
    <span className="home-top-stars" aria-label={`${formatRating(rating)} rating`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <FaStar key={value} className={value <= roundedRating ? '' : 'muted'} />
      ))}
    </span>
  );
}

function TopRatedPanel({ title, helper, items, emptyText, fallbackPath }) {
  return (
    <section className="home-top-panel">
      <div className="home-top-panel-header">
        <div>
          <h3>{title}</h3>
          <p>{helper}</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="home-top-list">
          {items.map((item, index) => {
            const detailPath = item.link || fallbackPath;

            return (
              <article key={item._id || item.name} className="home-top-item">
                <div className="home-top-rank">{index + 1}</div>
                <img
                  className="home-top-thumb"
                  src={getMediaImage(item.image, item.name)}
                  alt={item.name}
                />
                <div className="home-top-copy">
                  <strong>{item.name}</strong>
                  <span>{item.subtitle}</span>
                  <div className="home-top-rating">
                    <RatingStars rating={item.ratingAverage} />
                    <small>{formatRating(item.ratingAverage)} | {item.reviewCount} rating{item.reviewCount === 1 ? '' : 's'}</small>
                  </div>
                </div>
                <Link className="btn btn-outline btn-sm" to={detailPath}>View</Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="home-top-empty">{emptyText}</div>
      )}
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [inventoryStats, setInventoryStats] = useState({
    vehicles: 0,
    drivers: 0
  });
  const [qualityStats, setQualityStats] = useState(emptyQualityStats);
  const [qualityLoading, setQualityLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      API.get('/vehicles', {
        params: {
          status: 'available'
        }
      }),
      API.get('/driver-ads', {
        params: {
          availability: 'available'
        }
      })
    ])
      .then(([vehicleRes, driverRes]) => {
        if (!active) {
          return;
        }

        const vehicles = vehicleRes.data.vehicles || [];
        const drivers = driverRes.data.ads || [];

        setInventoryStats({
          vehicles: vehicles.length,
          drivers: drivers.length
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setInventoryStats({
          vehicles: 0,
          drivers: 0
        });
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getPublicQualityDashboard()
      .then((res) => {
        if (!active) {
          return;
        }

        setQualityStats({
          ...emptyQualityStats,
          ...(res.data || {})
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setQualityStats(emptyQualityStats);
      })
      .finally(() => {
        if (active) {
          setQualityLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const primaryAction = user ? '/cars' : '/signup';
  const primaryLabel = user ? 'Start Browsing Cars' : 'Create Client Account';
  const secondaryAction = user ? '/bookings' : '/drivers';
  const secondaryLabel = user ? 'View My Bookings' : 'Hire a Driver';
  const vehicleCountLabel = inventoryStats.vehicles;
  const driverCountLabel = inventoryStats.drivers;
  const newestReviews = qualityStats.newestReviews || [];
  const featuredReview = newestReviews[0] || null;
  const featuredReviewRating = getReviewRating(featuredReview);
  const topDrivers = (qualityStats.topDrivers || []).slice(0, 5);
  const topVehicles = (qualityStats.topVehicles || []).slice(0, 5);
  const qualityCards = [
    {
      label: 'Avg Driver Rating',
      value: qualityLoading ? '...' : formatRating(qualityStats.averageDriverRating),
      icon: <FaUserTie />
    },
    {
      label: 'Avg Vehicle Rating',
      value: qualityLoading ? '...' : formatRating(qualityStats.averageVehicleRating),
      icon: <FaCarSide />
    }
  ];

  return (
    <div className="page-content home-page">
      <section className="home-hero">
        <div className="container">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <h1>Rent a car or hire a driver with less hassle.</h1>
              <p className="home-hero-lead">
                Find the right option fast, compare clearly, and book in one place.
              </p>

              <div className="home-hero-actions">
                <Link to={primaryAction} className="btn btn-primary btn-lg">{primaryLabel}</Link>
                <Link to={secondaryAction} className="btn btn-outline btn-lg">{secondaryLabel}</Link>
              </div>

              <div className="home-trust-row">
                <div>
                  <strong>{vehicleCountLabel}{vehicleCountLabel ? '+' : ''}</strong>
                  <span>available vehicles</span>
                </div>
                <div>
                  <strong>{driverCountLabel}{driverCountLabel ? '+' : ''}</strong>
                  <span>published drivers</span>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>trip planning access</span>
                </div>
              </div>
            </div>

            <div className="home-hero-panel">
              <div className="home-itinerary-card">
                <div className="home-itinerary-top">
                  <div>
                    <span className="home-panel-label">Trip Snapshot</span>
                    <h2>Built for quick travel decisions.</h2>
                  </div>
                </div>

                <div className="home-itinerary-route">
                  <div>
                    <span>Pickup</span>
                    <strong>Bandaranaike Airport</strong>
                  </div>
                  <div className="home-route-line" />
                  <div>
                    <span>Destination</span>
                    <strong>Colombo, Kandy, or beyond</strong>
                  </div>
                </div>

                <div className="home-itinerary-grid">
                  <article>
                    <span>Need a car?</span>
                    <strong>Compare self-drive rates</strong>
                    <p>Check the essentials quickly.</p>
                  </article>
                  <article>
                    <span>Need a driver?</span>
                    <strong>Review experience and languages</strong>
                    <p>Pick the right match for your trip.</p>
                  </article>
                </div>

                <div className="home-itinerary-footer">
                  <Link to="/cars" className="btn btn-secondary">Explore Cars</Link>
                  <Link to="/drivers" className="btn btn-outline">Find Drivers</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-quality-section">
        <div className="container">
          <div className="home-quality-shell">
            <div className="home-quality-copy">
              <span className="home-eyebrow home-eyebrow-dark">Customer Feedback</span>
              <h2>Real ratings from approved completed trips.</h2>
              <p>Driver and vehicle scores update from approved reviews, so the home page reflects live service quality.</p>
              <div className="home-quality-actions">
                <Link to="/cars" className="btn btn-secondary">Explore Cars</Link>
                <Link to="/drivers" className="btn btn-outline">Explore Drivers</Link>
              </div>
            </div>

            <div className="home-quality-panel">
              <div className="home-quality-grid">
                {qualityCards.map((item) => (
                  <article key={item.label} className="home-quality-card">
                    <div className="home-quality-card-icon">{item.icon}</div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="home-review-highlight">
                <div className="home-review-highlight-top">
                  <span>Latest Review</span>
                  <div className="home-review-stars" aria-label={`Latest review rating ${formatRating(featuredReviewRating)}`}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <FaStar
                        key={rating}
                        className={rating <= Math.round(featuredReviewRating) ? '' : 'muted'}
                      />
                    ))}
                  </div>
                </div>
                {featuredReview ? (
                  <>
                    <p>&ldquo;{featuredReview.feedback}&rdquo;</p>
                    <small>
                      {[featuredReview.vehicleName, featuredReview.driverName].filter(Boolean).join(' / ') || featuredReview.bookingNo} | {formatRating(featuredReviewRating)}
                    </small>
                  </>
                ) : (
                  <>
                    <p>No approved customer reviews are published yet.</p>
                    <small>New approved vehicle and driver ratings will appear here automatically.</small>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-top-rated-section">
        <div className="container">
          <div className="home-top-rated-header">
            <span className="home-eyebrow home-eyebrow-dark">Top Rated</span>
          </div>

          <div className="home-top-rated-grid">
            <TopRatedPanel
              title="Top Rated Drivers"
              helper="Highest average driver ratings from approved reviews."
              items={topDrivers}
              emptyText={qualityLoading ? 'Loading top rated drivers...' : 'No approved driver ratings yet.'}
              fallbackPath="/drivers"
            />
            <TopRatedPanel
              title="Top Rated Vehicles"
              helper="Highest average vehicle ratings from approved reviews."
              items={topVehicles}
              emptyText={qualityLoading ? 'Loading top rated vehicles...' : 'No approved vehicle ratings yet.'}
              fallbackPath="/cars"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
