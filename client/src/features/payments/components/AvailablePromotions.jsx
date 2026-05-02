import React, { useState } from 'react';
import { formatCurrency } from '../../../utils/formatters';

export default function AvailablePromotions({ promotions = [], onApplyPromo, appliedPromo, isSimulating }) {
  const [promoInput, setPromoInput] = useState('');

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

      {promotions.length === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>No active promotions available for this booking.</p>
      ) : (
        <div className="promotions-list" style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr' }}>
          {promotions.map((promo) => {
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
