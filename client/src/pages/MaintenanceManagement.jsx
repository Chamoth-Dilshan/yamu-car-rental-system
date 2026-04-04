import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, X, Settings } from 'lucide-react';

const MaintenanceManagement = () => {
  // Initial Data based on the HTML source
  const [records, setRecords] = useState([
    {
      id: 1,
      vehicleName: 'Toyota Prius',
      type: 'Routine Service',
      count: 12,
      parts: 'Oil Filter, Brake Pads',
      cost: 45000
    },
    {
      id: 2,
      vehicleName: 'Suzuki Alto',
      type: 'Repair',
      count: 5,
      parts: 'Spark Plugs, Air Filter',
      cost: 12500
    }
  ]);

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    vehicleName: '',
    type: 'Routine Service',
    count: '',
    parts: '',
    cost: ''
  });

  // Filter Logic
  const filteredRecords = records.filter(record =>
    Object.values(record).some(val =>
      val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ vehicleName: '', type: 'Routine Service', count: '', parts: '', cost: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (record) => {
    setEditingId(record.id);
    setFormData({ ...record });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedRecord = {
      ...formData,
      id: editingId || Date.now(),
      cost: parseFloat(formData.cost) || 0,
      count: parseInt(formData.count) || 0
    };

    if (editingId) {
      setRecords(records.map(r => r.id === editingId ? formattedRecord : r));
    } else {
      setRecords([...records, formattedRecord]);
    }
    setIsFormOpen(false);
  };

  const deleteRecord = (id) => {
    if (window.confirm('Delete this maintenance record?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  // Helper to format currency
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
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Maintenance History</h1>

          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Search maintenance records..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddForm}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 font-semibold"
            >
              <Plus size={20} /> Add Maintenance
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-4 border-b">Vehicle Name</th>
                  <th className="p-4 border-b text-center">Type</th>
                  <th className="p-4 border-b text-center">Count</th>
                  <th className="p-4 border-b">Added Parts</th>
                  <th className="p-4 border-b text-right">Total Cost (Rs.)</th>
                  <th className="p-4 border-b text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50 transition">
                    <td className="p-4 font-semibold text-blue-700">{record.vehicleName}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        record.type === 'Repair' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="p-4 text-center">{record.count}</td>
                    <td className="p-4 text-slate-600 italic">{record.parts}</td>
                    <td className="p-4 text-right font-mono font-bold">{formatCurrency(record.cost)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditForm(record)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteRecord(record.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
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
          <aside className="w-full lg:w-96 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600 animate-in fade-in slide-in-from-right-4 duration-300 h-fit lg:sticky lg:top-24">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Update Maintenance Details' : 'Add Maintenance Details'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Name</label>
                <input 
                  type="text" 
                  name="vehicleName" 
                  required 
                  value={formData.vehicleName} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Toyota Prius"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Maintenance Type</label>
                <select 
                  name="type" 
                  value={formData.type} 
                  onChange={handleInputChange} 
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition bg-white"
                >
                  <option value="Routine Service">Routine Service</option>
                  <option value="Repair">Repair</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Maintained Count</label>
                <input 
                  type="number" 
                  name="count" 
                  required 
                  value={formData.count} 
                  onChange={handleInputChange} 
                  placeholder="Number of services"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Added Parts</label>
                <textarea 
                  name="parts" 
                  rows="2" 
                  value={formData.parts} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Tires, Battery"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cost (LKR)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-bold">Rs.</span>
                  <input 
                    type="number" 
                    name="cost" 
                    required 
                    value={formData.cost} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full pl-10 pr-2.5 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition font-mono" 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg transition mt-4 uppercase tracking-wider text-sm">
                {editingId ? 'Update Details' : 'Add Details'}
              </button>
            </form>
          </aside>
        )}
      </main>
    </div>
  );
};

export default MaintenanceManagement;