import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

const MaintenanceManagement = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        vehiclename: '',
        type: 'Routine Service',
        count: '',
        addedthings: '',
        status: '',
        totcost: ''
    });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async (silent = true) => {
        try {
            setLoading(true);
            const response = await API.get('/maintenance');
            setRecords(response.data);
            setError(null);
            if (!silent) toast.success('Records updated');
        } catch (err) {
            setError('Failed to fetch maintenance records');
            toast.error('Failed to load maintenance records');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record =>
        Object.values(record).some(val =>
            val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const openAddForm = () => {
        setEditingId(null);
        setFormData({ vehiclename: '', type: 'Routine Service', count: '', addedthings: '', status: '', totcost: '' });
        setIsFormOpen(true);
    };

    const openEditForm = (record) => {
        setEditingId(record._id);
        setFormData({
            vehiclename: record.vehiclename,
            type: record.type,
            count: record.count,
            addedthings: record.addedthings,
            status: record.status || '',
            totcost: record.totcost
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                vehiclename: formData.vehiclename,
                type: formData.type,
                count: parseInt(formData.count) || 0,
                addedthings: formData.addedthings,
                status: formData.status,
                totcost: parseFloat(formData.totcost) || 0
            };

            if (editingId) {
                await API.put(`/maintenance/${editingId}`, payload);
                toast.success('Maintenance record updated successfully!');
            } else {
                await API.post('/maintenance', payload);
                toast.success('Maintenance record added successfully!');
            }

            await fetchRecords();
            setIsFormOpen(false);
        } catch (err) {
            toast.error('Failed to save maintenance record');
            console.error(err);
        }
    };

    const deleteRecord = async (id) => {
        if (window.confirm('Are you sure you want to delete this maintenance record?')) {
            try {
                await API.delete(`/maintenance/${id}`);
                toast.success('Maintenance record deleted successfully!');
                await fetchRecords();
            } catch (err) {
                toast.error('Failed to delete maintenance record');
                console.error(err);
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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
            <main className="container mx-auto py-8 px-4">
                
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Settings className="text-blue-600" />
                        Maintenance History
                    </h1>
                    <p className="text-slate-500 mt-1">Manage and track your vehicle services and repairs.</p>
                </header>

                {error && (
                    <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                        {error}
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    
                    <section className="flex-1 w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                            <div className="relative flex-1 w-full max-w-md">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                    <Search size={18} />
                                </span>
                                <input 
                                    type="text" 
                                    placeholder="Search maintenance records..." 
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={openAddForm}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2 font-bold"
                                disabled={loading}
                            >
                                <Plus size={20} /> Add Maintenance
                            </button>
                        </div>

                        {loading && records.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">Loading records...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-[0.1em]">
                                            <th className="px-6 py-4 border-b">Vehicle Name</th>
                                            <th className="px-6 py-4 border-b text-center">Type</th>
                                            <th className="px-6 py-4 border-b text-center">Count</th>
                                            <th className="px-6 py-4 border-b">Added Parts</th>
                                            <th className="px-6 py-4 border-b">Status</th>
                                            <th className="px-6 py-4 border-b text-right">Total Cost</th>
                                            <th className="px-6 py-4 border-b text-center">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredRecords.length > 0 ? (
                                            filteredRecords.map((record) => (
                                                <tr key={record._id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{record.vehiclename}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${
                                                            record.type === 'Repair' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {record.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-medium">{record.count}</td>
                                                    <td className="px-6 py-4 text-slate-600 italic max-w-[200px] truncate">{record.addedthings || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold text-slate-500">{record.status || 'Pending'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">{formatCurrency(record.totcost)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={() => openEditForm(record)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors">
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => deleteRecord(record._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="py-20 text-center text-slate-400 font-medium italic">No maintenance records found matching your search.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {isFormOpen && (
                        <aside className="w-full lg:w-96 bg-white p-8 rounded-2xl shadow-xl border-t-4 border-blue-600 animate-in fade-in slide-in-from-right-4 duration-300 h-fit lg:sticky lg:top-24">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                    {editingId ? 'Update Details' : 'New Maintenance'}
                                </h2>
                                <button onClick={() => setIsFormOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Vehicle Name</label>
                                    <input 
                                        type="text" 
                                        name="vehiclename" 
                                        required 
                                        value={formData.vehiclename} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. Toyota Prius"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                                        <select 
                                            name="type" 
                                            value={formData.type} 
                                            onChange={handleInputChange} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-white font-medium"
                                        >
                                            <option value="Routine Service">Service</option>
                                            <option value="Repair">Repair</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Service Count</label>
                                        <input 
                                            type="number" 
                                            name="count" 
                                            required 
                                            value={formData.count} 
                                            onChange={handleInputChange} 
                                            placeholder="0"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Parts Added</label>
                                    <textarea 
                                        name="addedthings" 
                                        rows="2" 
                                        value={formData.addedthings} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. Oil Filter, Brake Pads"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none"
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                                        <input 
                                            type="text"
                                            name="status" 
                                            value={formData.status} 
                                            onChange={handleInputChange} 
                                            placeholder="Completed"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Total Cost (LKR)</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">Rs.</span>
                                            <input 
                                                type="number" 
                                                name="totcost" 
                                                required 
                                                value={formData.totcost} 
                                                onChange={handleInputChange} 
                                                placeholder="0"
                                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-100 transition-all mt-4 uppercase tracking-widest text-xs active:scale-[0.98]">
                                    {editingId ? 'Update Details' : 'Save Record'}
                                </button>
                            </form>
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MaintenanceManagement;
