import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatters'

const bookingSteps = [
  {
    num: '1',
    title: 'Choose a vehicle or driver',
    desc: 'Browse the fleet or explore public driver advertisements based on your trip needs.'
  },
  {
    num: '2',
    title: 'Send the reservation',
    desc: 'Create a booking with dates, pickup details, and any notes the provider should see.'
  },
  {
    num: '3',
    title: 'Track it in your dashboard',
    desc: 'Follow payment and booking status changes from customer, driver, or admin views.'
  }
]

export default function Home() {
  const { user } = useAuth()
  const isAdmin = (user?.activeRole || user?.role) === 'admin'
  const isDriver = (user?.activeRole || user?.role) === 'driver'
  const [featuredVehicles, setFeaturedVehicles] = useState([])
  const [featuredDrivers, setFeaturedDrivers] = useState([])

  useEffect(() => {
    API.get('/vehicles', { params: { featured: true, limit: 3, status: 'available' } })
      .then((res) => setFeaturedVehicles(res.data.vehicles || []))
      .catch(() => {})

    API.get('/driver-ads')
      .then((res) => setFeaturedDrivers((res.data.ads || []).slice(0, 2)))
      .catch(() => {})
  }, [])

  const primaryLink = isAdmin ? '/admin/dashboard' : isDriver ? '/driver/ads' : user ? '/bookings' : '/signup'
  const primaryText = isAdmin ? 'Open Dashboard' : isDriver ? 'Open Driver Workspace' : user ? 'Open My Bookings' : 'Create Account'
  const secondaryLink = isAdmin ? '/admin/bookings' : '/cars'
  const secondaryText = isAdmin ? 'Manage Bookings' : 'Explore Cars'

  return (
    <div className="page-content">
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="text-box">
              <h3>YAMU Reservations</h3>
              <h1>Manage <span>bookings</span> across cars, drivers, and admin workflows</h1>
              <p>
                Reservation and booking management now runs through a connected vehicle catalog,
                public driver ads, customer booking flows, and operational dashboards.
              </p>
              <div className="btn-group">
                <Link to={primaryLink} className="btn btn-primary btn-lg">{primaryText}</Link>
                <Link to={secondaryLink} className="btn btn-outline btn-lg">{secondaryText}</Link>
              </div>
              <div className="hero-points">
                <span>Customer booking history with payment and status tracking</span>
                <span>Driver ad publishing and incoming request management</span>
                <span>Admin booking controls backed by MongoDB records</span>
              </div>
            </div>

            <div className="hero-panel">
              <div className="hero-panel-card">
                <p className="hero-panel-label">Reservation Snapshot</p>
                <h2>One booking system for customer, driver, and admin roles</h2>
                <div className="hero-stat-grid">
                  <div>
                    <strong>{featuredVehicles.length || 4}</strong>
                    <span>vehicles listed</span>
                  </div>
                  <div>
                    <strong>{featuredDrivers.length || 2}</strong>
                    <span>drivers published</span>
                  </div>
                  <div>
                    <strong>3</strong>
                    <span>role-specific flows</span>
                  </div>
                </div>
                <div className="hero-panel-actions">
                  <Link to="/cars" className="btn btn-secondary">Browse Fleet</Link>
                  <Link to="/drivers" className="btn btn-outline">Explore Drivers</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-section" id="fleet">
        <div className="container">
          <div className="section-header">
            <h3>Featured Vehicles</h3>
            <h2>Live fleet data connected to the booking flow</h2>
          </div>
          <div className="fleet-grid">
            {featuredVehicles.map((car) => (
              <article key={car._id} className="fleet-card">
                <span className="fleet-tag">{car.location}</span>
                <h3>{car.name}</h3>
                <p>{car.description}</p>
                <div className="fleet-card-footer">
                  <strong>{formatCurrency(car.pricePerDay)}</strong>
                  <Link to={`/cars/${car._id}`}>Reserve</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <h3>How It Works</h3>
            <h2>Reservation management mapped to the project scope</h2>
          </div>
          <div className="grid-3">
            {bookingSteps.map((item) => (
              <div key={item.num} className="process-item">
                <h1 className="process-number">{item.num}</h1>
                <h3 className="process-title">{item.title}</h3>
                <p className="process-des">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <div className="section-header">
            <h3>Driver Marketplace</h3>
            <h2>Published ads customers can book against</h2>
          </div>
          <div className="fleet-grid">
            {featuredDrivers.map((driver) => (
              <article key={driver._id} className="fleet-card">
                <span className="fleet-tag">{driver.serviceLocation}</span>
                <h3>{driver.driver?.fullName || driver.title}</h3>
                <p>{driver.tagline}</p>
                <div className="fleet-card-footer">
                  <strong>{formatCurrency(driver.dailyRate)}</strong>
                  <Link to={`/drivers/${driver._id}`}>View Driver</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="container">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1>Reservation and booking management is now connected to real records instead of placeholder screens.</h1>
              <h3>Use the new vehicle, driver, customer, driver, and admin flows to demo the complete component.</h3>
            </div>
            <Link to={primaryLink} className="btn btn-secondary btn-lg">Open Workspace</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
