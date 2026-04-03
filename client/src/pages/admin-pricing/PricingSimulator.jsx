import React, { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

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
  const { user } = useAuth();

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
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
      alert('Failed to simulate price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="admin-header">
            <h1>Pricing Simulator</h1>
            <p>Mock a booking to see how pricing rules and promotions apply. This tests the core Engine.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="admin-card">
              <h3>Simulation Input (Mock Booking)</h3>
              <form className="admin-form" onSubmit={handleSimulate}>
                <div className="form-group">
                  <label>Daily Base Price ($)</label>
                  <input type="number" step="0.01" value={form.basePrice} onChange={e => setForm({...form, basePrice: e.target.value})} required />
                </div>
                
                <div className="form-group">
                  <label>Duration (Days)</label>
                  <input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                </div>

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

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="firstBooking" checked={form.isFirstBooking} onChange={e => setForm({...form, isFirstBooking: e.target.checked})} />
                  <label htmlFor="firstBooking" style={{ margin: 0 }}>Is First Booking?</label>
                </div>

                <div className="form-group">
                  <label>Promo Code to Apply</label>
                  <input type="text" value={form.promoCode} onChange={e => setForm({...form, promoCode: e.target.value})} placeholder="Optional" />
                </div>

                <button type="submit" className="button button-primary" disabled={loading}>
                  {loading ? 'Simulating...' : 'Calculate Final Price'}
                </button>
              </form>
            </div>

            <div className="admin-card">
              <h3>Simulation Result</h3>
              {result ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontSize: '1.2rem', color: '#666' }}>Subtotal (Base x Duration):</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${result.originalPrice.toFixed(2)}</span>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Adjustments & Discounts:</h4>
                    {result.breakdown.length === 0 ? (
                      <p style={{ color: '#888', fontStyle: 'italic' }}>No rules or promotions applied.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {result.breakdown.map((item, i) => (
                          <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: item.impact < 0 ? 'green' : 'red' }}>
                            <span>
                              {item.type === 'error' ? '⚠️ ' : (item.impact < 0 ? '↓ ' : '↑ ')}
                              {item.name}
                            </span>
                            <span>{item.type === 'error' ? '' : (item.impact > 0 ? '+' : '')}{item.impact.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #ccc' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Final Payable:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0d1b2a' }}>${result.finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                  Run simulation to see results.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
