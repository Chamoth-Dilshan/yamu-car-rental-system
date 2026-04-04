import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

// Import the components
import VehicleManagement from './pages/VehicleManagement';
import MaintenanceManagement from './pages/MaintenanceManagement';
import InventoryManagement from './pages/InventoryManagement';

// 1. Define Navigation BEFORE App so it's ready to be used
const Navigation = () => {
  const location = useLocation();
  
  // Helper to check if the link is active
  const isActive = (path) => {
    // Check if current path matches EXACTLY or if we are at root "/" for vehicles
    const currentPath = location.pathname;
    if (path === '/vehicles' && currentPath === '/') return true;
    return currentPath === path;
  };

  const activeClass = "bg-blue-800 border-b-4 border-white font-bold";
  const inactiveClass = "hover:bg-blue-600 border-b-4 border-transparent";

  return (
    <header className="bg-blue-700 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center h-16">
        <div className="text-2xl font-black tracking-tighter mr-auto uppercase">YAMU</div>
        <nav className="hidden md:flex flex-1 justify-center h-full">
          <Link 
            to="/vehicles" 
            className={`px-6 flex items-center transition h-full ${isActive('/vehicles') ? activeClass : inactiveClass}`}
          >
            Vehicle Mngt.
          </Link>
          <Link 
            to="/maintenance" 
            className={`px-6 flex items-center transition h-full ${isActive('/maintenance') ? activeClass : inactiveClass}`}
          >
            Maintenance Mngt.
          </Link>
          <Link 
            to="/inventory" 
            className={`px-6 flex items-center transition h-full ${isActive('/inventory') ? activeClass : inactiveClass}`}
          >
            Inventory Mngt.
          </Link>
        </nav>
      </div>
    </header>
  );
};

// 2. Main App Component
const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        
        <Navigation /> 
        
        <main>
          <Routes>
            <Route path="/" element={<VehicleManagement />} />
            <Route path="/vehicles" element={<VehicleManagement />} />
            <Route path="/maintenance" element={<MaintenanceManagement />} />
            <Route path="/inventory" element={<InventoryManagement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
