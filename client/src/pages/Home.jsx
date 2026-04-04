import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [inventoryStats, setInventoryStats] = useState({
    vehicles: 0,
    drivers: 0
  });

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

  const primaryAction = user ? '/cars' : '/signup';
  const primaryLabel = user ? 'Start Browsing Cars' : 'Create Client Account';
  const secondaryAction = user ? '/bookings' : '/drivers';
  const secondaryLabel = user ? 'View My Bookings' : 'Hire a Driver';
  const vehicleCountLabel = inventoryStats.vehicles;
  const driverCountLabel = inventoryStats.drivers;

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

    </div>
  );
}
