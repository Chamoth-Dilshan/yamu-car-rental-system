import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
// FIXED: Corrected the CSS import path
import 'react-toastify/dist/ReactToastify.css';
//import API from '../services/api';
import axios from '../api/axios'
const API = axios

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    itemname: '',
    quantity: '',
    price: '',
    description: ''
  });

  // --- AUDIO LOGIC ---
  // Store audio in a ref so it persists across renders
  const alertAudio = useRef(new Audio('/sounds/Inventoty Alert.wav'));

  useEffect(() => {
    // Check if any item quantity is less than 10
    const hasLowStock = inventory.some(item => Number(item.quantity) < 10);
    let intervalId = null;

    if (hasLowStock) {
      const playAlert = () => {
        alertAudio.current.currentTime = 0;
        alertAudio.current.play().catch(err => {
          // Browsers block audio until the user clicks something on the page
          console.warn("Audio playback waiting for user interaction...");
        });
      };

      // Play immediately
      playAlert();

      // Repeat every 5 seconds
      intervalId = setInterval(playAlert, 6000);
    }

    // Cleanup: Clear interval when stock is fixed or component closes
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [inventory]);

  // --- DATA ACTIONS ---
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await API.get('/inventory');
      setInventory(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch inventory');
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.itemname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    try {
      const payload = {
        itemname: formData.itemname,
        quantity: parseInt(formData.quantity) || 0,
        price: parseFloat(formData.price) || 0,
        description: formData.description
      };

      if (editingId) {
        await API.put(`/inventory/${editingId}`, payload);
        toast.success('Inventory updated!');
      } else {
        await API.post('/inventory', payload);
        toast.success('Item added!');
      }

      await fetchInventory();
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm('Delete this item?')) {
      try {
        await API.delete(`/inventory/${id}`);
        toast.success('Item removed');
        await fetchInventory();
      } catch (err) {
        toast.error('Delete failed');
      }
    }
  };

  const formatCurrency = (amount) => {
    return "Rs. " + parseFloat(amount).toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="container mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8 items-start">
        
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <section className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Inventory Items</h1>

          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddForm}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition shadow-md"
              disabled={loading}
            >
              <Plus size={20} /> Add Item
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-4 border-b">Item Name</th>
                    <th className="p-4 border-b text-center">Quantity</th>
                    <th className="p-4 border-b text-right">Price per Unit</th>
                    <th className="p-4 border-b text-center">Description</th>
                    <th className="p-4 border-b text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredInventory.map((item) => (
                    <tr key={item._id} className={`transition ${item.quantity < 10 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-blue-50'}`}>
                      <td className={`p-4 font-semibold ${item.quantity < 10 ? 'text-red-700' : 'text-blue-700'}`}>
                        {item.itemname} {item.quantity < 10 && <span className="ml-2 text-[10px] bg-red-200 px-1 rounded">LOW</span>}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`${item.quantity < 10 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'} px-3 py-1 rounded-full text-xs font-bold`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold">{formatCurrency(item.price)}</td>
                      <td className="p-4 text-center">{item.description}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEditForm(item)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => deleteItem(item._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isFormOpen && (
          <aside className="w-full lg:w-80 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600 h-fit lg:sticky lg:top-24">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold">{editingId ? 'Update Item' : 'Add Item'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item Name</label>
                <input type="text" name="itemname" required value={formData.itemname} onChange={handleInputChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                <input type="number" name="quantity" required value={formData.quantity} onChange={handleInputChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (LKR)</label>
                <input type="number" name="price" required value={formData.price} onChange={handleInputChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea name="description" rows="2" value={formData.description} onChange={handleInputChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition">
                {editingId ? 'Update' : 'Save'}
              </button>
            </form>
          </aside>
        )}
      </main>
    </div>
  );
};

export default InventoryManagement;