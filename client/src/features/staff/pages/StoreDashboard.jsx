import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaBoxes, FaCalendarCheck, FaCarSide, FaClipboardList, FaPlus, FaTools } from 'react-icons/fa'
import API from '../../../api/axios'
import Sidebar from '../../../components/layout/Sidebar'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDate, formatDateRange, getBadgeClass } from '../../../utils/formatters'

const emptyVehicleStats = {
  totalVehicles: 0,
  availableCount: 0,
  reservedCount: 0,
  maintenanceCount: 0,
  inactiveCount: 0
}

const emptyBookingStats = {
  totalBookings: 0,
  pendingCount: 0,
  confirmedCount: 0,
  completedCount: 0,
  paidCount: 0
}

const emptyMaintenanceStats = {
  totalRecords: 0,
  activeCount: 0,
  completedCount: 0,
  unavailableVehicleCount: 0,
  totalCost: 0
}

const emptyInventoryStats = {
  totalItems: 0,
  lowStockCount: 0,
  totalQuantity: 0,
  inventoryValue: 0
}

const bookingStatusLabels = {
  pending: 'Pending approval',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed'
}

const getTime = (value) => {
  const time = value ? new Date(value).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

const getStatusLabel = (value = '') => (
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Not set'
)

export default function StoreDashboard() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [vehicleStats, setVehicleStats] = useState(emptyVehicleStats)
  const [bookings, setBookings] = useState([])
  const [bookingStats, setBookingStats] = useState(emptyBookingStats)
  const [maintenanceRecords, setMaintenanceRecords] = useState([])
  const [maintenanceStats, setMaintenanceStats] = useState(emptyMaintenanceStats)
  const [inventoryItems, setInventoryItems] = useState([])
  const [inventoryStats, setInventoryStats] = useState(emptyInventoryStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    Promise.allSettled([
      API.get('/vehicles/mine/list'),
      API.get('/bookings/staff/list'),
      API.get('/maintenance'),
      API.get('/maintenance/inventory')
    ])
      .then(([vehicleResult, bookingResult, maintenanceResult, inventoryResult]) => {
        if (!active) {
          return
        }

        let failed = false

        if (vehicleResult.status === 'fulfilled') {
          setVehicles(vehicleResult.value.data.vehicles || [])
          setVehicleStats({ ...emptyVehicleStats, ...(vehicleResult.value.data.stats || {}) })
        } else {
          failed = true
        }

        if (bookingResult.status === 'fulfilled') {
          setBookings(bookingResult.value.data.bookings || [])
          setBookingStats({ ...emptyBookingStats, ...(bookingResult.value.data.stats || {}) })
        } else {
          failed = true
        }

        if (maintenanceResult.status === 'fulfilled') {
          setMaintenanceRecords(maintenanceResult.value.data.records || [])
          setMaintenanceStats({ ...emptyMaintenanceStats, ...(maintenanceResult.value.data.stats || {}) })
        } else {
          failed = true
        }

        if (inventoryResult.status === 'fulfilled') {
          setInventoryItems(inventoryResult.value.data.items || [])
          setInventoryStats({ ...emptyInventoryStats, ...(inventoryResult.value.data.stats || {}) })
        } else {
          failed = true
        }

        if (failed) {
          setError('Some store dashboard details could not be loaded.')
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

  const storeRole = useMemo(() => (
    (user?.roles || []).find((role) => role.roleKey === 'staff') || null
  ), [user?.roles])

  const storeProfile = user?.staffProfile || {}
  const firstName = user?.fullName?.split(' ')[0] || 'Store'

  const recentBookings = useMemo(() => (
    [...bookings]
      .sort((first, second) => (
        getTime(second.createdAt) - getTime(first.createdAt)
        || getTime(second.updatedAt) - getTime(first.updatedAt)
      ))
      .slice(0, 5)
  ), [bookings])

  const activeMaintenanceRecords = useMemo(() => (
    maintenanceRecords
      .filter((record) => record.active || ['scheduled', 'in_progress'].includes(record.status))
      .sort((first, second) => getTime(second.updatedAt) - getTime(first.updatedAt))
      .slice(0, 4)
  ), [maintenanceRecords])

  const lowStockItems = useMemo(() => (
    inventoryItems
      .filter((item) => item.lowStock)
      .sort((first, second) => Number(first.quantity || 0) - Number(second.quantity || 0))
      .slice(0, 4)
  ), [inventoryItems])

  const latestVehicle = useMemo(() => (
    [...vehicles].sort((first, second) => getTime(second.updatedAt) - getTime(first.updatedAt))[0] || null
  ), [vehicles])

  const stats = [
    { label: 'Total Vehicles', value: loading ? '...' : vehicleStats.totalVehicles || 0 },
    { label: 'Pending Requests', value: loading ? '...' : bookingStats.pendingCount || 0 },
    { label: 'Active Maintenance', value: loading ? '...' : maintenanceStats.activeCount || 0 },
    { label: 'Low Stock Items', value: loading ? '...' : inventoryStats.lowStockCount || 0 }
  ]

  const workspaceActions = [
    {
      to: '/staff/vehicles',
      icon: <FaCarSide />,
      title: 'Vehicle Listings',
      detail: `${vehicleStats.availableCount || 0} available, ${vehicleStats.reservedCount || 0} reserved`
    },
    {
      to: '/staff/bookings',
      icon: <FaCalendarCheck />,
      title: 'Vehicle Requests',
      detail: `${bookingStats.pendingCount || 0} pending, ${bookingStats.confirmedCount || 0} confirmed`
    },
    {
      to: '/staff/maintenance',
      icon: <FaTools />,
      title: 'Maintenance Records',
      detail: `${maintenanceStats.unavailableVehicleCount || 0} vehicles unavailable`
    },
    {
      to: '/staff/inventory',
      icon: <FaBoxes />,
      title: 'Inventory Items',
      detail: `${inventoryStats.totalQuantity || 0} units in stock`
    }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header quality-header">
          <div>
            <h2>Store Dashboard</h2>
            <p style={{ color: 'var(--text-light)' }}>
              Welcome back, {firstName}. Monitor fleet, reservation, maintenance, and inventory activity from one place.
            </p>
          </div>
          <div className="table-actions">
            <Link className="btn btn-primary" to="/staff/vehicles/new"><FaPlus /> Add Vehicle</Link>
            <Link className="btn btn-outline" to="/profile/store">Store Profile</Link>
          </div>
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

        <div className="customer-dashboard-grid store-dashboard-grid">
          <div className="dashboard-stack">
            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Store Workspace</h3>
                  <p style={{ color: 'var(--text-light)' }}>Open the operational pages used by the store role.</p>
                </div>
              </div>

              <div className="dashboard-action-grid">
                {workspaceActions.map((action) => (
                  <Link key={action.to} className="dashboard-action-link" to={action.to}>
                    <span className="dashboard-action-icon">{action.icon}</span>
                    <span>
                      <strong>{action.title}</strong>
                      <small>{loading ? 'Loading...' : action.detail}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Recent Vehicle Requests</h3>
                  <p style={{ color: 'var(--text-light)' }}>Latest reservations submitted against your vehicle listings.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/staff/bookings">View All</Link>
              </div>

              {loading ? (
                <div className="reservation-empty">Loading vehicle requests...</div>
              ) : recentBookings.length > 0 ? (
                <div className="table-shell">
                  <table className="reservation-table dashboard-table">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Customer</th>
                        <th>Dates</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>
                            <strong>{booking.displayVehicle || 'Vehicle reservation'}</strong>
                            <span>{booking.bookingNo}</span>
                          </td>
                          <td>
                            <strong>{booking.customer?.fullName || 'Unknown customer'}</strong>
                            <span>{booking.customer?.email || 'No email provided'}</span>
                          </td>
                          <td>{formatDateRange(booking.startDate, booking.endDate)}</td>
                          <td>{formatCurrency(booking.totalAmount)}</td>
                          <td>
                            <span className={`badge ${getBadgeClass(booking.bookingStatus)}`}>
                              {bookingStatusLabels[booking.bookingStatus] || getStatusLabel(booking.bookingStatus)}
                            </span>
                            <span>{getStatusLabel(booking.paymentStatus)} payment</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="reservation-empty dashboard-empty-action">
                  <span>No vehicle requests yet.</span>
                  <Link className="btn btn-primary btn-sm" to="/staff/vehicles/new">Add Vehicle</Link>
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-stack">
            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Store Profile</h3>
                  <p style={{ color: 'var(--text-light)' }}>Everyday store identity and contact record.</p>
                </div>
                <FaClipboardList className="quality-avatar-icon" />
              </div>

              <div className="dashboard-summary-list">
                <div className="dashboard-summary-row">
                  <span>Store name</span>
                  <strong>{storeProfile.storeName || 'Not set'}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Owner</span>
                  <strong>{storeProfile.storeOwner || user?.fullName || 'Not set'}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Role status</span>
                  <strong>{getStatusLabel(storeRole?.roleStatus)}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Verification</span>
                  <strong>{getStatusLabel(storeRole?.verificationStatus)}</strong>
                </div>
              </div>

              <div className="pill-row" style={{ marginTop: '1.25rem' }}>
                <Link className="btn btn-outline btn-sm" to="/profile/store">Open Store Profile</Link>
                <Link className="btn btn-primary btn-sm" to="/profile/storeapplication">Open Application</Link>
              </div>
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Fleet Snapshot</h3>
                  <p style={{ color: 'var(--text-light)' }}>Current status split for the store fleet.</p>
                </div>
              </div>

              <div className="dashboard-summary-list">
                <div className="dashboard-summary-row">
                  <span>Available</span>
                  <strong>{loading ? '...' : vehicleStats.availableCount || 0}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Reserved</span>
                  <strong>{loading ? '...' : vehicleStats.reservedCount || 0}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Maintenance</span>
                  <strong>{loading ? '...' : vehicleStats.maintenanceCount || 0}</strong>
                </div>
                <div className="dashboard-summary-row">
                  <span>Inactive</span>
                  <strong>{loading ? '...' : vehicleStats.inactiveCount || 0}</strong>
                </div>
              </div>

              {latestVehicle && (
                <div className="dashboard-latest-payment">
                  <span>Latest listing update</span>
                  <strong>{latestVehicle.name}</strong>
                  <small>{latestVehicle.vehicleCode} | {formatDate(latestVehicle.updatedAt)}</small>
                </div>
              )}
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Maintenance Watch</h3>
                  <p style={{ color: 'var(--text-light)' }}>Active service work affecting fleet availability.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/staff/maintenance">Open</Link>
              </div>

              {loading ? (
                <div className="reservation-empty">Loading maintenance records...</div>
              ) : activeMaintenanceRecords.length > 0 ? (
                <div className="dashboard-compact-list">
                  {activeMaintenanceRecords.map((record) => (
                    <div key={record._id} className="dashboard-compact-item">
                      <div>
                        <strong>{record.vehicleName || record.vehicle?.name || 'Vehicle'}</strong>
                        <span>{record.type} | {formatDate(record.updatedAt)}</span>
                      </div>
                      <span className={`badge ${getBadgeClass(record.status)}`}>{getStatusLabel(record.status)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No active maintenance records.</div>
              )}
            </section>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Inventory Watch</h3>
                  <p style={{ color: 'var(--text-light)' }}>Low stock items and total stock value.</p>
                </div>
                <Link className="btn btn-outline btn-sm" to="/staff/inventory">Open</Link>
              </div>

              <div className="dashboard-summary-row">
                <span>Stock value</span>
                <strong>{loading ? '...' : formatCurrency(inventoryStats.inventoryValue || 0)}</strong>
              </div>

              {loading ? (
                <div className="reservation-empty">Loading inventory items...</div>
              ) : lowStockItems.length > 0 ? (
                <div className="dashboard-compact-list">
                  {lowStockItems.map((item) => (
                    <div key={item._id} className="dashboard-compact-item">
                      <div>
                        <strong>{item.itemName}</strong>
                        <span>{item.description || 'No description'}</span>
                      </div>
                      <span className="badge badge-warning">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No low stock inventory items.</div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
