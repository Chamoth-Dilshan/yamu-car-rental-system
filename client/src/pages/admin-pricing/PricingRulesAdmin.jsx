import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

export default function PricingRulesAdmin() {
  const [rules, setRules] = useState([]);
  
  const initialForm = {
    name: '', ruleType: 'weekend', adjustmentType: 'percentage',
    adjustmentDirection: 'increase', adjustmentValue: 0, priority: 0,
    status: 'active', startDate: '', endDate: ''
  };
  
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const { user } = useAuth();
  
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await api.get('/pricing/rules', { headers: { Authorization: `Bearer ${user.token}` } });
      setRules(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch pricing rules');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Mock conditions based on ruleType
      let conditions = {};
      if (form.ruleType === 'weekend') {
        conditions = { daysOfWeek: [0, 6] }; // Sun, Sat
      } else if (form.ruleType === 'long-duration') {
        conditions = { minDays: 7 }; // 7 days or more
      }

      const payload = { 
        ...form, 
        conditions,
        startDate: form.startDate || null,
        endDate: form.endDate || null
      };

      if (editingId) {
        await api.put(`/pricing/rules/${editingId}`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      } else {
        await api.post('/pricing/rules', payload, { headers: { Authorization: `Bearer ${user.token}` } });
      }
      setEditingId(null);
      setForm(initialForm);
      fetchRules();
    } catch (err) {
      console.error(err);
      alert('Failed to save pricing rule');
    }
  };

  const handleEdit = (r) => {
    setEditingId(r._id);
    setForm({
      name: r.name,
      ruleType: r.ruleType,
      adjustmentType: r.adjustmentType,
      adjustmentDirection: r.adjustmentDirection,
      adjustmentValue: r.adjustmentValue,
      priority: r.priority || 0,
      status: r.status,
      startDate: r.startDate ? new Date(r.startDate).toISOString().substring(0, 10) : '',
      endDate: r.endDate ? new Date(r.endDate).toISOString().substring(0, 10) : ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pricing rule?')) return;
    try {
      await api.delete(`/pricing/rules/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      fetchRules();
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
            <h1>Pricing Rules Management</h1>
            <p>Define rules for dynamic pricing (e.g., weekend surges, long-duration discounts).</p>
          </div>

          <div className="admin-card">
            <h3>{editingId ? 'Edit Rule' : 'Create Rule'}</h3>
            <form className="admin-form" onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
              
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              
              <div className="form-group">
                <label>Rule Type</label>
                <select value={form.ruleType} onChange={e => setForm({...form, ruleType: e.target.value})}>
                  <option value="weekend">Weekend Surge (Sat, Sun)</option>
                  <option value="holiday">Holiday Season</option>
                  <option value="long-duration">Long Duration (7+ days)</option>
                  <option value="demand">High Demand</option>
                </select>
              </div>

              <div className="form-group">
                <label>Adjustment Direction</label>
                <select value={form.adjustmentDirection} onChange={e => setForm({...form, adjustmentDirection: e.target.value})}>
                  <option value="increase">Increase Price (+)</option>
                  <option value="decrease">Decrease Price (-)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Adjustment Type</label>
                <select value={form.adjustmentType} onChange={e => setForm({...form, adjustmentType: e.target.value})}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div className="form-group">
                <label>Adjustment Value</label>
                <input type="number" step="0.01" value={form.adjustmentValue} onChange={e => setForm({...form, adjustmentValue: e.target.value})} required />
              </div>

              <div className="form-group">
                <label>Priority (Higher executes first)</label>
                <input type="number" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date (Optional)</label>
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date (Optional)</label>
                <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
              </div>

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="button button-primary">Save Rule</button>
                {editingId && <button type="button" className="button button-secondary" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-card">
            <h3>Pricing Rules List</h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Adjustment</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r._id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.ruleType}</td>
                      <td>{r.adjustmentDirection === 'increase' ? '+' : '-'}{r.adjustmentType === 'percentage' ? `${r.adjustmentValue}%` : `$${r.adjustmentValue}`}</td>
                      <td>{r.priority}</td>
                      <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                      <td>
                        <button className="button button-small button-outline" onClick={() => handleEdit(r)}>Edit</button>
                        <button className="button button-small button-danger" onClick={() => handleDelete(r._id)} style={{marginLeft: '0.5rem'}}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && <tr><td colSpan="6">No pricing rules found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
