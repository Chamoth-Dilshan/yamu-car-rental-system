import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency } from '../../utils/formatters';

export default function PricingRulesAdmin() {
  const [rules, setRules] = useState([]);
  
  const initialForm = {
    name: '', ruleType: 'weekend', adjustmentType: 'percentage',
    adjustmentDirection: 'increase', adjustmentValue: 0, priority: 0,
    status: 'active', startDate: '', endDate: ''
  };
  
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
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
      setError('Failed to fetch pricing rules');
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
        setMessage('Pricing rule updated successfully');
      } else {
        await api.post('/pricing/rules', payload, { headers: { Authorization: `Bearer ${user.token}` } });
        setMessage('Pricing rule created successfully');
      }
      setEditingId(null);
      setForm(initialForm);
      fetchRules();
    } catch (err) {
      console.error(err);
      setError('Failed to save pricing rule');
    } finally {
      setBusyAction('');
    }
  };

  const handleEdit = (r) => {
    setEditingId(r._id);
    clearMessages();
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
    clearMessages();
    setBusyAction(`delete-${id}`);
    try {
      await api.delete(`/pricing/rules/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setMessage('Pricing rule deleted');
      fetchRules();
    } catch (err) {
      console.error(err);
      setError('Failed to delete pricing rule');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Pricing Rules Management</h2>
          <p style={{ color: 'var(--text-light)' }}>Define universal base price adjustment logic independent of user promotions.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="admin-section-grid" style={{ gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)' }}>
          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>{editingId ? 'Edit Rule' : 'Create Rule'}</h3>
                <p style={{ color: 'var(--text-light)' }}>e.g. Weekend Surges, Long-Term Discounts</p>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Rule Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Weekend Surge" />
                </div>
                <div className="form-group">
                  <label>Rule Condition (Mock Input)</label>
                  <select value={form.ruleType} onChange={e => setForm({...form, ruleType: e.target.value})}>
                    <option value="weekend">Weekend Surge (Sat, Sun)</option>
                    <option value="holiday">Holiday Season</option>
                    <option value="long-duration">Long Duration (7+ days)</option>
                    <option value="demand">High Demand</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Adjustment Direction</label>
                  <select value={form.adjustmentDirection} onChange={e => setForm({...form, adjustmentDirection: e.target.value})}>
                    <option value="increase">Increase Price (+)</option>
                    <option value="decrease">Decrease Price (-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Adjustment Metric</label>
                  <select value={form.adjustmentType} onChange={e => setForm({...form, adjustmentType: e.target.value})}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (LKR)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Value</label>
                  <input type="number" step="0.01" value={form.adjustmentValue} onChange={e => setForm({...form, adjustmentValue: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Priority Rank (1 = Process First)</label>
                  <input type="number" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date (Optional)</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>End Date (Optional)</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={busyAction === 'save'}>
                  {busyAction === 'save' ? 'Saving...' : 'Save Rule'}
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
                <h3>System Engine Rules Rules</h3>
                <p style={{ color: 'var(--text-light)' }}>Base adjustments running system-wide.</p>
              </div>
            </div>
            
            {rules.length > 0 ? (
              <div className="admin-stack">
                {rules.map(r => (
                  <div key={r._id} className="admin-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ marginBottom: '0.2rem' }}>{r.name}</h4>
                        <p style={{ fontSize: '0.85rem' }}>
                          Adjustment: <strong style={{ color: r.adjustmentDirection === 'decrease' ? 'var(--success)' : 'var(--danger)' }}>
                            {r.adjustmentDirection === 'increase' ? '+' : '-'}{r.adjustmentType === 'percentage' ? `${r.adjustmentValue}%` : formatCurrency(r.adjustmentValue)}
                          </strong>
                        </p>
                      </div>
                      <span className={`badge badge-${r.status === 'active' ? 'success' : 'warning'}`}>{r.status}</span>
                    </div>
                    
                    <div className="admin-data-grid">
                       <div className="admin-data-item">
                          <span>Condition Match</span>
                          <strong>{r.ruleType.replace('-', ' ').toUpperCase()}</strong>
                       </div>
                       <div className="admin-data-item">
                          <span>Execution Order</span>
                          <strong>Priority {r.priority}</strong>
                       </div>
                    </div>

                    <div className="pill-row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(r)}>Edit</button>
                      <button className="btn btn-danger btn-sm" disabled={busyAction === `delete-${r._id}`} onClick={() => handleDelete(r._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">No dynamic rules configured yet.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
