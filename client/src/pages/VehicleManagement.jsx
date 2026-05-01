import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Car, QrCode as QrIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import API from '../services/api';

const VehicleManagement = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        _id: '',
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
        distance: 0,
        pricePerDay: 0
    });

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async (silent = true) => {
        try {
            setLoading(true);
            const response = await API.get('/vehicles');
            setVehicles(response.data);
            if (!silent) toast.success('Vehicles updated');
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            toast.error('Failed to load vehicles');
        } finally {
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
                toast.success('Vehicle updated successfully!');
            } else {
                await API.post('/vehicles', submissionData);
                toast.success('Vehicle added successfully!');
            }
            fetchVehicles();
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving:", error);
            toast.error('Save failed. Make sure Reg No is unique.');
        }
    };

    const deleteVehicle = async (id) => {
        if (window.confirm('Are you sure you want to delete this vehicle?')) {
            try {
                await API.delete(`/vehicles/${id}`);
                toast.success('Vehicle deleted successfully!');
                fetchVehicles();
            } catch (error) {
                console.error("Error deleting:", error);
                toast.error('Failed to delete vehicle');
            }
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        Object.values(v).some(val =>
            val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
            <main className="container mx-auto py-8 px-4">

                <header className="mb-8">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <Car className="text-blue-600" />
                        Vehicle Fleet
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your rental inventory and vehicle specifications.</p>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">

                    <section className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                            <div className="relative flex-1 w-full max-w-md">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                    <Search size={18} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search by brand, reg no, owner..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={openAddForm}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2 font-bold"
                            >
                                <Plus size={20} /> Add Vehicle
                            </button>
                        </div>

                        {loading && vehicles.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-medium">Loading database...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                            <th className="px-6 py-4 border-b">Vehicle</th>
                                            <th className="px-6 py-4 border-b">Details</th>
                                            <th className="px-6 py-4 border-b">Mileage</th>
                                            <th className="px-6 py-4 border-b">Registration</th>
                                            <th className="px-6 py-4 border-b text-center">Status</th>
                                            <th className="px-6 py-4 border-b text-right">Price/Day</th>
                                            <th className="px-6 py-4 border-b text-center">QR Scan</th>
                                            <th className="px-6 py-4 border-b text-center">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredVehicles.length > 0 ? (
                                            filteredVehicles.map((vehicle) => (
                                                <tr key={vehicle._id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="w-24 h-14 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                                                            {vehicle.imgUrl ? (
                                                                <img src={vehicle.imgUrl} alt="car" className="w-full h-full object-cover mix-blend-multiply" />
                                                            ) : (
                                                                <Car className="text-slate-300" size={24} />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-slate-800">{vehicle.brand} {vehicle.model}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5 tracking-tight uppercase font-bold">
                                                            {vehicle.year} • {vehicle.fuel} • {vehicle.transmission}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-mono font-black text-slate-700 text-sm">
                                                                {vehicle.distance?.toLocaleString() || 0}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight text-blue-500">Km</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-bold text-blue-700 tracking-tighter uppercase">{vehicle._id}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${vehicle.availability === 'Available' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {vehicle.availability}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-black text-slate-800">
                                                        Rs. {vehicle.pricePerDay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center bg-white p-1 rounded-lg border border-slate-100 shadow-sm inline-block group-hover:scale-125 transition-transform cursor-pointer" title="Scan for instant details">
                                                            <QRCodeSVG 
                                                                value={`--- YAMU VEHICLE INFO ---\nREG NO: ${vehicle._id}\nMODEL: ${vehicle.brand} ${vehicle.model} (${vehicle.year})\nFUEL: ${vehicle.fuel}\nTRANS: ${vehicle.transmission}\nMILEAGE: ${vehicle.distance?.toLocaleString()} Km\nRATE: Rs. ${vehicle.pricePerDay?.toLocaleString()}\nOWNER: ${vehicle.owner}\nPHONE: ${vehicle.phone}\n-------------------------`} 
                                                                size={45}
                                                                level={"M"}
                                                                includeMargin={false}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={() => openEditForm(vehicle)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors">
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => deleteVehicle(vehicle._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="py-20 text-center text-slate-400 italic">No vehicles found. Click "Add Vehicle" to begin.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {isFormOpen && (
                        <aside className="w-full lg:w-[450px] bg-white p-8 rounded-2xl shadow-xl border-t-4 border-blue-600 h-fit lg:sticky lg:top-24 mb-12">
                            <div className="flex justify-between items-center mb-8 border-b pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                        {editingId ? 'Update Vehicle' : 'Register New Vehicle'}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-1">Vehicle specifications and owner details</p>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Image URL</label>
                                    <input type="text" id="imgUrl" required value={formData.imgUrl} onChange={handleInputChange} placeholder="https://..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Reg No</label>
                                        <input
                                            type="text" id="_id" required
                                            disabled={editingId}
                                            value={formData._id} onChange={handleInputChange}
                                            placeholder="CAD-1234"
                                            className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all ${editingId ? 'bg-slate-50 text-slate-400 font-mono' : 'font-mono font-bold'}`}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Brand</label>
                                        <input type="text" id="brand" required value={formData.brand} onChange={handleInputChange} placeholder="Toyota" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Owner Name</label>
                                        <input type="text" id="owner" required value={formData.owner} onChange={handleInputChange} placeholder="Full Name" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Phone No</label>
                                        <input type="text" id="phone" required value={formData.phone} onChange={handleInputChange} placeholder="07XXXXXXXX" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Model</label>
                                        <input type="text" id="model" required value={formData.model} onChange={handleInputChange} placeholder="Prius" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Year</label>
                                        <input type="number" id="year" value={formData.year} onChange={handleInputChange} placeholder="2020" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fuel Type</label>
                                        <select id="fuel" value={formData.fuel} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-white font-medium">
                                            <option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Transmission</label>
                                        <select id="transmission" value={formData.transmission} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-white font-medium">
                                            <option>Automatic</option><option>Manual</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rate / Day</label>
                                        <input type="number" id="pricePerDay" required value={formData.pricePerDay} onChange={handleInputChange} placeholder="5000" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Mileage (Km)</label>
                                        <input type="number" id="distance" value={formData.distance} onChange={handleInputChange} placeholder="0" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-100 uppercase tracking-widest text-xs active:scale-[0.98] mt-6 transition-all">
                                    {editingId ? 'Update Fleet' : 'Add to Fleet'}
                                </button>
                            </form>
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VehicleManagement;
