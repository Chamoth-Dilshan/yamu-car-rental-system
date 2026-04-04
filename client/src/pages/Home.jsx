import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const featuredCars = [
  {
    name: 'City Compact',
    tag: 'Best for daily errands',
    price: 'LKR 28/day',
    description: 'Fuel-efficient and easy to park for quick runs around town.'
  },
  {
    name: 'Family SUV',
    tag: 'Most popular choice',
    price: 'LKR 52/day',
    description: 'Spacious interior, strong AC, and room for luggage on longer drives.'
  },
  {
    name: 'Executive Sedan',
    tag: 'Business and airport trips',
    price: 'LKR 46/day',
    description: 'Comfort-focused travel with a polished look for meetings and pickups.'
  }
];

const bookingSteps = [
  {
    num: '1',
    title: 'Create your account',
    desc: 'Register once so you can manage bookings, profile details, and rental preferences.'
  },
  {
    num: '2',
    title: 'Choose your car',
    desc: 'Pick a practical compact, a roomy SUV, or a sedan that fits your trip.'
  },
  {
    num: '3',
    title: 'Drive with confidence',
    desc: 'Confirm your ride, collect the vehicle, and head out with clear rental support.'
  }
];

export default function Home() {
  const { user } = useAuth();
  const isAdmin = (user?.activeRole || user?.role) === 'admin';

  const primaryLink = isAdmin ? '/admin/dashboard' : user ? '/account' : '/signup';
  const primaryText = isAdmin ? 'Open Dashboard' : user ? 'Open Account' : 'Create Account';
  const secondaryLink = isAdmin ? '/admin/signin' : '/signin';
  const secondaryText = isAdmin ? 'Admin Login' : user ? 'Sign In as Another User' : 'Sign In';

  return (
    <div className="page-content">
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="text-box">
              <h3>YAMU Car Rental</h3>
              <h1>Rent the right <span>car</span> for your trip</h1>
              <p>
                Easy booking for daily travel, airport pickups, and weekend plans.
              </p>
              <div className="btn-group">
                <Link to={primaryLink} className="btn btn-primary btn-lg">{primaryText}</Link>
                <a href="#fleet" className="btn btn-outline btn-lg">Browse Fleet</a>
              </div>
            </div>

            <div className="hero-panel">
              <div className="hero-panel-card">
                <p className="hero-panel-label">Quick Booking</p>
                <h2>Book in minutes</h2>
                <div className="hero-stat-grid">
                  <div>
                    <strong>12+</strong>
                    <span>cars ready</span>
                  </div>
                  <div>
                    <strong>24/7</strong>
                    <span>support</span>
                  </div>
                  <div>
                    <strong>3 steps</strong>
                    <span>to rent</span>
                  </div>
                </div>
                <div className="hero-panel-actions">
                  <Link to={secondaryLink} className="btn btn-secondary">{secondaryText}</Link>
                  <Link to={primaryLink} className="btn btn-outline">Start Renting</Link>
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
            <h2>Simple options for the most common trips</h2>
          </div>
          <div className="fleet-grid">
            {featuredCars.map((car) => (
              <article key={car.name} className="fleet-card">
                <span className="fleet-tag">{car.tag}</span>
                <h3>{car.name}</h3>
                <p>{car.description}</p>
                <div className="fleet-card-footer">
                  <strong>{car.price}</strong>
                  <Link to={primaryLink}>Reserve</Link>
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
            <h2>Get a rental without extra friction</h2>
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

      <section className="cta-banner">
        <div className="container">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1>Plan the trip, choose the car, and keep your account ready for the next booking.</h1>
              <h3>Start with a quick sign-up or return to your account to manage rental details.</h3>
            </div>
            <Link to={primaryLink} className="btn btn-secondary btn-lg">Get Started</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
