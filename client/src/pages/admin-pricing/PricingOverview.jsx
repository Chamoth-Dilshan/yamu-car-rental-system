import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';

export default function PricingOverview() {
  const [campaigns, setCampaigns] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    Promise.all([
      api.get('/pricing/campaigns', { headers: { Authorization: `Bearer ${user.token}` } }),
      api.get('/pricing/promotions', { headers: { Authorization: `Bearer ${user.token}` } }),
      api.get('/pricing/rules', { headers: { Authorization: `Bearer ${user.token}` } })
    ]).then(([campRes, promoRes, ruleRes]) => {
      setCampaigns(campRes.data);
      setPromotions(promoRes.data);
      setRules(ruleRes.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user]);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const activePromotions = promotions.filter(p => p.status === 'active');
  const activeRules = rules.filter(r => r.status === 'active');

  const dashboardStats = [
    { label: 'Total Campaigns', value: campaigns.length },
    { label: 'Active Promo Codes', value: activePromotions.length },
    { label: 'Active Pricing Rules', value: activeRules.length },
    { label: 'Scheduled Campaigns', value: activeCampaigns.length }
  ];

  return (
    <div className="dashboard-layout page-content">
      <Sidebar />
      <main className="dashboard-content">
        <div className="form-header">
          <h2>Pricing & Promotions Overview</h2>
          <p style={{ color: 'var(--text-light)' }}>Monitor active discounts, marketing campaigns, and global pricing rules from one dashboard.</p>
        </div>

        {loading ? (
          <div className="admin-empty-state">Loading dashboard...</div>
        ) : (
          <>
            <div className="stats-grid">
              {dashboardStats.map((item) => (
                <div key={item.label} className="stat-card">
                  <div className="stat-info">
                    <h3>{item.value}</h3>
                    <p>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-section-grid">
              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Active Campaigns</h3>
                    <p style={{ color: 'var(--text-light)' }}>Currently running marketing campaigns.</p>
                  </div>
                  <Link className="btn btn-outline btn-sm" to="/admin/campaigns">Manage Campaigns</Link>
                </div>
                {activeCampaigns.length > 0 ? (
                  <div className="admin-stack">
                    {activeCampaigns.slice(0, 4).map((c) => (
                      <div key={c._id} className="admin-list-item">
                        <div>
                          <h4>{c.name}</h4>
                          <p style={{ fontSize: '0.85rem' }}>Ends: {new Date(c.endDate).toLocaleDateString()}</p>
                        </div>
                        <span className="badge badge-success">{c.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty-state">No active campaigns running.</div>
                )}
              </section>

              <section className="form-card">
                <div className="card-header">
                  <div>
                    <h3>Active Promotions</h3>
                    <p style={{ color: 'var(--text-light)' }}>Available discount codes and their limits.</p>
                  </div>
                  <Link className="btn btn-outline btn-sm" to="/admin/promotions">Manage Promos</Link>
                </div>
                <div className="admin-stack">
                  {activePromotions.slice(0, 4).map((p) => (
                    <div key={p._id} className="admin-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <h4>{p.code}</h4>
                          <p style={{ fontSize: '0.85rem' }}>{p.title}</p>
                        </div>
                        <span className="badge badge-success">{p.discountType === 'percentage' ? `${p.discountValue}%` : `$${p.discountValue}`}</span>
                      </div>
                    </div>
                  ))}
                  {activePromotions.length === 0 && <div className="admin-empty-state">No active promotions available.</div>}
                </div>
              </section>
            </div>

            <section className="form-card">
              <div className="card-header">
                <div>
                  <h3>Pricing Configuration Workflow</h3>
                  <p style={{ color: 'var(--text-light)' }}>Use the engine to build rules that automatically augment the Base Price dynamically.</p>
                </div>
                <Link className="btn btn-primary btn-sm" to="/admin/pricing-simulator">Test Engine Simulator</Link>
              </div>
              <div className="admin-stack">
                <div className="admin-list-item">
                  <div>
                    <h4>1. Base Price Setup</h4>
                    <p>Prices are determined initially by the Vehicle standard rates.</p>
                  </div>
                </div>
                <div className="admin-list-item">
                  <div>
                    <h4>2. Dynamic Rules (Priority Execution)</h4>
                    <p>System applies universal pricing adjustments like Weekend surcharges or Long-Duration discounts automatically.</p>
                  </div>
                  <Link className="btn btn-outline btn-sm" to="/admin/pricing-rules">Edit Rules</Link>
                </div>
                <div className="admin-list-item">
                  <div>
                    <h4>3. Promotions & Discounts</h4>
                    <p>Lastly, if the user supplies a valid Promo Code under an active Campaign, the price is discounted.</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
