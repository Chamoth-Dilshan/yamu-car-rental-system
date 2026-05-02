const Campaign = require('../models/Campaign');
const Promotion = require('../models/Promotion');
const PricingRule = require('../models/PricingRule');
const PricingEngine = require('../services/pricingEngine');

// ==== Campaign Methods ====
exports.createCampaign = async (req, res) => {
  try {
    const campaign = new Campaign(req.body);
    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==== Promotion Methods ====
exports.createPromotion = async (req, res) => {
  try {
    const promotion = new Promotion(req.body);
    await promotion.save();
    res.status(201).json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.find().populate('campaignId', 'name');
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAvailablePromotions = async (req, res) => {
  try {
    const currentDate = new Date();
    const promotions = await Promotion.find({
      status: 'active',
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    }).select('-__v');
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(promotion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==== Pricing Rule Methods ====
exports.createPricingRule = async (req, res) => {
  try {
    const rule = new PricingRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPricingRules = async (req, res) => {
  try {
    const rules = await PricingRule.find();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(rule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePricingRule = async (req, res) => {
  try {
    await PricingRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Pricing rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==== Price Calculation (Simulator / Booking Adapter) ====
exports.simulatePrice = async (req, res) => {
  try {
    const { bookingDetails, promoCode } = req.body;
    
    // Call the engine
    const result = await PricingEngine.calculatePrice(bookingDetails, promoCode);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Pricing simulation failed', error: error.message });
  }
};
