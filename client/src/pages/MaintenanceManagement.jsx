// import React, { useState, useEffect } from 'react';
// import { Search, Plus, Edit2, Trash2, X, Settings } from 'lucide-react';
// import API from '../services/api';

// const MaintenanceManagement = () => {
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // UI States
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);

//   // Form State
//   const [formData, setFormData] = useState({
//     vehiclename: '',
//     type: 'Routine Service',
//     count: '',
//     addedthings: '',
//     status: '', // Added status field
//     totcost: ''
//   });

//   // Fetch records from database
//   useEffect(() => {
//     fetchRecords();
//   }, []);

//   const fetchRecords = async () => {
//     try {
//       setLoading(true);
//       const response = await API.get('/maintenance');
//       setRecords(response.data);
//       setError(null);
//     } catch (err) {
//       setError('Failed to fetch maintenance records');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Filter Logic
//   const filteredRecords = records.filter(record =>
//     Object.values(record).some(val =>
//       val.toString().toLowerCase().includes(searchTerm.toLowerCase())
//     )
//   );

//   // Form Handlers
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const openAddForm = () => {
//     setEditingId(null);
//     setFormData({ vehiclename: '', type: 'Routine Service', count: '', addedthings: '', status: '', totcost: '' });
//     setIsFormOpen(true);
//   };

//   const openEditForm = (record) => {
//     setEditingId(record._id);
//     setFormData({ 
//       vehiclename: record.vehiclename,
//       type: record.type,
//       count: record.count,
//       addedthings: record.addedthings,
//       status: record.status || '',
//       totcost: record.totcost
//     });
//     setIsFormOpen(true);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         vehiclename: formData.vehiclename,
//         type: formData.type,
//         count: parseInt(formData.count) || 0,
//         addedthings: formData.addedthings,
//         status: formData.status,
//         totcost: parseFloat(formData.totcost) || 0
//       };

//       if (editingId) {
//         // Update existing record
//         await API.put(`/maintenance/${editingId}`, payload);
//       } else {
//         // Create new record
//         await API.post('/maintenance', payload);
//       }
      
//       // Refresh data from database
//       await fetchRecords();
//       setIsFormOpen(false);
//     } catch (err) {
//       setError('Failed to save maintenance record');
//       console.error(err);
//     }
//   };

//   const deleteRecord = async (id) => {
//     if (window.confirm('Delete this maintenance record?')) {
//       try {
//         await API.delete(`/maintenance/${id}`);
//         // Refresh data from database
//         await fetchRecords();
//       } catch (err) {
//         setError('Failed to delete maintenance record');
//         console.error(err);
//       }
//     }
//   };

//   // Helper to format currency
//   const formatCurrency = (amount) => {
//     return "Rs. " + parseFloat(amount).toLocaleString('en-LK', {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2
//     });
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

//       <main className="container mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8 items-start">
        
//         {/* Error Message */}
//         {error && (
//           <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
//             {error}
//           </div>
//         )}
        
//         {/* Table Section */}
//         <section className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
//           <h1 className="text-2xl font-bold text-slate-800 mb-6">Maintenance History</h1>

//           <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
//             <div className="relative flex-1 w-full">
//               <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
//                 <Search size={18} />
//               </span>
//               <input 
//                 type="text" 
//                 placeholder="Search maintenance records..." 
//                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <button 
//               onClick={openAddForm}
//               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 font-semibold"
//               disabled={loading}
//             >
//               <Plus size={20} /> Add Maintenance
//             </button>
//           </div>

//           {loading ? (
//             <div className="text-center py-8 text-slate-500">Loading maintenance records...</div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead>
//                   <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
//                     <th className="p-4 border-b">Vehicle Name</th>
//                     <th className="p-4 border-b text-center">Type</th>
//                     <th className="p-4 border-b text-center">Count</th>
//                     <th className="p-4 border-b">Added Parts</th>
//                     <th className="p-4 border-b">Status</th>
//                     <th className="p-4 border-b text-right">Total Cost (Rs.)</th>
//                     <th className="p-4 border-b text-center">Operations</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100 text-sm">
//                   {filteredRecords.length > 0 ? (
//                     filteredRecords.map((record) => (
//                       <tr key={record._id} className="hover:bg-blue-50 transition">
//                         <td className="p-4 font-semibold text-blue-700">{record.vehiclename}</td>
//                         <td className="p-4 text-center">
//                           <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
//                             record.type === 'Repair' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
//                           }`}>
//                             {record.type}
//                           </span>
//                         </td>
//                         <td className="p-4 text-center">{record.count}</td>
//                         <td className="p-4 text-slate-600 italic">{record.addedthings}</td>
//                         <td className="p-4">{record.status}</td>
//                         <td className="p-4 text-right font-mono font-bold">{formatCurrency(record.totcost)}</td>
//                         <td className="p-4 text-center">
//                           <div className="flex justify-center gap-2">
//                             <button onClick={() => openEditForm(record)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
//                               <Edit2 size={16} />
//                             </button>
//                             <button onClick={() => deleteRecord(record._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
//                               <Trash2 size={16} />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="7" className="p-4 text-center text-slate-500">No maintenance records found</td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </section>

//         {/* Form Sidebar */}
//         {isFormOpen && (
//           <aside className="w-full lg:w-96 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600 animate-in fade-in slide-in-from-right-4 duration-300 h-fit lg:sticky lg:top-24">
//             <div className="flex justify-between items-center mb-6 border-b pb-3">
//               <h2 className="text-lg font-bold text-slate-800">
//                 {editingId ? 'Update Maintenance Details' : 'Add Maintenance Details'}
//               </h2>
//               <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500 transition">
//                 <X size={20} />
//               </button>
//             </div>
            
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Name</label>
//                 <input 
//                   type="text" 
//                   name="vehiclename" 
//                   required 
//                   value={formData.vehiclename} 
//                   onChange={handleInputChange} 
//                   placeholder="e.g. Toyota Prius"
//                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition" 
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Maintenance Type</label>
//                 <select 
//                   name="type" 
//                   value={formData.type} 
//                   onChange={handleInputChange} 
//                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition bg-white"
//                 >
//                   <option value="Routine Service">Routine Service</option>
//                   <option value="Repair">Repair</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Maintained Count</label>
//                 <input 
//                   type="number" 
//                   name="count" 
//                   required 
//                   value={formData.count} 
//                   onChange={handleInputChange} 
//                   placeholder="Number of services"
//                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition" 
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Added Parts</label>
//                 <textarea 
//                   name="addedthings" 
//                   rows="2" 
//                   value={formData.addedthings} 
//                   onChange={handleInputChange} 
//                   placeholder="e.g. Tires, Battery"
//                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
//                 ></textarea>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
//                 <input 
//                   type="text"
//                   name="status" 
//                   value={formData.status} 
//                   onChange={handleInputChange} 
//                   placeholder="e.g. In Progress, Completed"
//                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
//                 />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cost (LKR)</label>
//                 <div className="relative">
//                   <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-bold">Rs.</span>
//                   <input 
//                     type="number" 
//                     name="totcost" 
//                     required 
//                     value={formData.totcost} 
//                     onChange={handleInputChange} 
//                     placeholder="0.00"
//                     className="w-full pl-10 pr-2.5 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition font-mono" 
//                   />
//                 </div>
//               </div>

//               <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg transition mt-4 uppercase tracking-wider text-sm">
//                 {editingId ? 'Update Details' : 'Add Details'}
//               </button>
//             </form>
//           </aside>
//         )}
//       </main>
//     </div>
//   );
// };

// export default MaintenanceManagement;

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
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

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await API.get('/maintenance');
      setRecords(response.data);
      setError(null);
      toast.success('Maintenance records loaded!', {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (err) {
      setError('Failed to fetch maintenance records');
      toast.error('Failed to load maintenance records', {
        position: 'top-right',
        autoClose: 2000,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record =>
    Object.values(record).some(val =>
      val.toString().toLowerCase().includes(searchTerm.toLowerCase())
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
        toast.success('Maintenance record updated successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
      } else {
        await API.post('/maintenance', payload);
        toast.success('Maintenance record added successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
      }
      
      await fetchRecords();
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Failed to save maintenance record', {
        position: 'top-right',
        autoClose: 2000,
      });
      console.error(err);
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm('Delete this maintenance record?')) {
      try {
        await API.delete(`/maintenance/${id}`);
        toast.success('Maintenance record deleted successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
        await fetchRecords();
      } catch (err) {
        toast.error('Failed to delete maintenance record', {
          position: 'top-right',
          autoClose: 2000,
        });
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      <main className="container mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8 items-start">
        
        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
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
              disabled={loading}
            >
              <Plus size={20} /> Add Maintenance
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading maintenance records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-4 border-b">Vehicle Name</th>
                    <th className="p-4 border-b text-center">Type</th>
                    <th className="p-4 border-b text-center">Count</th>
                    <th className="p-4 border-b">Added Parts</th>
                    <th className="p-4 border-b">Status</th>
                    <th className="p-4 border-b text-right">Total Cost (Rs.)</th>
                    <th className="p-4 border-b text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-blue-50 transition">
                        <td className="p-4 font-semibold text-blue-700">{record.vehiclename}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            record.type === 'Repair' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="p-4 text-center">{record.count}</td>
                        <td className="p-4 text-slate-600 italic">{record.addedthings}</td>
                        <td className="p-4">{record.status}</td>
                        <td className="p-4 text-right font-mono font-bold">{formatCurrency(record.totcost)}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEditForm(record)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteRecord(record._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-4 text-center text-slate-500">No maintenance records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
                  name="vehiclename" 
                  required 
                  value={formData.vehiclename} 
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
                  name="addedthings" 
                  rows="2" 
                  value={formData.addedthings} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Tires, Battery"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                <input 
                  type="text"
                  name="status" 
                  value={formData.status} 
                  onChange={handleInputChange} 
                  placeholder="e.g. In Progress, Completed"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cost (LKR)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-bold">Rs.</span>
                  <input 
                    type="number" 
                    name="totcost" 
                    required 
                    value={formData.totcost} 
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
