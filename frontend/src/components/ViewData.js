import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { FaThermometerHalf, FaTint } from 'react-icons/fa';
import ReactSpeedometer from 'react-d3-speedometer';
import Layout from './Layout';

function ViewData() {
  const [sensorData, setSensorData] = useState(null);  // State to hold the latest sensor data

  useEffect(() => {   // Effect to fetch the latest sensor data and set up real-time updates
    const getData = async () => {
      const { data } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

        
      if (data && data.length > 0) {
        setSensorData(data[0]);  
      }
    };

    getData(); 

    // Subscribe to real-time updates for the sensor_data table
    // This will update the sensorData state whenever a new row is inserted
    // The channel listens for INSERT events on the sensor_data table in the public schema
    // When a new row is inserted, the payload is received and the sensorData state is updated with the new data
    const channel = supabase
      .channel('public:sensor_data')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_data' }, payload => {
        setSensorData(payload.new);
      })
      .subscribe();

    return () => {  // Cleanup function to remove the channel subscription when the component unmounts
      supabase.removeChannel(channel);
    };
  }, []);

  return (  

    // Render the layout with the fetched sensor data
    // The layout contains a title and displays the water temperature and nutrient solution data
    // The water temperature is displayed using a speedometer gauge
    // The nutrient solution data is displayed with pH and EC levels, each using a speedometer gauge
    // The gauges are styled with colors and text to indicate the current values
    // The layout is responsive and adjusts to different screen sizes
    // The speedometer gauges are interactive and provide a visual representation of the sensor data
    // The component uses Tailwind CSS for styling and layout
    // The speedometer component is used to display the water temperature, pH level, and EC level
    // The component is wrapped in a Layout component for consistent styling and structure
    <Layout>
      <div className="p-8">
        <div className="mb-4 p-8 bg-green-800 rounded-xl shadow-xl text-center">
          <h1 className="text-6xl font-bold mb-8 text-white">View Data</h1>
          {sensorData && (
            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 bg-green-900 rounded shadow-xl border-4 border-green-800 flex items-center justify-between transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center">
                  <FaThermometerHalf className="text-2xl mr-1 text-green-300" />
                  <h2 className="text-4xl font-bold text-white">Water Temperature</h2>
                </div>
                <div className="w-24 mx-auto mt-6">
                  <ReactSpeedometer
                    maxValue={100}
                    value={sensorData.water_temperature}
                    needleColor="white"
                    startColor="green"
                    endColor="red"
                    textColor="white"
                    segments={10}
                    currentValueText={`${sensorData.water_temperature} °C`}
                    textStyle={{ fontSize: '12px', fill: 'white', color: 'white' }}
                  />
                </div>
              </div>
              <div className="p-6 bg-green-900 rounded shadow-xl border-4 border-green-800 flex items-center justify-between transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center">
                  <FaTint className="text-2xl mr-1 text-green-300" />
                  <h2 className="text-4xl font-bold text-white">Nutrient Solution</h2>
                </div>
                <div className="flex justify-around w-full mt-6">
                  <div className="flex flex-col items-center w-24 mx-auto">
                    <h3 className="text-lg font-bold text-white mb-1">pH Level</h3>
                    <ReactSpeedometer
                      maxValue={14}
                      value={sensorData.ph}
                      needleColor="white"
                      startColor="green"
                      endColor="red"
                      textColor="white"
                      segments={10}
                      currentValueText={`${sensorData.ph}`}
                      textStyle={{ fontSize: '12px', fill: 'white', color: 'white' }}
                    />
                  </div>
                  <div className="flex flex-col items-center w-24 mx-auto">
                    <h3 className="text-lg font-bold text-white mb-1">EC</h3>
                    <ReactSpeedometer
                      maxValue={10}
                      value={sensorData.ec}
                      needleColor="white"
                      startColor="green"
                      endColor="red"
                      textColor="white"
                      segments={10}
                      currentValueText={`${sensorData.ec} mS/cm`}
                      textStyle={{ fontSize: '12px', fill: 'white', color: 'white' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ViewData;
