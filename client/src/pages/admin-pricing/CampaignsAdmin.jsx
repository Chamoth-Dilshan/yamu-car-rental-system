import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

export default function CampaignsAdmin() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', status: 'active' });
  const [editingId, setEditingId] = useState(null);
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
      alert('Failed to fetch campaigns');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/pricing/campaigns/${editingId}`, form, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } else {
        await api.post('/pricing/campaigns', form, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }
      setEditingId(null);
      setForm({ name: '', description: '', startDate: '', endDate: '', status: 'active' });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to save campaign');
    }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      description: c.description,
      startDate: c.startDate ? new Date(c.startDate).toISOString().substring(0, 10) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().substring(0, 10) : '',
      status: c.status
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/pricing/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to delete campaign');
    }
  };

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="admin-container">
          <div className="admin-header">
            <h1>Campaign Management</h1>
            <p>Manage marketing campaigns used for promotions.</p>
          </div>

          <div className="admin-grid">
            <div className="admin-card">
              <h3>{editingId ? 'Edit Campaign' : 'Create Campaign'}</h3>
              <form className="admin-form" onSubmit={handleSave}>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="button button-primary">Save</button>
                  {editingId && <button type="button" className="button button-secondary" onClick={() => { setEditingId(null); setForm({ name: '', description: '', startDate: '', endDate: '', status: 'active' }); }}>Cancel</button>}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h3>Campaigns List</h3>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Dates</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c._id}>
                        <td>{c.name}</td>
                        <td>{new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${c.status}`}>{c.status}</span>
                        </td>
                        <td>
                          <button className="button button-small button-outline" onClick={() => handleEdit(c)}>Edit</button>
                          <button className="button button-small button-danger" onClick={() => handleDelete(c._id)} style={{marginLeft: '0.5rem'}}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && <tr><td colSpan="4">No campaigns found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
