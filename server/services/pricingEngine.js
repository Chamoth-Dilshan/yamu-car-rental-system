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
    const { basePrice, duration, vehicleCategory, bookingType } = bookingDetails;
    let currentPrice = basePrice * (duration || 1);
    const originalPrice = currentPrice;
    const pricingAdjustments = [];

    const now = new Date();
    // 24 hour buffer to account for users in local timezones creating promos without a time component
    const timezoneBufferFuture = now;
    const timezoneBufferPast = now;

    // 1. Fetch active pricing rules and sort by priority (descending)
    const activeRules = await PricingRule.find({ 
      status: 'active',
      $or: [
        { startDate: { $lte: timezoneBufferFuture }, endDate: { $gte: timezoneBufferPast } },
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
          pricingAdjustments.push({ type: 'rule', name: rule.name, impact: -adjustment });
        } else {
          currentPrice += adjustment;
          pricingAdjustments.push({ type: 'rule', name: rule.name, impact: adjustment });
        }
      }
    }

    const subtotalAfterPricingRules = Math.max(0, currentPrice);

    // 2. Fetch available promotions
    const query = {
      status: 'active',
      startDate: { $lte: timezoneBufferFuture },
      endDate: { $gte: timezoneBufferPast }
    };
    if (bookingType) query.bookingType = { $in: ['any', bookingType] };
    if (vehicleCategory) query.vehicleCategory = { $in: ['any', vehicleCategory] };
    
    // We can fetch all active promos matching criteria, then filter minBookingAmount locally
    const rawPromotions = await Promotion.find(query).select('-__v').sort({ priority: -1 });
    const availablePromotions = rawPromotions.filter(p => !p.minBookingAmount || subtotalAfterPricingRules >= p.minBookingAmount);

    let promoDiscount = 0;
    let appliedPromotion = null;

    // 3. Apply optional Promo Code promotions (automatic ones without code)
    // For simplicity in this mock, we assume automatic promotions are those without a code
    // Or we just evaluate the provided promo code.
    
    // 3. Apply Promo Code if provided
    if (promoCode) {
      const promotion = await Promotion.findOne({ 
        code: promoCode, 
        status: 'active',
        startDate: { $lte: timezoneBufferFuture },
        endDate: { $gte: timezoneBufferPast }
      });

      if (promotion) {
        // Eligibility check
        let isEligible = true;
        if (promotion.minBookingAmount && subtotalAfterPricingRules < promotion.minBookingAmount) isEligible = false;
        if (promotion.vehicleCategory !== 'any' && promotion.vehicleCategory !== bookingDetails.vehicleCategory) isEligible = false;
        if (promotion.bookingType !== 'any' && promotion.bookingType !== bookingDetails.bookingType) isEligible = false;
        if (promotion.firstTimeUserOnly && !bookingDetails.isFirstBooking) isEligible = false;

        if (isEligible) {
          appliedPromotion = promotion.toObject ? promotion.toObject() : promotion;
          
          if (promotion.discountType === 'percentage') {
            promoDiscount = currentPrice * (promotion.discountValue / 100);
          } else {
            promoDiscount = promotion.discountValue;
          }

          // Ensure we don't go below 0
          if (currentPrice - promoDiscount < 0) {
            promoDiscount = currentPrice;
          }

          currentPrice -= promoDiscount;
          pricingAdjustments.push({ type: 'promotion', name: promotion.title, impact: -promoDiscount });
        } else {
          pricingAdjustments.push({ type: 'error', name: 'Promo Code Invalid/Ineligible', impact: 0 });
        }
      } else {
        pricingAdjustments.push({ type: 'error', name: 'Promo Code Not Found', impact: 0 });
      }
    }

    return {
      basePrice: originalPrice,
      pricingAdjustments,
      subtotalAfterPricingRules,
      availablePromotions,
      appliedPromotion,
      promoDiscount,
      finalPrice: Math.max(0, currentPrice)
    };
  }
}

module.exports = PricingEngine;
