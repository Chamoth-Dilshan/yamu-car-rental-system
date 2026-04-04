/**
 * Reusable utility to format monetary values cleanly into Sri Lankan Rupees (LKR).
 *
 * @param {Number|String} amount - The currency value
 * @returns {String} formatted string e.g. "LKR 1,500.00"
 */
export const formatCurrency = (amount) => {
  const number = Number(amount) || 0;
  return `LKR ${number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
