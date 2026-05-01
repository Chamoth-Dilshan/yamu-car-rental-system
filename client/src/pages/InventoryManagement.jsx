import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API from '../services/api';

const InventoryManagement = () => {
    // Core Data State
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter & Search State
    const [searchTerm, setSearchTerm] = useState('');

    // Form Popup/Sidebar State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState({
        itemname: '',
        quantity: '',
        price: '',
        description: ''
    });

    // --- AUDIO ALERT LOGIC ---
    // Ref to manage low stock alerts and avoid annoying repetitions
    const alertAudio = useRef(new Audio('/sounds/Inventoty Alert.wav'));
    const lastAlertedItems = useRef(new Set());

    useEffect(() => {
        const lowStockItems = inventory.filter(item => Number(item.quantity) < 10);
        
        // Only trigger audio if there's a NEW low stock item identified
        const newLowStockFound = lowStockItems.some(item => !lastAlertedItems.current.has(item._id));
        
        if (newLowStockFound) {
            alertAudio.current.currentTime = 0;
            alertAudio.current.play().catch(() => {
                // Browser blocks audio until interaction
                console.log("Audio waiting for user gesture...");
            });
            
            // Update the set of alerted items
            const newSet = new Set(lowStockItems.map(i => i._id));
            lastAlertedItems.current = newSet;
        }
    }, [inventory]);

    // --- DATA FETCHING ---
    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async (showToast = false) => {
        try {
            setLoading(true);
            const response = await API.get('/inventory');
            setInventory(response.data);
            setError(null);
            if (showToast) toast.success('Inventory synced');
        } catch (err) {
            console.error(err);
            setError('Unable to reach the server. Please check your connection.');
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    // --- FILTER LOGIC ---
    const filteredInventory = useMemo(() => {
        return inventory.filter(item =>
            item.itemname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);

    // --- FORM ACTIONS ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openAddForm = () => {
        setEditingId(null);
        setFormData({ itemname: '', quantity: '', price: '', description: '' });
        setIsFormOpen(true);
    };

    const openEditForm = (item) => {
        setEditingId(item._id);
        setFormData({
            itemname: item.itemname,
            quantity: item.quantity,
            price: item.price,
            description: item.description || ''
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                itemname: formData.itemname.trim(),
                quantity: parseInt(formData.quantity) || 0,
                price: parseFloat(formData.price) || 0,
                description: formData.description.trim()
            };

            if (editingId) {
                await API.put(`/inventory/${editingId}`, payload);
                toast.success('Inventory item updated');
            } else {
                await API.post('/inventory', payload);
                toast.success('New item added to inventory');
            }

            await fetchInventory();
            setIsFormOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteItem = async (id) => {
        if (window.confirm('Are you sure you want to remove this item? This action cannot be undone.')) {
            try {
                await API.delete(`/inventory/${id}`);
                toast.success('Item removed successfully');
                await fetchInventory();
            } catch (err) {
                toast.error('Delete operation failed');
            }
        }
    };

    // --- RENDER HELPERS ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2
        }).format(amount).replace('LKR', 'Rs.');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-900 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                
                {/* Header Section */}
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            <Package className="text-blue-600" size={32} />
                            Inventory Management
                        </h1>
                        <p className="text-slate-500 mt-1">Track and manage your spare parts and consumables.</p>
                    </div>
                </header>

                {error && (
                    <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertTriangle size={20} />
                        <span className="font-medium text-sm">{error}</span>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    
                    {/* Main Content Area */}
                    <section className="flex-1 w-full bg-white/70 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden transition-all">
                        
                        {/* Table Controls */}
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50">
                            <div className="relative group flex-1 w-full max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by item name or description..." 
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={openAddForm}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300"
                                disabled={loading}
                            >
                                <Plus size={20} /> Add New Item
                            </button>
                        </div>

                        {/* Table / Loading State */}
                        <div className="relative">
                            {loading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-blue-600" size={32} />
                                        <span className="text-sm font-medium text-slate-500">Syncing database...</span>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-slate-500 text-[11px] uppercase font-bold tracking-widest">
                                            <th className="px-6 py-4 border-b border-slate-100">Item Details</th>
                                            <th className="px-6 py-4 border-b border-slate-100 text-center">Stock Level</th>
                                            <th className="px-6 py-4 border-b border-slate-100 text-right pr-12">Unit Price</th>
                                            <th className="px-6 py-4 border-b border-slate-100 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredInventory.length > 0 ? (
                                            filteredInventory.map((item) => (
                                                <tr key={item._id} className={`group hover:bg-slate-50/80 transition-colors ${item.quantity < 10 ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-6 py-5">
                                                        <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{item.itemname}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description || 'No description provided'}</div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-black ring-1 ${
                                                                item.quantity < 10 
                                                                ? 'bg-red-100 text-red-700 ring-red-200' 
                                                                : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                                                            }`}>
                                                                {item.quantity} units
                                                            </span>
                                                            {item.quantity < 10 && (
                                                                <span className="text-[9.5px] font-bold text-red-500 uppercase tracking-tighter flex items-center gap-1 animate-pulse">
                                                                    <AlertTriangle size={10} /> Low Stock Alert
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right pr-12">
                                                        <span className="font-mono text-sm font-extrabold text-slate-700">{formatCurrency(item.price)}</span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex justify-center gap-1.5 translate-x-2 group-hover:translate-x-0 transition-transform opacity-0 group-hover:opacity-100">
                                                            <button 
                                                                onClick={() => openEditForm(item)} 
                                                                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all"
                                                                title="Edit Item"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteItem(item._id)} 
                                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-40">
                                                        <Package size={48} />
                                                        <p className="font-medium text-slate-500">
                                                            {searchTerm ? `No matching items for "${searchTerm}"` : 'Your inventory is currently empty.'}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* Form Sidebar / Modal */}
                    {isFormOpen && (
                        <aside className="w-full lg:w-96 bg-white rounded-2xl shadow-2xl p-8 border border-white/60 lg:sticky lg:top-24 animate-in fade-in zoom-in-95 slide-in-from-right-8 duration-300">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                        {editingId ? 'Edit Item Details' : 'Add New Inventory'}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">{editingId ? 'Update existing stock records' : 'Enter details for the new batch'}</p>
                                </div>
                                <button 
                                    onClick={() => setIsFormOpen(false)} 
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Item Name</label>
                                    <input 
                                        type="text" 
                                        name="itemname" 
                                        required 
                                        value={formData.itemname} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. Engine Oil 5W-30"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Quantity</label>
                                        <input 
                                            type="number" 
                                            name="quantity" 
                                            required 
                                            min="0"
                                            value={formData.quantity} 
                                            onChange={handleInputChange} 
                                            placeholder="0"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Price (LKR)</label>
                                        <input 
                                            type="number" 
                                            name="price" 
                                            required 
                                            min="0"
                                            step="0.01"
                                            value={formData.price} 
                                            onChange={handleInputChange} 
                                            placeholder="0.00"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Description</label>
                                    <textarea 
                                        name="description" 
                                        rows="3" 
                                        value={formData.description} 
                                        onChange={handleInputChange} 
                                        placeholder="Add notes about brand, compatibility, or storage location..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        editingId ? 'Update Record' : 'Create Entry'
                                    )}
                                </button>
                            </form>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventoryManagement;