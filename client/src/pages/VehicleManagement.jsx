// import React, { useState, useEffect } from 'react';
// import { Search, Plus, Edit2, Trash2, X, Car } from 'lucide-react';

// const VehicleManagement = () => {
//   // Initial Data
//   const initialVehicles = [
//     {
//       id: 1,
//       regNo: 'WP-CAD-1234',
//       owner: 'Yamu Company',
//       phone: '0771234567',
//       brand: 'Toyota',
//       model: 'Prius',
//       year: '2022',
//       fuel: 'Hybrid',
//       seats: '5',
//       transmission: 'Auto',
//       imgUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQV8DcAfkBI6ouZzEMM_wuKGFqNWf53i4MclA&s',
//       availability: 'Available'
//     },
//     {
//       id: 2,
//       regNo: 'WP-CBE-5678',
//       owner: 'Yamu Company',
//       phone: '0719876543',
//       brand: 'Honda',
//       model: 'Vezel',
//       year: '2021',
//       fuel: 'Petrol',
//       seats: '5',
//       transmission: 'Auto',
//       imgUrl: 'https://images.unsplash.com/photo-1590362891175-3794ef169faf?auto=format&fit=crop&q=80&w=200',
//       availability: 'In Use'
//     }
//   ];

//   // States
//   const [vehicles, setVehicles] = useState(initialVehicles);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [formData, setFormData] = useState({
//     regNo: '',
//     brand: '',
//     owner: '',
//     phone: '',
//     model: '',
//     imgUrl: '',
//     year: '',
//     fuel: 'Petrol',
//     seats: '5',
//     transmission: 'Automatic',
//     availability: 'Available'
//   });

//   // Filter Logic
//   const filteredVehicles = vehicles.filter(v =>
//     Object.values(v).some(val => 
//       val.toString().toLowerCase().includes(searchTerm.toLowerCase())
//     )
//   );

//   // Form Handlers
//   const handleInputChange = (e) => {
//     const { id, value } = e.target;
//     setFormData({ ...formData, [id]: value });
//   };

//   const openAddForm = () => {
//     setEditingId(null);
//     setFormData({
//       regNo: '', brand: '', owner: '', phone: '', model: '',
//       imgUrl: '', year: '', fuel: 'Petrol', seats: '5', 
//       transmission: 'Automatic', availability: 'Available'
//     });
//     setIsFormOpen(true);
//   };

//   const openEditForm = (vehicle) => {
//     setEditingId(vehicle.id);
//     setFormData({ ...vehicle, transmission: vehicle.transmission === 'Auto' ? 'Automatic' : 'Manual' });
//     setIsFormOpen(true);
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     const formattedData = {
//       ...formData,
//       id: editingId || Date.now(),
//       transmission: formData.transmission === 'Automatic' ? 'Auto' : 'Manual',
//       imgUrl: formData.imgUrl || 'https://via.placeholder.com/80x50?text=Vehicle'
//     };

//     if (editingId) {
//       setVehicles(vehicles.map(v => v.id === editingId ? formattedData : v));
//     } else {
//       setVehicles([...vehicles, formattedData]);
//     }
//     setIsFormOpen(false);
//   };

//   const deleteVehicle = (id) => {
//     if (window.confirm('Are you sure you want to delete this vehicle?')) {
//       setVehicles(vehicles.filter(v => v.id !== id));
//     }
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

//       <main className="container mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8">
        
//         {/* Table Section */}
//         <section className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
//           <h1 className="text-2xl font-bold text-slate-800 mb-6">Vehicle Management</h1>

//           <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
//             <div className="relative flex-1 w-full">
//               <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
//                 <Search size={18} />
//               </span>
//               <input 
//                 type="text" 
//                 placeholder="Search vehicles..." 
//                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>
//             <button 
//               onClick={openAddForm}
//               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 font-semibold"
//             >
//               <Plus size={20} /> Add Vehicle
//             </button>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
//                   <th className="p-4 border-b">Vehicle</th>
//                   <th className="p-4 border-b">Reg No</th>
//                   <th className="p-4 border-b">Owner</th>
//                   <th className="p-4 border-b">Brand</th>
//                   <th className="p-4 border-b text-center">Year</th>
//                   <th className="p-4 border-b text-center">Fuel</th>
//                   <th className="p-4 border-b text-center">Trans.</th>
//                   <th className="p-4 border-b text-center">Availability</th>
//                   <th className="p-4 border-b text-center">Operations</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100 text-sm">
//                 {filteredVehicles.map((vehicle) => (
//                   <tr key={vehicle.id} className="hover:bg-blue-50 transition group">
//                     <td className="p-4">
//                       <img src={vehicle.imgUrl} alt="car" className="w-20 h-12 object-contain mix-blend-multiply" />
//                     </td>
//                     <td className="p-4 font-mono font-bold text-blue-700">{vehicle.regNo}</td>
//                     <td className="p-4">
//                       <div className="font-semibold text-slate-700">{vehicle.owner}</div>
//                       <div className="text-xs text-slate-400">{vehicle.phone}</div>
//                     </td>
//                     <td className="p-4">
//                       <span className="font-semibold">{vehicle.brand}</span>
//                       <span className="text-slate-500 ml-1">{vehicle.model}</span>
//                     </td>
//                     <td className="p-4 text-center">{vehicle.year}</td>
//                     <td className="p-4 text-center">
//                       <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
//                         {vehicle.fuel}
//                       </span>
//                     </td>
//                     <td className="p-4 text-center text-slate-500">{vehicle.transmission}</td>
//                     <td className="p-4 text-center">
//                       <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
//                         vehicle.availability === 'Available' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
//                       }`}>
//                         {vehicle.availability}
//                       </span>
//                     </td>
//                     <td className="p-4 text-center">
//                       <div className="flex justify-center gap-2">
//                         <button onClick={() => openEditForm(vehicle)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
//                           <Edit2 size={16} />
//                         </button>
//                         <button onClick={() => deleteVehicle(vehicle.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
//                           <Trash2 size={16} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </section>

//         {/* Form Sidebar */}
//         {isFormOpen && (
//           <aside className="w-full lg:w-96 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600 animate-in fade-in slide-in-from-right-4 duration-300 h-fit lg:sticky lg:top-24">
//             <div className="flex justify-between items-center mb-6 border-b pb-3">
//               <h2 className="text-lg font-bold text-slate-800">
//                 {editingId ? 'Update Vehicle' : 'Add New Vehicle'}
//               </h2>
//               <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500 transition">
//                 <X size={20} />
//               </button>
//             </div>
            
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reg No</label>
//                   <input type="text" id="regNo" required value={formData.regNo} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Brand</label>
//                   <input type="text" id="brand" required value={formData.brand} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Owner Name</label>
//                 <input type="text" id="owner" required value={formData.owner} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone No</label>
//                 <input type="text" id="phone" required value={formData.phone} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
//               </div>

//               <div>
//                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Image URL</label>
//                 <input type="text" id="imgUrl" value={formData.imgUrl} onChange={handleInputChange} placeholder="https://..." className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-xs" />
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year</label>
//                   <input type="number" id="year" value={formData.year} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fuel Type</label>
//                   <select id="fuel" value={formData.fuel} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white">
//                     <option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
//                   </select>
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transmission</label>
//                   <select id="transmission" value={formData.transmission} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white">
//                     <option>Automatic</option><option>Manual</option>
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Availability</label>
//                   <select id="availability" value={formData.availability} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white">
//                     <option>Available</option><option>In Use</option><option>Maintenance</option>
//                   </select>
//                 </div>
//               </div>

//               <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition mt-4 uppercase tracking-wider text-sm">
//                 {editingId ? 'Update Vehicle' : 'Add Vehicle'}
//               </button>
//             </form>
//           </aside>
//         )}
//       </main>
//     </div>
//   );
// };

// export default VehicleManagement;









import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import API from '../services/api'; 

const VehicleManagement = () => {
  // States
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    _id: '', // Reg No in your schema
    owner: '',
    phone: '',
    brand: '',
    model: '',
    year: '',
    fuel: 'Petrol',
    seats: '5',
    transmission: 'Automatic',
    imgUrl: '',
    availability: 'Available',
    distance: 0,      // Required by your schema
    pricePerDay: 0    // Required by your schema
  });

  // Load data from Backend
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await API.get('/vehicles');
      setVehicles(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setLoading(false);
    }
  };

  // Form Handlers
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({
      _id: '', owner: '', phone: '', brand: '', model: '',
      year: '', fuel: 'Petrol', seats: '5', 
      transmission: 'Automatic', imgUrl: '', availability: 'Available',
      distance: 0, pricePerDay: 0
    });
    setIsFormOpen(true);
  };

  const openEditForm = (vehicle) => {
    setEditingId(vehicle._id);
    setFormData({ ...vehicle });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Formatting data for Mongoose (Numbers must be Numbers)
    const submissionData = {
      ...formData,
      year: Number(formData.year),
      seats: Number(formData.seats),
      distance: Number(formData.distance),
      pricePerDay: Number(formData.pricePerDay)
    };

    try {
      if (editingId) {
        await API.put(`/vehicles/${editingId}`, submissionData);
      } else {
        await API.post('/vehicles', submissionData);
      }
      fetchVehicles();
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Save failed. Make sure Reg No is unique.");
    }
  };

  const deleteVehicle = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await API.delete(`/vehicles/${id}`);
        fetchVehicles();
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    Object.values(v).some(val => 
      val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) return <div className="p-10 text-center font-bold">Loading Database...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="container mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8">
        
        {/* Table Section - Columns unchanged */}
        <section className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Vehicle Management</h1>

          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={18} />
              </span>
              <input 
                type="text" 
                placeholder="Search vehicles..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openAddForm}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-2 font-semibold"
            >
              <Plus size={20} /> Add Vehicle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="p-4 border-b">Vehicle</th>
                  <th className="p-4 border-b">Reg No</th>
                  <th className="p-4 border-b">Owner</th>
                  <th className="p-4 border-b">Brand</th>
                  <th className="p-4 border-b text-center">Year</th>
                  <th className="p-4 border-b text-center">Fuel</th>
                  <th className="p-4 border-b text-center">Transmission</th>
                  <th className="p-4 border-b text-center">Availability</th>
                  <th className="p-4 border-b text-center">Mileage in Km</th>
                  <th className="p-4 border-b text-center">Price/day</th>
                  <th className="p-4 border-b text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="hover:bg-blue-50 transition group">
                    <td className="p-4">
                      <img src={vehicle.imgUrl} alt="car" className="w-20 h-12 object-contain mix-blend-multiply" />
                    </td>
                    <td className="p-4 font-mono font-bold text-blue-700">{vehicle._id}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700">{vehicle.owner}</div>
                      <div className="text-xs text-slate-400">{vehicle.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">{vehicle.brand}</span>
                      <span className="text-slate-500 ml-1">{vehicle.model}</span>
                    </td>
                    <td className="p-4 text-center">{vehicle.year}</td>
                    <td className="p-4 text-center">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {vehicle.fuel}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-500">{vehicle.transmission}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        vehicle.availability === 'Available' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {vehicle.availability}
                      </span>
                    </td>
                    <td className="p-4 text-center">{vehicle.distance}</td>
                    <td className="p-4 text-center font-bold text-blue-700">
                      Rs. {vehicle.pricePerDay.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openEditForm(vehicle)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteVehicle(vehicle._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
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
          <aside className="w-full lg:w-96 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600 h-fit lg:sticky lg:top-24">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Update Vehicle' : 'Add New Vehicle'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Image URL</label>
                  <input type="text" id="imgUrl" required value={formData.imgUrl} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reg No</label>
                  <input 
                    type="text" id="_id" required 
                    disabled={editingId} 
                    value={formData._id} onChange={handleInputChange} 
                    className={`w-full p-2 border border-slate-200 rounded-lg outline-none ${editingId ? 'bg-slate-50 text-slate-400' : ''}`} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Brand</label>
                  <input type="text" id="brand" required value={formData.brand} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Owner Name</label>
                <input type="text" id="owner" required value={formData.owner} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone No</label>
                <input type="text" id="phone" required value={formData.phone} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model</label>
                  <input type="text" id="model" required value={formData.model} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year</label>
                  <input type="number" id="year" value={formData.year} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fuel Type</label>
                  <select id="fuel" value={formData.fuel} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white">
                    <option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Transmission</label>
                  <select id="transmission" value={formData.transmission} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none bg-white">
                    <option>Automatic</option><option>Manual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price Per Day</label>
                  <input type="number" id="pricePerDay" required value={formData.pricePerDay} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mileage in Km</label>
                  <input type="number" id="distance" value={formData.distance} onChange={handleInputChange} className="w-full p-2 border border-slate-200 rounded-lg outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg uppercase tracking-wider text-sm">
                {editingId ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </form>
          </aside>
        )}
      </main>
    </div>
  );
};

export default VehicleManagement;