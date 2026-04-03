import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

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
      alert('Failed to fetch promotions');
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, campaignId: form.campaignId || null };
      if (editingId) {
        await api.put(`/pricing/promotions/${editingId}`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      } else {
        await api.post('/pricing/promotions', payload, { headers: { Authorization: `Bearer ${user.token}` } });
      }
      setEditingId(null);
      setForm(initialForm);
      fetchPromotions();
    } catch (err) {
      console.error(err);
      alert('Failed to save promotion');
    }
  };

  const handleEdit = (p) => {
    setEditingId(p._id);
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
    try {
      await api.delete(`/pricing/promotions/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      fetchPromotions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="admin-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="admin-header">
            <h1>Promotions Management</h1>
          </div>

          <div className="admin-card">
            <h3>{editingId ? 'Edit Promotion' : 'Create Promotion'}</h3>
            <form className="admin-form" onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
              
              <div className="form-group">
                <label>Campaign (Optional)</label>
                <select value={form.campaignId} onChange={e => setForm({...form, campaignId: e.target.value})}>
                  <option value="">None</option>
                  {campaigns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Promo Code (Unique)</label>
                <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
              </div>
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
              <div className="form-group">
                <label>Min Booking Amount</label>
                <input type="number" value={form.minBookingAmount} onChange={e => setForm({...form, minBookingAmount: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Booking Type (Mock Adapter)</label>
                <select value={form.bookingType} onChange={e => setForm({...form, bookingType: e.target.value})}>
                  <option value="any">Any</option>
                  <option value="with-driver">With Driver</option>
                  <option value="without-driver">Without Driver</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle Category (Mock Adapter)</label>
                <select value={form.vehicleCategory} onChange={e => setForm({...form, vehicleCategory: e.target.value})}>
                  <option value="any">Any</option>
                  <option value="Economy">Economy</option>
                  <option value="Standard">Standard</option>
                  <option value="Luxury">Luxury</option>
                  <option value="SUV">SUV</option>
                </select>
              </div>
              
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="firstTime" checked={form.firstTimeUserOnly} onChange={e => setForm({...form, firstTimeUserOnly: e.target.checked})} />
                <label htmlFor="firstTime" style={{ margin: 0 }}>First Time User Only</label>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
              </div>

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="button button-primary">Save Promotion</button>
                {editingId && <button type="button" className="button button-secondary" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-card">
            <h3>Promotions List</h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Discount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map(p => (
                    <tr key={p._id}>
                      <td><strong>{p.code}</strong></td>
                      <td>{p.title}</td>
                      <td>{p.discountType === 'percentage' ? `${p.discountValue}%` : `$${p.discountValue}`}</td>
                      <td><span className={`status-badge status-${p.status}`}>{p.status}</span></td>
                      <td>
                        <button className="button button-small button-outline" onClick={() => handleEdit(p)}>Edit</button>
                        <button className="button button-small button-danger" onClick={() => handleDelete(p._id)} style={{marginLeft: '0.5rem'}}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {promotions.length === 0 && <tr><td colSpan="5">No promotions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
