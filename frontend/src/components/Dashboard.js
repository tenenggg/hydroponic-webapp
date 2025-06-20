import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLeaf, FaFlask, FaChartLine, FaUsers, FaSeedling, FaTable, FaHome, FaTint, FaPlus, FaMinus } from 'react-icons/fa';
import Layout from './Layout';
import { supabase } from '../supabaseClient';
import { useNotifications } from '../context/NotificationContext';

// A reusable component for the pump status toggle switch
const ToggleSwitch = ({ ison, label }) => (
  <div className="flex items-center justify-between w-full">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <div
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 ${
        ison ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
          ison ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  </div>
);

function Dashboard() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const { addNotification } = useNotifications();
  const [pumpStatus, setPumpStatus] = useState({
    pump1: false,
    pump2: false,
    pump3: false,
    pump4: false,
  });
  const prevPumpStatus = useRef(pumpStatus);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);

    // Fetch initial pump status
    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('pump1, pump2, pump3, pump4')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching initial pump status:', error);
      } else if (data) {
        setPumpStatus(data);
      }
    };

    fetchInitialStatus();

    // Set up real-time subscription
    const subscription = supabase
      .channel('sensor_data_pump_status')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        (payload) => {
          const newStatus = payload.new;
          setPumpStatus({
            pump1: newStatus.pump1,
            pump2: newStatus.pump2,
            pump3: newStatus.pump3,
            pump4: newStatus.pump4,
          });

          // Check for pump state changes and send notifications
          if (newStatus.pump1 && !prevPumpStatus.current.pump1) {
            addNotification('Pump 1 (Solution A+B) was activated.');
          }
          if (newStatus.pump2 && !prevPumpStatus.current.pump2) {
            addNotification('Pump 2 (Water) was activated.');
          }
          if (newStatus.pump3 && !prevPumpStatus.current.pump3) {
            addNotification('Pump 3 (pH Up) was activated.');
          }
          if (newStatus.pump4 && !prevPumpStatus.current.pump4) {
            addNotification('Pump 4 (pH Down) was activated.');
          }

          // Update the ref for the next comparison
          prevPumpStatus.current = newStatus;
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [addNotification]);

  const pumpInfo = [
    { key: 'pump1', label: 'Solution A+B', icon: <FaPlus className="text-blue-400" size={24} /> },
    { key: 'pump2', label: 'Water', icon: <FaTint className="text-cyan-400" size={24} /> },
    { key: 'pump3', label: 'pH Up', icon: <FaPlus className="text-yellow-400" size={24} /> },
    { key: 'pump4', label: 'pH Down', icon: <FaMinus className="text-orange-400" size={24} /> },
  ];

  // Sidebar navigation items (no branding, no role info)
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
          <h2 className="text-2xl font-semibold text-white">Live Pump Status</h2>
          <p className="text-green-200">Real-time monitoring of system pumps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {pumpInfo.map((pump) => (
            <div
              key={pump.key}
              className="bg-green-800 bg-opacity-80 rounded-xl p-6 flex flex-col justify-between shadow-lg"
            >
              <div className="flex items-center gap-4 mb-4">
                {pump.icon}
                <h3 className="text-lg font-bold text-white">{pump.label}</h3>
              </div>
              <ToggleSwitch ison={pumpStatus[pump.key]} label={pumpStatus[pump.key] ? 'ON' : 'OFF'} />
            </div>
          ))}
        </div>

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
