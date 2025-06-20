import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLeaf, FaFlask, FaChartLine, FaUsers, FaSeedling, FaTable, FaHome } from 'react-icons/fa';
import Layout from './Layout';

function Dashboard() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
  }, []);

  // Sidebar navigation items (no branding, no role info) yessir
  const navItems = [
    { label: 'Home', icon: <FaHome size={24} color="white" />, onClick: () => navigate('/') },
    { label: 'View Data', icon: <FaLeaf size={24} color="white" />, onClick: () => navigate('/view-data') },
    { label: 'Optimized Level', icon: <FaFlask size={24} color="white" />, onClick: () => navigate('/view-optimised-level') },
    { label: 'View Graph', icon: <FaChartLine size={24} color="white" />, onClick: () => navigate('/view-graph') },
    { label: 'Select Plant', icon: <FaLeaf size={24} color="white" />, onClick: () => navigate('/select-plant') },
    { label: 'Raw Data', icon: <FaTable size={24} color="white" />, onClick: () => navigate('/raw-data') },
  ];
  if (userRole === 'admin') {
    navItems.push(
      { label: 'Manage Users', icon: <FaUsers size={24} color="white" />, onClick: () => navigate('/manage-users') },
      { label: 'Manage Plants', icon: <FaSeedling size={24} color="white" />, onClick: () => navigate('/manage-plants') }
    );
  }

  // Main feature cards (all icons white)
  const featureCards = [
    { label: 'View Data', icon: <FaLeaf size={48} color="white" />, onClick: () => navigate('/view-data') },
    { label: 'Optimized Level', icon: <FaFlask size={48} color="white" />, onClick: () => navigate('/view-optimised-level') },
    { label: 'View Graph', icon: <FaChartLine size={48} color="white" />, onClick: () => navigate('/view-graph') },
    { label: 'Select Plant', icon: <FaLeaf size={48} color="white" />, onClick: () => navigate('/select-plant') },
    { label: 'Raw Data', icon: <FaTable size={48} color="white" />, onClick: () => navigate('/raw-data') },
  ];
  if (userRole === 'admin') {
    featureCards.push(
      { label: 'Manage Users', icon: <FaUsers size={48} color="white" />, onClick: () => navigate('/manage-users') },
      { label: 'Manage Plants', icon: <FaSeedling size={48} color="white" />, onClick: () => navigate('/manage-plants') }
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white">Services</h2>
          <p className="text-green-200">Welcome to your dashboard</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featureCards.map((card, idx) => (
            <div
              key={idx}
              onClick={card.onClick}
              className="bg-green-800 bg-opacity-80 rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-xl"
            >
              {card.icon}
              <span className="mt-4 text-lg font-semibold text-white transition-colors duration-200">{card.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
