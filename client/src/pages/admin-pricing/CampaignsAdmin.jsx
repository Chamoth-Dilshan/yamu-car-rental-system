import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

export default function CampaignsAdmin() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', status: 'active' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const { user } = useAuth();
  
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/pricing/campaigns', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch campaigns');
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
      if (editingId) {
        await api.put(`/pricing/campaigns/${editingId}`, form, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setMessage('Campaign updated successfully');
      } else {
        await api.post('/pricing/campaigns', form, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setMessage('Campaign created successfully');
      }
      setEditingId(null);
      setForm({ name: '', description: '', startDate: '', endDate: '', status: 'active' });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      setError('Failed to save campaign');
    } finally {
      setBusyAction('');
    }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    clearMessages();
    setForm({
      name: c.name,
      description: c.description || '',
      startDate: c.startDate ? new Date(c.startDate).toISOString().substring(0, 10) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().substring(0, 10) : '',
      status: c.status
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    clearMessages();
    setBusyAction(`delete-${id}`);
    try {
      await api.delete(`/pricing/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessage('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      setError('Failed to delete campaign');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Campaign Management</h2>
          <p style={{ color: 'var(--text-light)' }}>Create and manage marketing campaigns used for promotions and discounts.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="admin-section-grid">
          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>{editingId ? 'Edit Campaign' : 'Create Campaign'}</h3>
                <p style={{ color: 'var(--text-light)' }}>Fill out the details to configure the campaign timeline.</p>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Campaign Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Summer Sale 2026" />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Description (Optional)</label>
                <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the campaign purpose" />
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

              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={busyAction === 'save'}>
                  {busyAction === 'save' ? 'Saving...' : 'Save Campaign'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline" style={{ marginLeft: '1rem' }} onClick={() => { setEditingId(null); setForm({ name: '', description: '', startDate: '', endDate: '', status: 'active' }); clearMessages(); }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="form-card admin-card">
            <div className="card-header">
              <div>
                <h3>Campaigns List</h3>
                <p style={{ color: 'var(--text-light)' }}>All current and scheduled campaigns in the system.</p>
              </div>
            </div>
            
            {campaigns.length > 0 ? (
              <div className="admin-stack">
                {campaigns.map(c => (
                  <div key={c._id} className="admin-list-item">
                    <div>
                      <h4 style={{ marginBottom: '0.2rem' }}>{c.name}</h4>
                      <p style={{ fontSize: '0.85rem' }}>
                        {new Date(c.startDate).toLocaleDateString()} to {new Date(c.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="pill-row">
                      <span className={`badge badge-${c.status === 'active' ? 'success' : 'warning'}`}>{c.status}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(c)}>Edit</button>
                      <button className="btn btn-danger btn-sm" disabled={busyAction === `delete-${c._id}`} onClick={() => handleDelete(c._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-empty-state">No campaigns found. Create one to get started.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
