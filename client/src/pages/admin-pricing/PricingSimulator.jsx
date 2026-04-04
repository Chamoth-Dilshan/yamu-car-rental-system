import React, { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import { formatCurrency } from '../../utils/formatCurrency';

export default function PricingSimulator() {
  const [form, setForm] = useState({
    basePrice: 50,
    duration: 3,
    startDate: new Date().toISOString().substring(0, 10),
    vehicleCategory: 'Economy',
    bookingType: 'without-driver',
    isFirstBooking: false,
    promoCode: ''
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const payload = {
        bookingDetails: {
          basePrice: Number(form.basePrice),
          duration: Number(form.duration),
          startDate: form.startDate,
          vehicleCategory: form.vehicleCategory,
          bookingType: form.bookingType,
          isFirstBooking: form.isFirstBooking
        },
        promoCode: form.promoCode || null
      };

      const res = await api.post('/pricing/simulate', payload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Simulation logic failed. Check input bounds.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Pricing Simulator Engine</h2>
          <p style={{ color: 'var(--text-light)' }}>Mock a user checkout scenario to test active rules and promo logic output directly from the backend.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="admin-section-grid">
          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>1. Input Test Data</h3>
                <p style={{ color: 'var(--text-light)' }}>Simulate variables passed from the Booking Module.</p>
              </div>
            </div>
            <form onSubmit={handleSimulate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Daily Base Price (LKR)</label>
                  <input type="number" step="0.01" value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Total Duration (Days)</label>
                  <input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Booking Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Promo Code to Apply</label>
                  <input type="text" value={form.promoCode} onChange={e => setForm({...form, promoCode: e.target.value})} placeholder="Optional override code" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Category</label>
                  <select value={form.vehicleCategory} onChange={e => setForm({...form, vehicleCategory: e.target.value})}>
                    <option value="Economy">Economy</option>
                    <option value="Standard">Standard</option>
                    <option value="Luxury">Luxury</option>
                    <option value="SUV">SUV</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Booking Type</label>
                  <select value={form.bookingType} onChange={e => setForm({...form, bookingType: e.target.value})}>
                    <option value="without-driver">Without Driver</option>
                    <option value="with-driver">With Driver</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-chip">
                  <input type="checkbox" checked={form.isFirstBooking} onChange={e => setForm({...form, isFirstBooking: e.target.checked})} />
                  Simulate as First-Time User
                </label>
              </div>

              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Crunching Numbers...' : 'Run Pricing Engine Calculation'}
                </button>
              </div>
            </form>
          </section>

          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>2. Calculation Output</h3>
                <p style={{ color: 'var(--text-light)' }}>The resultant price breakdown map.</p>
              </div>
            </div>
            
            {result ? (
              <div className="admin-stack" style={{ gap: '0' }}>
                <div className="admin-list-item" style={{ borderBottom: 'none', borderRadius: 'var(--radius) var(--radius) 0 0', background: 'transparent' }}>
                  <div>
                    <h4>Raw Subtotal</h4>
                    <p>Base price × Duration</p>
                  </div>
                  <strong style={{ fontSize: '1.25rem' }}>{formatCurrency(result.originalPrice)}</strong>
                </div>

                <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '1rem 0', margin: '0 1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Applied Rule Stack</h4>
                  {result.breakdown.length === 0 ? (
                    <div className="admin-empty-state" style={{ padding: '0', textAlign: 'left' }}>No pricing rules or valid promotions attached.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {result.breakdown.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.95rem' }}>
                            <span className={`badge badge-${item.type === 'error' ? 'danger' : (item.impact < 0 ? 'success' : 'warning')}`} style={{ marginRight: '0.5rem' }}>
                              {item.type === 'error' ? 'ERR' : (item.impact < 0 ? 'DISCOUNT' : 'SURGE')}
                            </span>
                            {item.name}
                          </span>
                          <strong style={{ color: item.type === 'error' ? 'var(--danger)' : (item.impact < 0 ? 'var(--success)' : 'var(--warning)') }}>
                            {item.type === 'error' ? '' : (item.impact > 0 ? '+' : '-')}{formatCurrency(Math.abs(item.impact))}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-list-item" style={{ border: 'none', background: 'transparent', marginTop: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Final Invoice Total</h4>
                    <p>Amount sent to payment gateway target.</p>
                  </div>
                  <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>{formatCurrency(result.finalPrice)}</strong>
                </div>
              </div>
            ) : (
              <div className="admin-empty-state" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Run the simulation on the left to view the engine's price decomposition.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
