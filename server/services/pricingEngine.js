const PricingRule = require('../models/PricingRule');
const Promotion = require('../models/Promotion');

/**
 * Calculates the final price for a booking based on dynamic pricing rules and promotions.
 * This engine operates independently and can be called from mock simulators or real booking controllers.
 */
class PricingEngine {
  /**
   * Evaluate conditions based on booking details
   */
  static _evaluateCondition(rule, bookingDetails) {
    // If no conditions, it applies
    if (!rule.conditions || Object.keys(rule.conditions).length === 0) return true;

    try {
      const { minDays, daysOfWeek } = rule.conditions;
      
      if (minDays && bookingDetails.duration < minDays) return false;
      
      if (daysOfWeek && daysOfWeek.length > 0 && bookingDetails.startDate) {
        const startDay = new Date(bookingDetails.startDate).getDay();
        if (!daysOfWeek.includes(startDay)) return false;
      }
      
      // additional conditions (e.g. vehicleCategory matching) could be added here
      return true;
    } catch (e) {
      console.error('Error evaluating condition', e);
      return false;
    }
  }

  /**
   * Calculates final price
   * @param {Object} bookingDetails - { basePrice, duration, startDate, endDate, vehicleCategory, bookingType, isFirstBooking }
   * @param {String} promoCode - optional code applied by user
   * @returns {Object} { originalPrice, finalPrice, breakdown: [] }
   */
  static async calculatePrice(bookingDetails, promoCode = null) {
    const { basePrice, duration } = bookingDetails;
    let currentPrice = basePrice * (duration || 1);
    const originalPrice = currentPrice;
    const breakdown = [];

    // 1. Fetch active pricing rules and sort by priority (descending)
    const activeRules = await PricingRule.find({ 
      status: 'active',
      $or: [
        { startDate: { $lte: new Date() }, endDate: { $gte: new Date() } },
        { startDate: null, endDate: null }
      ]
    }).sort({ priority: -1 });

    // Apply dynamic pricing rules
    for (const rule of activeRules) {
      if (this._evaluateCondition(rule, bookingDetails)) {
        let adjustment = 0;
        if (rule.adjustmentType === 'percentage') {
          adjustment = currentPrice * (rule.adjustmentValue / 100);
        } else {
          adjustment = rule.adjustmentValue; // fixed per booking or per day depending on logic
        }

        if (rule.adjustmentDirection === 'decrease') {
          currentPrice -= adjustment;
          breakdown.push({ type: 'rule', name: rule.name, impact: -adjustment });
        } else {
          currentPrice += adjustment;
          breakdown.push({ type: 'rule', name: rule.name, impact: adjustment });
        }
      }
    }

    // 2. Fetch active applicable promotions (automatic ones without code)
    // For simplicity in this mock, we assume automatic promotions are those without a code
    // Or we just evaluate the provided promo code.
    
    // 3. Apply Promo Code if provided
    if (promoCode) {
      const promotion = await Promotion.findOne({
        code: promoCode,
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });

      if (promotion) {
        // Evaluate promotion logic
        let isValid = true;
        
        if (promotion.minBookingAmount && currentPrice < promotion.minBookingAmount) isValid = false;
        if (promotion.vehicleCategory !== 'any' && promotion.vehicleCategory !== bookingDetails.vehicleCategory) isValid = false;
        if (promotion.bookingType !== 'any' && promotion.bookingType !== bookingDetails.bookingType) isValid = false;
        if (promotion.firstTimeUserOnly && !bookingDetails.isFirstBooking) isValid = false;
        if (promotion.usageCount >= promotion.totalUsageLimit) isValid = false;

        if (isValid) {
          let discount = 0;
          if (promotion.discountType === 'percentage') {
            discount = currentPrice * (promotion.discountValue / 100);
          } else {
            discount = promotion.discountValue;
          }

          // Ensure we don't go below 0
          if (currentPrice - discount < 0) {
            discount = currentPrice;
          }

          currentPrice -= discount;
          breakdown.push({ type: 'promotion', name: promotion.title, impact: -discount });
        } else {
          breakdown.push({ type: 'error', name: 'Promo Code Invalid/Ineligible', impact: 0 });
        }
      } else {
        breakdown.push({ type: 'error', name: 'Promo Code Not Found', impact: 0 });
      }
    }

    return {
      originalPrice,
      finalPrice: Math.max(0, currentPrice),
      breakdown
    };
  }
}

module.exports = PricingEngine;
