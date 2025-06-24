import React, { useEffect, useState } from 'react';
import { FaTint } from 'react-icons/fa';
import ReactSpeedometer from 'react-d3-speedometer';
import { supabase } from '../supabaseClient';
import Layout from './Layout';

function ViewOptimisedLevel() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Fetch plant profiles from Supabase on component mount
  // This effect runs once when the component mounts
  useEffect(() => {
    const fetchPlants = async () => { 
      // Fetch regular plants
      const { data: regularPlants, error: plantError } = await supabase
        .from('plant_profiles')
        .select('*');

      if (plantError) {
        setError(plantError.message);
        setLoading(false);
        return;
      }

      // Fetch multiplant profile
      const { data: multiplantData, error: multiplantError } = await supabase
        .from('multiplant_profile')
        .select('*');

      if (multiplantError) {
        console.error('Error fetching multiplant:', multiplantError);
        setPlants(regularPlants || []);
      } else {
        // Combine both sets of plants
        setPlants([...(regularPlants || []), ...(multiplantData || [])]);
      }
      
      setLoading(false);
    };
    fetchPlants();
  }, []);

  return (

    // Render the layout with the fetched plant profiles
    // The layout contains a title and displays the optimised levels for each plant 
    // The optimised levels are displayed with pH and EC levels, each using a speedometer gauge
    // The gauges are styled with colors and text to indicate the current values
    
    <Layout>
      <div className="p-8">
        <div className="mb-4 p-4 bg-green-800 rounded-xl shadow-xl text-center">
          <h1 className="text-6xl font-bold mb-4 text-white">View Optimised Level</h1>
          {loading ? (
            <div className="text-green-200 text-xl">Loading...</div>
          ) : error ? (
            <div className="text-red-200 text-xl">{error}</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {plants.map((item, index) => {

                // Calculate average pH and EC values
                // The average is calculated by taking the sum of min and max values and dividing by 2
                // The values are then formatted to two decimal places for display
                const avgPh = ((item.ph_min + item.ph_max) / 2).toFixed(2);
                const avgEc = ((item.ec_min + item.ec_max) / 2).toFixed(2);
                return (
                  
                  <div key={index} className="p-6 bg-green-900 rounded shadow-xl border-4 border-green-800 flex items-center justify-between transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                    <div className="flex items-center">
                      <FaTint className="text-2xl mr-1 text-green-300" />
                      <h2 className="text-4xl font-bold text-white">{item.name}</h2>
                    </div>
                    <div className="flex justify-around w-full mt-6">
                      <div className="flex flex-col items-center w-24 mx-auto">
                        <h3 className="text-lg font-bold text-white mb-1">pH Level</h3>
                        <ReactSpeedometer
                          maxValue={14}
                          value={parseFloat(avgPh)}
                          needleColor="white"
                          startColor="green"
                          endColor="red"
                          textColor="white"
                          segments={10}
                          currentValueText={`${avgPh}`}
                          textStyle={{ fontSize: '12px', fill: 'white', color: 'white' }}
                        />
                      </div>
                      <div className="flex flex-col items-center w-24 mx-auto">
                        <h3 className="text-lg font-bold text-white mb-1">EC</h3>
                        <ReactSpeedometer
                          maxValue={10}
                          value={parseFloat(avgEc)}
                          needleColor="white"
                          startColor="green"
                          endColor="red"
                          textColor="white"
                          segments={10}
                          currentValueText={`${avgEc} mS/cm`}
                          textStyle={{ fontSize: '12px', fill: 'white', color: 'white' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ViewOptimisedLevel;
