import React, { useEffect, useState } from 'react';
import API from '../../../api/axios';
import { formatCurrency } from '../../../utils/formatters';

export default function AvailablePromotions({ booking, onApplyPromo, appliedPromo, isSimulating }) {
  const fallbackPromos = [
    { _id: 'mock1', title: '10% Off First Booking', code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minBookingAmount: 0, bookingType: 'any', vehicleCategory: 'any' },
    { _id: 'mock2', title: '5000 LKR Off Luxury Cars', code: 'LUXURY5K', discountType: 'fixed', discountValue: 5000, minBookingAmount: 10000, bookingType: 'vehicle', vehicleCategory: 'Luxury' }
  ];

  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    API.get('/pricing/promotions/available')
      .then((res) => {
        if (!active) return;
        setPromotions(res.data && res.data.length > 0 ? res.data : fallbackPromos);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load promotions', err);
        setPromotions(fallbackPromos);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleApply = (code) => {
    onApplyPromo(code);
    setPromoInput(code); // synchronize input
  };

  const handleManualApply = (e) => {
    e.preventDefault();
    if (promoInput.trim()) {
      onApplyPromo(promoInput.trim());
    }
  };

  const clearPromo = () => {
    setPromoInput('');
    onApplyPromo('');
  };

  // Filter promotions that technically apply to this booking
  const applicablePromotions = promotions.filter(promo => {
    if (promo.minBookingAmount && (booking?.totalAmount || 0) < promo.minBookingAmount) return false;
    if (promo.bookingType && promo.bookingType !== 'any' && promo.bookingType !== booking?.bookingType) return false;
    if (promo.vehicleCategory && promo.vehicleCategory !== 'any' && promo.vehicleCategory !== booking?.vehicle?.category) return false;
    return true;
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent parent form submission
      handleManualApply(e);
    }
  };

  return (
    <section className="form-card payment-promotions-card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3>Promotions & Discounts</h3>
        <p style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Apply a promo code to get a discount on your booking.</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Enter promo code"
          value={promoInput}
          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          disabled={isSimulating}
          style={{ textTransform: 'uppercase' }}
        />
        <button 
          type="button" 
          className="btn btn-primary" 
          disabled={isSimulating || !promoInput.trim()}
          onClick={handleManualApply}
        >
          {isSimulating ? 'Applying...' : 'Apply'}
        </button>
        {appliedPromo && (
          <button type="button" className="btn btn-outline" onClick={clearPromo} disabled={isSimulating}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Checking for available promotions...</p>
      ) : error ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--error-color)' }}>{error}</p>
      ) : applicablePromotions.length === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>No active promotions available for this booking.</p>
      ) : (
        <div className="promotions-list" style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr' }}>
          {applicablePromotions.map((promo) => {
            const isApplied = appliedPromo === promo.code;
            return (
              <div 
                key={promo._id} 
                style={{
                  border: `1px solid ${isApplied ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  padding: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isApplied ? 'var(--bg-light)' : 'transparent'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{promo.title}</strong>
                    <span style={{ 
                      background: 'var(--bg-light)', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem', 
                      fontWeight: '600',
                      letterSpacing: '1px'
                    }}>
                      {promo.code}
                    </span>
                  </div>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    {promo.discountType === 'percentage' 
                      ? `${promo.discountValue}% OFF` 
                      : `${formatCurrency(promo.discountValue)} OFF`}
                  </p>
                </div>
                <button 
                  type="button"
                  className={`btn ${isApplied ? 'btn-outline' : 'btn-secondary'} btn-sm`} 
                  onClick={() => isApplied ? clearPromo() : handleApply(promo.code)}
                  disabled={isSimulating}
                >
                  {isApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
