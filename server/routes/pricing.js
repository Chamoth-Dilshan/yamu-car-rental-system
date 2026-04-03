const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { protect, authorize } = require('../middleware/auth');

// --- Campaigns ---
router.route('/campaigns')
  .post(protect, authorize('admin'), pricingController.createCampaign)
  .get(protect, authorize('admin'), pricingController.getCampaigns);

router.route('/campaigns/:id')
  .put(protect, authorize('admin'), pricingController.updateCampaign)
  .delete(protect, authorize('admin'), pricingController.deleteCampaign);

// --- Promotions ---
router.route('/promotions')
  .post(protect, authorize('admin'), pricingController.createPromotion)
  .get(protect, authorize('admin'), pricingController.getPromotions);

router.route('/promotions/:id')
  .put(protect, authorize('admin'), pricingController.updatePromotion)
  .delete(protect, authorize('admin'), pricingController.deletePromotion);

// --- Pricing Rules ---
router.route('/rules')
  .post(protect, authorize('admin'), pricingController.createPricingRule)
  .get(protect, authorize('admin'), pricingController.getPricingRules);

router.route('/rules/:id')
  .put(protect, authorize('admin'), pricingController.updatePricingRule)
  .delete(protect, authorize('admin'), pricingController.deletePricingRule);

// --- Simulator / Calculation ---
router.post('/simulate', protect, pricingController.simulatePrice);

module.exports = router;
