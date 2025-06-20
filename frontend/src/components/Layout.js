import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaLeaf, FaFlask, FaChartLine, FaClock, FaUsers, FaUserCog, FaSeedling, FaSignOutAlt, FaTable, FaHome } from 'react-icons/fa';
import { supabase } from '../supabaseClient';

const navConfig = [
  { label: 'Home', icon: FaHome, path: '/' },
  { label: 'View Data', icon: FaLeaf, path: '/view-data' },
  { label: 'Optimized Level', icon: FaFlask, path: '/view-optimised-level' },
  { label: 'View Graph', icon: FaChartLine, path: '/view-graph' },
  { label: 'Select Plant', icon: FaLeaf, path: '/select-plant' },
  { label: 'Raw Data', icon: FaTable, path: '/raw-data' },
];
const adminNavConfig = [
  { label: 'Manage Users', icon: FaUsers, path: '/manage-users' },
  { label: 'Manage Plants', icon: FaSeedling, path: '/manage-plants' },
];

const SIDEBAR_WIDTH = 'w-28 md:w-52';
const NAVBAR_HEIGHT = 'h-20'; // 5rem = 80px

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Build nav items
  const navItems = [...navConfig];
  if (userRole === 'admin') navItems.push(...adminNavConfig);

  return (
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
          {navItems.map((item, idx) => {
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
      <div className={`flex-1 flex flex-col min-h-screen`} style={{marginLeft: '112px'}}>
        {/* Header */}
        <header className={`fixed top-0 left-0 right-0 z-30 bg-green-800 px-8 py-4 flex items-center justify-between shadow ${NAVBAR_HEIGHT}`} style={{marginLeft: '112px', height: '80px'}}>
          <h1 className="text-3xl md:text-4xl font-bold text-white transition-colors duration-200">Hydroponic Monitoring</h1>
          <div className="flex items-center gap-4">
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