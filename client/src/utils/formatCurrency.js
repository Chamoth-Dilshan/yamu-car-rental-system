/**
 * Reusable utility to format monetary values cleanly into Sri Lankan Rupees (LKR).
 *
 * @param {Number|String} amount - The currency value
 * @returns {String} formatted string e.g. "LKR 1,500.00"
 */
export const formatCurrency = (amount) => {
  const parsedAmount = Number(amount);
  const number = isNaN(parsedAmount) ? 0 : parsedAmount;
  
  return `LKR ${number.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
