import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
//import API from '../services/api';
import axios from '../api/axios'
const API = axios

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    _id: '',
    ownerName: '',
    phone: '',
    brand: '',
    model: '',
    year: '',
    fuel: 'Petrol',
    seats: '5',
    transmission: 'Automatic',
    imgUrl: '',
    availability: 'Available',
    distance: 0,
    pricePerDay: 0
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await API.get('/vehicles');
      setVehicles(response.data.vehicles);
      setLoading(false);
      toast.success('Vehicles loaded successfully!', {
        position: 'top-right',
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error('Failed to load vehicles', {
        position: 'top-right',
        autoClose: 2000,
      });
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({
      _id: '', ownerName: '', phone: '', brand: '', model: '',
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
        toast.success('Vehicle updated successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
      } else {
        await API.post('/vehicles', submissionData);
        toast.success('Vehicle added successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
      }
      fetchVehicles();
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error('Save failed. Make sure Reg No is unique.', {
        position: 'top-right',
        autoClose: 2000,
      });
    }
  };

  const deleteVehicle = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await API.delete(`/vehicles/${id}`);
        toast.success('Vehicle deleted successfully!', {
          position: 'top-right',
          autoClose: 2000,
        });
        fetchVehicles();
      } catch (error) {
        console.error("Error deleting:", error);
        toast.error('Failed to delete vehicle', {
          position: 'top-right',
          autoClose: 2000,
        });
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
                      <div className="font-semibold text-slate-700">{vehicle.ownerName}</div>
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

// import React, { useState, useEffect } from 'react';
// import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
// import { toast } from 'react-toastify';
// import axios from '../api/axios';
// import './VehicleManagement.css';

// const API = axios;

// const VehicleManagement = () => {
//   const [vehicles, setVehicles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);

//   const [formData, setFormData] = useState({
//     _id: '',
//     ownerName: '',
//     phone: '',
//     brand: '',
//     model: '',
//     year: '',
//     fuel: 'Petrol',
//     seats: '5',
//     transmission: 'Automatic',
//     imgUrl: '',
//     availability: 'Available',
//     distance: 0,
//     pricePerDay: 0
//   });

//   useEffect(() => {
//     fetchVehicles();
//   }, []);

//   const fetchVehicles = async () => {
//     try {
//       const response = await API.get('/vehicles');
//       setVehicles(response.data.vehicles || []);
//       setLoading(false);
//     } catch (error) {
//       console.error(error);
//       toast.error('Failed to load vehicles');
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.id]: e.target.value });
//   };

//   const openAddForm = () => {
//     setEditingId(null);
//     setFormData({
//       _id: '',
//       ownerName: '',
//       phone: '',
//       brand: '',
//       model: '',
//       year: '',
//       fuel: 'Petrol',
//       seats: '5',
//       transmission: 'Automatic',
//       imgUrl: '',
//       availability: 'Available',
//       distance: 0,
//       pricePerDay: 0
//     });
//     setIsFormOpen(true);
//   };

//   const openEditForm = (vehicle) => {
//     setEditingId(vehicle._id);
//     setFormData(vehicle);
//     setIsFormOpen(true);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const data = {
//       ...formData,
//       year: Number(formData.year),
//       seats: Number(formData.seats),
//       distance: Number(formData.distance),
//       pricePerDay: Number(formData.pricePerDay)
//     };

//     try {
//       if (editingId) {
//         await API.put(`/vehicles/${editingId}`, data);
//       } else {
//         await API.post('/vehicles', data);
//       }

//       toast.success('Saved successfully');
//       fetchVehicles();
//       setIsFormOpen(false);
//     } catch (error) {
//       toast.error('Error saving vehicle');
//     }
//   };

//   const deleteVehicle = async (id) => {
//     if (!window.confirm('Delete this vehicle?')) return;

//     try {
//       await API.delete(`/vehicles/${id}`);
//       toast.success('Deleted');
//       fetchVehicles();
//     } catch (error) {
//       toast.error('Delete failed');
//     }
//   };

//   const filteredVehicles = vehicles.filter(v =>
//     Object.values(v || {}).some(val =>
//       val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
//     )
//   );

//   if (loading) return <div className="loading">Loading Database...</div>;

//   return (
//     <div className="page">

//       <div className="container">

//         {/* HEADER */}
//         <div className="header">
//           <h1>Vehicle Management</h1>

//           <div className="header-actions">
//             <div className="search-box">
//               <Search size={18} />
//               <input
//                 type="text"
//                 placeholder="Search vehicles..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>

//             <button className="btn primary" onClick={openAddForm}>
//               <Plus size={18} /> Add Vehicle
//             </button>
//           </div>
//         </div>

//         {/* TABLE */}
//         <div className="table-container">
//           <table>
//             <thead>
//               <tr>
//                 <th>Vehicle</th>
//                 <th>Reg No</th>
//                 <th>Owner</th>
//                 <th>Brand</th>
//                 <th>Year</th>
//                 <th>Fuel</th>
//                 <th>Transmission</th>
//                 <th>Availability</th>
//                 <th>Km</th>
//                 <th>Price</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>

//             <tbody>
//               {filteredVehicles.length > 0 ? (
//                 filteredVehicles.map(vehicle => (
//                   <tr key={vehicle._id}>
//                     <td>
//                       <img src={vehicle.imgUrl} alt="car" className="car-img" />
//                     </td>
//                     <td>{vehicle._id}</td>
//                     <td>
//                       <div>{vehicle.ownerName}</div>
//                       <small>{vehicle.phone}</small>
//                     </td>
//                     <td>{vehicle.brand} {vehicle.model}</td>
//                     <td>{vehicle.year}</td>
//                     <td>{vehicle.fuel}</td>
//                     <td>{vehicle.transmission}</td>
//                     <td>{vehicle.availability}</td>
//                     <td>{vehicle.distance}</td>
//                     <td>Rs {Number(vehicle.pricePerDay || 0).toFixed(2)}</td>
//                     <td>
//                       <button onClick={() => openEditForm(vehicle)}>
//                         <Edit2 size={16} />
//                       </button>
//                       <button onClick={() => deleteVehicle(vehicle._id)}>
//                         <Trash2 size={16} />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan="11" className="empty">
//                     No vehicles found
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* FORM */}
//         {isFormOpen && (
//           <div className="form-overlay">
//             <div className="form-card">

//               <div className="form-header">
//                 <h2>{editingId ? 'Update' : 'Add'} Vehicle</h2>
//                 <button onClick={() => setIsFormOpen(false)}>
//                   <X />
//                 </button>
//               </div>

//               <form onSubmit={handleSubmit}>

//                 <input id="_id" placeholder="Reg No" value={formData._id} onChange={handleInputChange} />
//                 <input id="ownerName" placeholder="Owner Name" value={formData.ownerName} onChange={handleInputChange} />
//                 <input id="phone" placeholder="Phone" value={formData.phone} onChange={handleInputChange} />
//                 <input id="brand" placeholder="Brand" value={formData.brand} onChange={handleInputChange} />
//                 <input id="model" placeholder="Model" value={formData.model} onChange={handleInputChange} />
//                 <input id="year" type="number" placeholder="Year" value={formData.year} onChange={handleInputChange} />
//                 <input id="imgUrl" placeholder="Image URL" value={formData.imgUrl} onChange={handleInputChange} />
//                 <input id="pricePerDay" type="number" placeholder="Price Per Day" value={formData.pricePerDay} onChange={handleInputChange} />

//                 <button type="submit" className="btn primary full">
//                   {editingId ? 'Update' : 'Add'} Vehicle
//                 </button>

//               </form>

//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// };

// export default VehicleManagement;