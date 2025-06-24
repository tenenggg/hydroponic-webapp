import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import Select from 'react-select';

function MultiPlantSelector() {
  const [plants, setPlants] = useState([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  const [calculatedRange, setCalculatedRange] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPlants() {
      const { data, error } = await supabase
        .from('plant_profiles')
        .select('*')
        .neq('name', 'Multiplant');

      if (error) {
        console.error('Error fetching plant profiles:', error.message);
        return;
      }

      setPlants(data || []);
    }

    fetchPlants();
  }, []);

  const calculateOverlap = useCallback(() => {
    const selectedPlants = plants.filter(p => selectedPlantIds.includes(p.id));
    if (selectedPlants.length < 2) {
      setCalculatedRange(null);
      return;
    }

    // Find the most restrictive pH range that most plants can tolerate
    const phValues = selectedPlants.map(p => ({ min: p.ph_min, max: p.ph_max }));
    const phMin = Math.max(...phValues.map(p => p.min));
    const phMax = Math.min(...phValues.map(p => p.max));

    // Find a workable EC range
    const ecValues = selectedPlants.map(p => ({ min: p.ec_min, max: p.ec_max }));
    
    // Sort by min and max values to find the most common overlapping range
    const sortedByMin = [...ecValues].sort((a, b) => b.min - a.min); // Descending
    const sortedByMax = [...ecValues].sort((a, b) => a.max - b.max); // Ascending
    
    // Take the highest minimum and lowest maximum that covers most plants
    const ecMin = sortedByMin[0].min; // Highest minimum
    const ecMax = sortedByMax[0].max; // Lowest maximum

    // For pH, we want a strict overlap as pH is more critical
    const phRangeValid = phMax - phMin >= 0;
    
    if (phRangeValid) {
      // Find plants that fall outside the EC range
      const outliers = selectedPlants.filter(plant => 
        plant.ec_min > ecMax || plant.ec_max < ecMin
      );

      if (outliers.length > 0) {
        // If there are outliers, ranges are not compatible
        setCalculatedRange(null);
      } else {
        setCalculatedRange({ 
          phMin, 
          phMax, 
          ecMin, 
          ecMax
        });
      }
    } else {
      setCalculatedRange(null);
    }
  }, [selectedPlantIds, plants]);

  useEffect(() => {
    calculateOverlap();
  }, [calculateOverlap]);

  const saveToSupabase = async () => {
    if (!calculatedRange) return;
    setSaving(true);

    const { error } = await supabase
      .from('multiplant_profile')
      .upsert([
        {
          name: 'Multiplant',
          ph_min: calculatedRange.phMin,
          ph_max: calculatedRange.phMax,
          ec_min: calculatedRange.ecMin,
          ec_max: calculatedRange.ecMax,
          image_url: null // Making this optional
        }
      ], {
        onConflict: 'name'
      });

    if (error) {
      console.error('Error saving Multiplant range:', error.message);
    } else {
      alert('✅ Multiplant range saved!');
    }

    setSaving(false);
  };

  return (
    <Layout>
      <div className="p-12 max-w-2xl mx-auto">
        <h1 className="text-5xl text-white font-bold mb-8 text-center">Multiplant Range Calculator</h1>

        <div className="mb-8">
          <label className="text-white text-2xl block mb-4">Select Plants:</label>
          <Select
            isMulti
            options={plants.map(p => ({ value: p.id, label: p.name }))}
            value={plants.filter(p => selectedPlantIds.includes(p.id)).map(p => ({ value: p.id, label: p.name }))}
            onChange={opts => setSelectedPlantIds(opts.map(opt => opt.value))}
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({ ...base, backgroundColor: '#14532d', borderColor: '#22c55e', minHeight: 56 }),
              multiValue: (base) => ({ ...base, backgroundColor: '#22c55e', color: 'white' }),
              multiValueLabel: (base) => ({ ...base, color: 'white', fontWeight: 'bold' }),
              option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? '#22c55e' : state.isFocused ? '#166534' : '#14532d', color: 'white' }),
              menu: (base) => ({ ...base, backgroundColor: '#14532d', color: 'white' }),
              input: (base) => ({ ...base, color: 'white' }),
            }}
            placeholder="Choose one or more plants..."
            noOptionsMessage={() => 'No plants found'}
          />
        </div>

        {selectedPlantIds.length >= 2 && (
          <div className="bg-green-900 p-6 rounded-lg text-white mb-6">
            <h3 className="text-2xl font-semibold mb-4">Selected Plants Ranges:</h3>
            <div className="space-y-4">
              {plants.filter(p => selectedPlantIds.includes(p.id)).map(plant => (
                <div key={plant.id} className="p-3 bg-green-800 rounded">
                  <p className="font-bold">{plant.name}</p>
                  <p>pH: {plant.ph_min} - {plant.ph_max}</p>
                  <p>EC: {plant.ec_min} - {plant.ec_max} mS/cm</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {calculatedRange ? (
          <div className="bg-green-900 p-6 rounded-lg text-white mb-6">
            <h2 className="text-3xl font-semibold mb-4 text-center">Recommended Ranges:</h2>
            <div className="mb-4">
              <p className="text-2xl text-center">🌱 <span className="font-bold">pH Range:</span> {calculatedRange.phMin.toFixed(1)} - {calculatedRange.phMax.toFixed(1)}</p>
              <p className="text-2xl text-center">🌱 <span className="font-bold">EC Range:</span> {calculatedRange.ecMin.toFixed(1)} - {calculatedRange.ecMax.toFixed(1)} mS/cm</p>
            </div>
          </div>
        ) : (
          selectedPlantIds.length > 1 && (
            <p className="text-red-400 text-xl mb-4 text-center">⚠️ No overlapping value, these plants are not compatible.</p>
          )
        )}

        <div className="flex justify-center">
          <button
            disabled={!calculatedRange || saving}
            onClick={saveToSupabase}
            className={`bg-green-600 hover:bg-green-500 text-white py-3 px-8 rounded-lg text-2xl transition-all duration-200 ${(!calculatedRange || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Saving...' : 'Save as Multiplant'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default MultiPlantSelector;
