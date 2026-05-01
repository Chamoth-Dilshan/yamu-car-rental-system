import { useEffect, useMemo, useState } from 'react'
import { FaPaperPlane, FaSearch, FaTimes, FaUserCircle } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { formatDate, getBadgeClass } from '../../../utils/formatters'
import { getAdminComplaints, updateComplaintStatus } from '../reviewApi'

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'solved', label: 'Solved' }
]

const statusMessages = {
  pending: 'We have received your complaint and placed it in the pending queue.',
  under_review: 'We are reviewing your complaint and will update you after checking the booking details.',
  solved: 'Your complaint has been marked as solved. Thank you for your patience.'
}

const priorityOptions = ['all', 'low', 'medium', 'high']

function labelize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function AdminDisputes() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all' })
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchComplaints = () => {
    setLoading(true)
    setError('')

    getAdminComplaints()
      .then((res) => {
        setComplaints(res.data.complaints || [])
        setStats(res.data.stats || null)
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load complaints'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const filteredComplaints = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return complaints.filter((complaint) => {
      const matchesSearch = !search || [
        complaint.subject,
        complaint.bookingNo,
        complaint.customer?.fullName,
        complaint.customer?.email
      ].some((value) => String(value || '').toLowerCase().includes(search))
      const matchesStatus = filters.status === 'all' || complaint.status === filters.status
      const matchesPriority = filters.priority === 'all' || complaint.priority === filters.priority

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [complaints, filters])

  const openComplaint = (complaint) => {
    setSelectedComplaint(complaint)
    setSelectedStatus(complaint.status || 'pending')
    setNotificationMessage(statusMessages[complaint.status] || complaint.latestAdminMessage || '')
  }

  const updateSelectedStatus = (status) => {
    setSelectedStatus(status)
    setNotificationMessage(statusMessages[status] || '')
  }

  const handleSendUpdate = async () => {
    if (!selectedComplaint) {
      return
    }

    setBusyAction(`status-${selectedComplaint._id}`)
    setMessage('')
    setError('')

    try {
      const res = await updateComplaintStatus(selectedComplaint._id, {
        status: selectedStatus,
        message: notificationMessage
      })

      setComplaints((current) => current.map((complaint) => (
        complaint._id === selectedComplaint._id ? res.data.complaint : complaint
      )))
      setMessage('Complaint updated and customer notified')
      setSelectedComplaint(null)
      fetchComplaints()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update complaint')
    } finally {
      setBusyAction('')
    }
  }

  const summaryCards = [
    { label: 'Total Complaints', value: stats?.totalComplaints || 0 },
    { label: 'Pending', value: stats?.pendingComplaints || 0 },
    { label: 'Under Review', value: stats?.underReviewComplaints || 0 },
    { label: 'Solved', value: stats?.solvedComplaints || 0 }
  ]

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Dispute Management</h2>
          <p style={{ color: 'var(--text-light)' }}>Review customer complaints, update status, and notify customers.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="stats-grid">
          {summaryCards.map((item) => (
            <div key={item.label} className="stat-card">
              <div className="stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="form-card">
          <div className="admin-user-filters">
            <div className="form-group">
              <label>Search</label>
              <div className="quality-search-field">
                <FaSearch />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search booking, subject, or customer"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All Statuses</option>
                {statusOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
                {priorityOptions.map((item) => (
                  <option key={item} value={item}>{item === 'all' ? 'All Priorities' : labelize(item)}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="reservation-empty">Loading complaints...</div>
          ) : filteredComplaints.length > 0 ? (
            <div className="table-shell">
              <table className="reservation-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td>{complaint.bookingNo}</td>
                      <td>
                        <strong>{complaint.customer?.fullName || 'Customer'}</strong>
                        <span>{complaint.customer?.email || ''}</span>
                      </td>
                      <td>
                        <strong>{complaint.subject}</strong>
                        <span>{labelize(complaint.category)}</span>
                      </td>
                      <td><span className={`badge ${getBadgeClass(complaint.priority)}`}>{labelize(complaint.priority)}</span></td>
                      <td><span className={`badge ${getBadgeClass(complaint.status)}`}>{complaint.statusLabel}</span></td>
                      <td>{formatDate(complaint.createdAt)}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => openComplaint(complaint)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="reservation-empty">No complaints match the current filters.</div>
          )}
        </section>

        {selectedComplaint && (
          <div className="quality-modal-overlay">
            <div className="quality-modal form-card">
              <div className="quality-modal-header">
                <div>
                  <h3>{selectedComplaint.subject}</h3>
                  <p>{selectedComplaint.bookingNo} | {selectedComplaint.customer?.fullName || 'Customer'}</p>
                </div>
                <button className="quality-icon-button" type="button" onClick={() => setSelectedComplaint(null)} aria-label="Close">
                  <FaTimes />
                </button>
              </div>

              <div className="quality-complaint-detail">
                <div className="quality-customer-line">
                  <FaUserCircle />
                  <div>
                    <strong>{selectedComplaint.customer?.fullName || 'Customer'}</strong>
                    <span>{selectedComplaint.customer?.email || 'No email'}</span>
                  </div>
                </div>
                <p>{selectedComplaint.description}</p>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="quality-status-buttons">
                  {statusOptions.map((item) => (
                    <button
                      key={item.value}
                      className={selectedStatus === item.value ? 'active' : ''}
                      type="button"
                      onClick={() => updateSelectedStatus(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Notification Message</label>
                <textarea
                  rows="5"
                  value={notificationMessage}
                  onChange={(event) => setNotificationMessage(event.target.value)}
                  placeholder="Message sent to the customer notification center"
                />
              </div>

              <div className="pill-row">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busyAction === `status-${selectedComplaint._id}`}
                  onClick={handleSendUpdate}
                >
                  <FaPaperPlane /> {busyAction === `status-${selectedComplaint._id}` ? 'Sending...' : 'Update & Notify'}
                </button>
                <button className="btn btn-outline" type="button" onClick={() => setSelectedComplaint(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
