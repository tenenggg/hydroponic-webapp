import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaLeaf, FaFlask, FaChartLine, FaClock, FaUsers, FaUserCog, FaSeedling, FaSignOutAlt, FaTable, FaHome, FaBell, FaTrash, FaLayerGroup } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import { useNotifications } from '../context/NotificationContext';


// Configuration for navigation items
// Each item has a label, icon, and path
// The icons are imported from react-icons/fa
const navConfig = [
  { label: 'Home', icon: FaHome, path: '/' },
  { label: 'View Data', icon: FaLeaf, path: '/view-data' },
  { label: 'Optimized Level', icon: FaFlask, path: '/view-optimised-level' },
  { label: 'View Graph', icon: FaChartLine, path: '/view-graph' },
  { label: 'Select Plant', icon: FaLeaf, path: '/select-plant' },
  { label: 'Raw Data', icon: FaTable, path: '/raw-data' },
  { label: 'Multiplant Range', icon: FaLayerGroup, path: '/multiplant-selector' },
];

// Additional navigation items for admin users
// These items are only shown if the user role is 'admin'
const adminNavConfig = [
  { label: 'Manage Users', icon: FaUsers, path: '/manage-users' },
  { label: 'Manage Plants', icon: FaSeedling, path: '/manage-plants' },
];

// Constants for layout dimensions
// These constants define the width of the sidebar and height of the navbar
const SIDEBAR_WIDTH = 'w-28 md:w-52';
const NAVBAR_HEIGHT = 'h-20'; // 5rem = 80px


// Main Layout component
// This component wraps the entire application and provides a consistent layout
// It includes a sidebar for navigation, a header with user info, and a main content area
// The sidebar and header are fixed, while the main content area scrolls
// The component also handles user authentication, time display, and notifications
// It uses the useNavigate and useLocation hooks from react-router-dom for navigation
// The useNotifications context is used to manage notifications
// The component also uses the supabase client for authentication and data fetching
// The layout is styled using Tailwind CSS for a modern and responsive design
// The sidebar contains navigation items that change based on the user role
// The header displays the current time, user role, and a logout button
// The notifications bell shows the number of unread notifications and allows users to view and delete them
// The component uses useEffect to set up the current time and user role on mount   
function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [userRole, setUserRole] = useState(null);
  const { notifications, removeNotification, clearAllNotifications } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPlantName, setSelectedPlantName] = useState('-');


  // Set up user role and current time on mount
  // This effect runs once when the component mounts
  // It retrieves the user role from localStorage and sets up a timer to update the current time every second
  // The user role is used to determine which navigation items to show
  // The current time is displayed in the header
  // The timer is cleared when the component unmounts to prevent memory leaks
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch selected plant name for navbar
  useEffect(() => {
    async function fetchSelectedPlant() {
      // Get selected plant id from system_config
      const { data: config, error: configError } = await supabase
        .from('system_config')
        .select('selected_plant_id')
        .limit(1)
        .single();
      if (configError || !config?.selected_plant_id) {
        setSelectedPlantName('-');
        return;
      }
      const selectedPlantId = config.selected_plant_id;
      // Try plant_profiles first
      let { data: plant, error: plantError } = await supabase
        .from('plant_profiles')
        .select('name')
        .eq('id', selectedPlantId)
        .single();
      if (plantError || !plant) {
        // Try multiplant_profile
        const { data: multiplant } = await supabase
          .from('multiplant_profile')
          .select('name')
          .eq('id', selectedPlantId)
          .single();
        if (multiplant && multiplant.name) {
          setSelectedPlantName(multiplant.name);
        } else {
          setSelectedPlantName('-');
        }
      } else {
        setSelectedPlantName(plant.name);
      }
    }
    fetchSelectedPlant();
  }, [location]);

  // Handle user logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Build nav items
  // This function constructs the navigation items based on the user role
  // It combines the base navigation items with additional items for admin users
  const navItems = [...navConfig];
  if (userRole === 'admin') navItems.push(...adminNavConfig);

  return (

    // Main layout structure
    // The layout consists of a sidebar, header, and main content area
    // The sidebar is fixed on the left side and contains navigation buttons
    <div className="min-h-screen bg-green-900">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen z-40 bg-green-950 flex flex-col items-center py-10 gap-5 shadow-lg overflow-y-auto ${SIDEBAR_WIDTH}`}
        style={{
          width: '112px',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE 10+
        }}
      >
        <style>{`
          aside::-webkit-scrollbar { display: none; }
        `}</style>
        {/* User/Admin Logo and Name */}
        <div className="mb-10 flex flex-col items-center">
          <FaUserCog size={64} color="white" className="transition-transform duration-300 group-hover:scale-110" />
          <span className="text-3xl font-bold text-white mt-3 tracking-wide">
            {userRole === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
        <nav className="flex flex-col gap-6 w-full items-center">
          {navItems.map((item, idx) => {   // Map through the navigation items and create buttons for each
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center w-full py-3 rounded transition-all duration-200 ease-in-out transform ${isActive ? 'bg-green-800 scale-105' : 'hover:bg-green-800 hover:scale-105'}`}
              >
                <Icon size={32} color="white" className="transition-transform duration-200" />
                <span className="text-base mt-1 text-white font-semibold tracking-wide transition-colors duration-200">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */} 
      {/* It is styled to take up the remaining space and has a fixed margin to accommodate the sidebar */}
      {/* The header is fixed at the top and contains the title, notifications, current time, and logout button */}
      {/* The main area has a top padding to account for the fixed header height */}
    
    
      <div className={`flex-1 flex flex-col min-h-screen`} style={{marginLeft: '112px'}}>
        {/* Header */}
        <header className={`fixed top-0 left-0 right-0 z-30 bg-green-800 px-8 py-4 flex items-center justify-between shadow ${NAVBAR_HEIGHT}`} style={{marginLeft: '112px', height: '80px'}}>
          <h1 className="text-3xl md:text-4xl font-bold text-white transition-colors duration-200">Hydroponic Monitoring</h1>
          <div className="flex items-center gap-6">
            {/* Notifications Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="text-white hover:text-gray-300">
                <FaBell size={24} />
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-green-950 border border-green-700 rounded-lg shadow-xl z-50">
                  <div className="p-4 font-bold text-white border-b border-green-700 flex items-center justify-between">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded flex items-center gap-1"
                        title="Delete All Notifications"
                      >
                        <FaTrash size={12} /> Delete All
                      </button>
                    )}
                  </div>
                  <ul className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <li key={n.id} className="flex items-center justify-between p-3 border-b border-green-800 hover:bg-green-900 gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-gray-300">{n.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {n.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                          <button onClick={() => removeNotification(n.id)} className="text-gray-400 hover:text-white flex-shrink-0">
                            <FaTrash size={14} />
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="p-4 text-center text-sm text-gray-400">No new notifications</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            {/* Selected Plant Name */}
            <div className="flex items-center gap-2 text-white text-xl px-4 py-2 rounded-lg border-2 border-green-400 bg-green-950 shadow-md" style={{ minWidth: '120px' }}>
              <span className="font-bold">Plant:</span>
              <span>{selectedPlantName}</span>
            </div>
            <div className="flex items-center gap-2 text-white text-xl">
              <FaClock size={24} color="white" />
              <span>{currentTime}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg transition-all duration-200 ease-in-out hover:scale-105 text-white"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </header>
        {/* Main Area */}
        <main className="flex-1 bg-green-900" style={{paddingTop: '80px'}}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout; 
