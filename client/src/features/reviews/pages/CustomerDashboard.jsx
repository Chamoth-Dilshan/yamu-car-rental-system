import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { getCustomerQualityDashboard } from '../reviewApi'

const emptyDashboard = {
  averageDriverRating: 0,
  averageVehicleRating: 0,
  totalApprovedReviews: 0
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getCustomerQualityDashboard()
      .then((res) => {
        if (active) {
          setDashboard({ ...emptyDashboard, ...res.data })
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load dashboard')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const stats = [
    { label: 'Avg Driver Rating', value: loading ? '...' : `${Number(dashboard.averageDriverRating || 0).toFixed(1)}/5` },
    { label: 'Avg Vehicle Rating', value: loading ? '...' : `${Number(dashboard.averageVehicleRating || 0).toFixed(1)}/5` },
    { label: 'Approved Reviews', value: loading ? '...' : dashboard.totalApprovedReviews || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header quality-header">
          <div>
            <h2>Customer Dashboard</h2>
            <p style={{ color: 'var(--text-light)' }}>
              Welcome back, {user?.fullName?.split(' ')[0] || 'Customer'}. Review your ratings summary and bookings.
            </p>
          </div>
          <Link className="btn btn-primary" to="/bookings">Open My Bookings</Link>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="stat-card">
              <div className="stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
