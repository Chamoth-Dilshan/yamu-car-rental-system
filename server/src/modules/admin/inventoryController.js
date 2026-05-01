//server/controllers/inventoryController.js
const Inventory = require('./inventory.model');

// @desc    Add new inventory item
// @route   POST /api/inventory
exports.createItem = async (req, res) => {
    try {
        const newItem = new Inventory(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all inventory items
// @route   GET /api/inventory
exports.getAllItems = async (req, res) => {
    try {
        const items = await Inventory.find().sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single item by ID
// @route   GET /api/inventory/:id
exports.getItemById = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
exports.updateItem = async (req, res) => {
    try {
        const updatedItem = await Inventory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
exports.deleteItem = async (req, res) => {
    try {
        const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json({ message: 'Item removed from inventory' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};