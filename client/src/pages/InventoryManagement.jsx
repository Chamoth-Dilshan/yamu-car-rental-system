import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, X, Box } from 'lucide-react';

const InventoryManagement = () => {
  // Initial Data based on the HTML source
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Engine Oil', qty: 50, price: 1500 },
    { id: 2, name: 'Brake Pads', qty: 20, price: 4500 }
  ]);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    qty: '',
    price: ''
  });

  // Filter Logic
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ name: '', qty: '', price: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedItem = {
      ...formData,
      id: editingId || Date.now(),
      qty: parseInt(formData.qty) || 0,
      price: parseFloat(formData.price) || 0
    };

    if (editingId) {
      setInventory(inventory.map(item => item.id === editingId ? formattedItem : item));
    } else {
      setInventory([...inventory, formattedItem]);
    }
    setIsFormOpen(false);
  };

  const deleteItem = (id) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      setInventory(inventory.filter(item => item.id !== id));
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
        
        {/* Table Section */}
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
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddForm}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 font-semibold"
            >
              <Plus size={20} /> Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-4 border-b">Item Name</th>
                  <th className="p-4 border-b text-center">Quantity</th>
                  <th className="p-4 border-b text-right">Price per Unit</th>
                  <th className="p-4 border-b text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition">
                    <td className="p-4 font-semibold text-blue-700">{item.name}</td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                        {item.qty}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold">{formatCurrency(item.price)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditForm(item)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Form Sidebar */}
        {isFormOpen && (
          <aside className="w-full lg:w-80 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600 animate-in fade-in slide-in-from-right-4 duration-300 h-fit lg:sticky lg:top-24">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Update Item' : 'Add New Item'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Engine Oil"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                <input 
                  type="number" 
                  name="qty" 
                  required 
                  value={formData.qty} 
                  onChange={handleInputChange} 
                  placeholder="0"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Price (LKR)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-bold">Rs.</span>
                  <input 
                    type="number" 
                    name="price" 
                    required 
                    value={formData.price} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full pl-10 pr-2.5 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition font-mono" 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg transition mt-4 uppercase tracking-wider text-sm">
                {editingId ? 'Update Item' : 'Add Item'}
              </button>
            </form>
          </aside>
        )}
      </main>
    </div>
  );
};

export default InventoryManagement;