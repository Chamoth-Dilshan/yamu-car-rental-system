import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaLifeRing } from 'react-icons/fa'
import Sidebar from '../../../components/layout/Sidebar'
import { formatDateTime } from '../../../utils/formatters'
import { getComplaintContext, submitComplaint } from '../reviewApi'

const categories = [
  { value: 'vehicle', label: 'Vehicle Issue' },
  { value: 'billing', label: 'Billing' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' }
]

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

export default function ComplaintForm() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [context, setContext] = useState(null)
  const [form, setForm] = useState({
    subject: '',
    category: 'service',
    priority: 'low',
    description: '',
    attachment: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getComplaintContext(bookingId)
      .then((res) => {
        if (active) {
          setContext(res.data)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load booking')
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
  }, [bookingId])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await submitComplaint({
        bookingId,
        ...form
      })

      navigate('/bookings', {
        state: {
          message: 'Complaint submitted. Admin updates will appear in notifications.'
        }
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint')
    } finally {
      setSubmitting(false)
    }
  }

  const booking = context?.booking
  const previousComplaints = context?.complaints || []

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Submit a Complaint</h2>
          <p style={{ color: 'var(--text-light)' }}>Create a support ticket for a booking and track updates in notifications.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="form-card reservation-empty">Loading booking...</div>
        ) : booking ? (
          <div className="quality-two-column quality-form-layout">
            <section className="form-card quality-form-card">
              <div className="card-header">
                <div>
                  <h3><FaLifeRing /> {booking.bookingNo}</h3>
                  <p style={{ color: 'var(--text-light)' }}>{booking.displayVehicle}</p>
                </div>
                <span className="badge badge-info">{booking.bookingStatus}</span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    value={form.subject}
                    onChange={(event) => updateField('subject', event.target.value)}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                      {categories.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={form.priority} onChange={(event) => updateField('priority', event.target.value)}>
                      {priorities.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="7"
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Provide detailed information about the complaint..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Attachment Reference</label>
                  <input
                    value={form.attachment}
                    onChange={(event) => updateField('attachment', event.target.value)}
                    placeholder="Optional file name, drive link, or reference"
                  />
                </div>

                <div className="pill-row">
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                  </button>
                  <Link className="btn btn-outline" to="/bookings">Cancel</Link>
                </div>
              </form>
            </section>

            <aside className="form-card quality-side-panel">
              <h3>Previous Complaints</h3>
              {previousComplaints.length > 0 ? (
                <div className="quality-stack">
                  {previousComplaints.map((complaint) => (
                    <div key={complaint._id} className="quality-mini-row">
                      <div>
                        <strong>{complaint.subject}</strong>
                        <span>{formatDateTime(complaint.createdAt)}</span>
                      </div>
                      <span className="badge badge-info">{complaint.statusLabel}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reservation-empty">No complaints for this booking yet.</div>
              )}
            </aside>
          </div>
        ) : (
          <div className="form-card reservation-empty">Booking not found.</div>
        )}
      </main>
    </div>
  )
}
