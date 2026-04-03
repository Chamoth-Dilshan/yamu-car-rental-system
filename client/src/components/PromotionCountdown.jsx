import React, { useState, useEffect } from 'react';

export default function PromotionCountdown({ endDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!endDate) {
      setTimeLeft('No expiry');
      return;
    }
    
    // Set expiry to the end of the specified day (23:59:59) for accuracy if it's just a date string
    const targetObj = new Date(endDate);
    if (targetObj.getHours() === 0 && targetObj.getMinutes() === 0) {
      targetObj.setHours(23, 59, 59, 999);
    }
    const target = targetObj.getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }
      
      setIsExpired(false);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (d === 0 && h === 0 && m === 0) {
        setTimeLeft(`${s}s`);
      } else if (d === 0) {
        setTimeLeft(`${h}h ${m}m ${s}s`);
      } else {
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!endDate) {
    return <span className="badge badge-info" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>No expiry</span>;
  }
  
  if (isExpired) {
    return <span className="badge badge-danger" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Expired</span>;
  }

  return (
    <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      {timeLeft}
    </span>
  );
}
