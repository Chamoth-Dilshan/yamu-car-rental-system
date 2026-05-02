import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import PromotionCountdown from '../../components/PromotionCountdown';
import { formatCurrency } from '../../utils/formatCurrency';

export default function PromotionsAdmin() {
  const [promotions, setPromotions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  
  const initialForm = {
    campaignId: '', title: '', code: '', discountType: 'percentage', discountValue: 0,
    minBookingAmount: 0, bookingType: 'any', vehicleCategory: 'any',
    firstTimeUserOnly: false, totalUsageLimit: 100, perUserUsageLimit: 1,
    startDate: '', endDate: '', status: 'active', priority: 0
  };
  
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const { user } = useAuth();
  
  useEffect(() => {
    fetchPromotions();
    fetchCampaigns();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await api.get('/pricing/promotions', { headers: { Authorization: `Bearer ${user.token}` } });
      setPromotions(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch promotions');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/pricing/campaigns', { headers: { Authorization: `Bearer ${user.token}` } });
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    clearMessages();
    setBusyAction('save');
    try {
      const payload = { ...form, campaignId: form.campaignId || null };
      if (editingId) {
        await api.put(`/pricing/promotions/${editingId}`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
        setMessage('Promotion updated successfully');
      } else {
        await api.post('/pricing/promotions', payload, { headers: { Authorization: `Bearer ${user.token}` } });
        setMessage('Promotion created successfully');
      }
      setEditingId(null);
      setForm(initialForm);
      fetchPromotions();
    } catch (err) {
      console.error(err);
      setError('Failed to save promotion');
    } finally {
      setBusyAction('');
    }
  };

  const handleEdit = (p) => {
    setEditingId(p._id);
    clearMessages();
    setForm({
      campaignId: p.campaignId?._id || '',
      title: p.title,
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minBookingAmount: p.minBookingAmount,
      bookingType: p.bookingType,
      vehicleCategory: p.vehicleCategory,
      firstTimeUserOnly: p.firstTimeUserOnly,
      totalUsageLimit: p.totalUsageLimit,
      perUserUsageLimit: p.perUserUsageLimit,
      startDate: p.startDate ? new Date(p.startDate).toISOString().substring(0, 10) : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().substring(0, 10) : '',
      status: p.status,
      priority: p.priority || 0
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promotion?')) return;
    clearMessages();
    setBusyAction(`delete-${id}`);
    try {
      await api.delete(`/pricing/promotions/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setMessage('Promotion deleted');
      fetchPromotions();
    } catch (err) {
      console.error(err);
      setError('Failed to delete promotion');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Promotions Management</h2>
          <p style={{ color: 'var(--text-light)' }}>Create redeemable discount codes mapping to particular criteria.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="admin-section-grid" style={{ gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)' }}>
          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>{editingId ? 'Edit Promotion' : 'Create Promotion'}</h3>
                <p style={{ color: 'var(--text-light)' }}>Configure conditions and discount mechanics.</p>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. 50% Off Luxury" />
                </div>
                <div className="form-group">
                  <label>Promo Code (Unique)</label>
                  <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. LUX50" />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Discount Value</label>
                  <input type="number" step="0.01" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Linked Campaign (Optional)</label>
                  <select value={form.campaignId} onChange={e => setForm({...form, campaignId: e.target.value})}>
                    <option value="">None</option>
                    {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>Mock Adapter Rules / Extra Configuration</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vehicle Category</label>
                    <select value={form.vehicleCategory} onChange={e => setForm({...form, vehicleCategory: e.target.value})}>
                      <option value="any">Any</option>
                      <option value="Economy">Economy</option>
                      <option value="Standard">Standard</option>
                      <option value="Luxury">Luxury</option>
                      <option value="SUV">SUV</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Booking Type</label>
                    <select value={form.bookingType} onChange={e => setForm({...form, bookingType: e.target.value})}>
                      <option value="any">Any</option>
                      <option value="with-driver">With Driver</option>
                      <option value="without-driver">Without Driver</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Min Booking Amount (LKR)</label>
                    <input type="number" value={form.minBookingAmount} onChange={e => setForm({...form, minBookingAmount: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>System Priority (Higher = First)</label>
                    <input type="number" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-chip">
                    <input type="checkbox" checked={form.firstTimeUserOnly} onChange={e => setForm({...form, firstTimeUserOnly: e.target.checked})} />
                    Require First Time User Only
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={busyAction === 'save'}>
                  {busyAction === 'save' ? 'Saving...' : 'Save Promotion'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline" style={{ marginLeft: '1rem' }} onClick={() => { setEditingId(null); setForm(initialForm); clearMessages(); }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>Promotions List</h3>
                <p style={{ color: 'var(--text-light)' }}>List of all generated promo codes.</p>
              </div>
            </div>
            
            {promotions.length > 0 ? (
              <div className="admin-stack">
                {promotions.map(p => (
                  <div key={p._id} className="admin-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ marginBottom: '0.2rem' }}>{p.code} <span style={{ color: 'var(--text-light)', fontWeight: 'normal', fontSize: '0.9rem' }}>- {p.title}</span></h4>
                        <p style={{ fontSize: '0.85rem' }}>
                          Discount: {p.discountType === 'percentage' ? `${p.discountValue}%` : formatCurrency(p.discountValue)}
                        </p>
                        {p.campaignId && (
                          <div style={{ marginTop: '0.4rem' }}>
                            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Campaign: {p.campaignId.name}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <span className={`badge badge-${p.status === 'active' ? 'success' : 'warning'}`}>{p.status}</span>
                        {p.status === 'active' && <PromotionCountdown endDate={p.endDate} />}
                      </div>
                    </div>
                    
                    <div className="admin-data-grid">
                       <div className="admin-data-item">
                          <span>Valid During</span>
                          <strong>{new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</strong>
                       </div>
                       <div className="admin-data-item">
                          <span>Vehicle Cat.</span>
                          <strong>{p.vehicleCategory}</strong>
                       </div>
                    </div>

                    <div className="pill-row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" disabled={busyAction === `delete-${p._id}`} onClick={() => handleDelete(p._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">No promotions configured.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
