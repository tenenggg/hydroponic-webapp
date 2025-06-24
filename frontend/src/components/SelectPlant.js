import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';

function SelectPlant() {
  const [plants, setPlants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch plant list and config on load
  // This effect runs once when the component mounts to fetch plant profiles and system configuration
  // It retrieves all plant profiles and the system configuration to determine the selected plant
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch all plant profiles
      const { data: plantList, error: plantError } = await supabase
        .from('plant_profiles')
        .select('*, image_url');

      if (plantError) {
        console.error('Error fetching plant profiles:', plantError.message);
        setLoading(false);
        return;
      }

      // Fetch the single Multiplant row
      const { data: multiplant, error: multiError } = await supabase
        .from('multiplant_profile')
        .select('id, name, ph_min, ph_max, ec_min, ec_max, image_url')
        .eq('name', 'Multiplant')
        .single();

      if (multiError) {
        console.error('Error fetching Multiplant profile:', multiError.message);
      } else if (multiplant) {
        // Ensure the multiplant profile has all necessary fields
        const multiplantProfile = {
          ...multiplant,
          id: multiplant.id // Ensure we're using the correct ID from multiplant_profile
        };
        plantList.unshift(multiplantProfile); // add to top
      }

      setPlants(plantList || []);

      // Get system_config (first one)
      // This query retrieves the system configuration to find out which plant is currently selected
      // It fetches the ID and the selected plant ID from the first row of the 'system_config' table
      const { data: config, error: configError } = await supabase
        .from('system_config')
        .select('id, selected_plant_id')
        .limit(1)
        .single();

      if (configError) {
        console.error('Error fetching config:', configError.message);
        setLoading(false);
        return;
      }

      setConfigId(config.id);  // Store the config ID for later use


      // Find the selected plant based on the config
      // This finds the plant profile that matches the selected plant ID in the system configuration
      const selectedPlant = plantList.find(p => p.id === config.selected_plant_id);  
      setSelected(selectedPlant || null);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Handle dropdown change
  // This function is called when the user selects a different plant from the dropdown
  // It updates the selected plant in the state and also updates the system configuration in the database
  const handleChange = async (e) => {
    const selectedId = e.target.value;
    const chosenPlant = plants.find(p => p.id === selectedId);

    if (!chosenPlant || !configId) return;  // Ensure a plant is selected and config ID is available

    setSelected(chosenPlant);    // Update the selected plant in the state



    // Update the selected plant in the system configuration
    // This updates the 'selected_plant_id' in the 'system_config' table with
    const { error } = await supabase    //
      .from('system_config')
      .update({ selected_plant_id: selectedId })
      .eq('id', configId);

    if (error) {
      console.error('Error updating selected plant:', error.message);
    } else {
      console.log('Updated selected plant:', selectedId);
    }
  };

  return (

    // Render the component
    // This component displays a dropdown to select a plant profile and shows the details of the selected plant
    // It uses Tailwind CSS for styling and provides a responsive layout  

    <Layout>
      <div className="p-12 flex flex-col items-center justify-start">
        <div className="w-full max-w-3xl bg-green-800 p-12 rounded-3xl shadow-xl flex flex-col justify-between" style={{ minHeight: '600px' }}>
          <div>
            <h1 className="text-6xl font-bold mb-8 text-white">Select Plant Profile</h1>

            {loading ? (
              <p className="text-3xl text-green-100">Loading...</p>
            ) : (
              <>
                <div className="bg-green-900 p-6 rounded-2xl mb-10">
                  <select
                    className="w-full p-6 border rounded-2xl text-3xl bg-green-900 text-white border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={selected?.id || ''}   // Set the value to the selected plant's ID or an empty string if none is selected
                    onChange={handleChange}    // Call handleChange when the dropdown value changes
                  >
                    <option value="">Choose a plant...</option>
                    {plants.map(plant => (  

                      // This maps through the list of plants and creates an option for each one
                      // Each option has a value set to the plant's ID and displays the plant's name
                      <option key={plant.id} value={plant.id}>   
                        {plant.name === 'Multiplant' ? ' Multiplant (suit for multiple plants)' : plant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selected && (

                  // This section displays the details of the currently selected plant
                  // It shows the plant's image, name, pH range, and EC range
                  <div className="bg-green-900 border border-green-700 p-8 rounded-2xl text-3xl flex flex-col items-center text-white transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                    <h2 className="text-4xl font-semibold mb-6">Current Selection</h2>  
                    {selected.image_url && (   // Check if the selected plant has an image URL
                      <img
                        src={selected.image_url}    // Display the plant's image
                        alt={selected.name}        // Use the plant's name as the alt text
                        className="mb-6 rounded-xl shadow-lg"
                        style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'contain' }}
                      />
                    )}
                    <p><span className="font-medium">Name:</span> {selected.name}</p>
                    <p><span className="font-medium">pH Range:</span> {selected.ph_min} - {selected.ph_max}</p>
                    <p><span className="font-medium">EC Range:</span> {selected.ec_min} - {selected.ec_max}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default SelectPlant;
