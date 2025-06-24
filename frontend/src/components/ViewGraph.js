import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Chart from 'react-apexcharts';
import Layout from './Layout';

function ViewGraph() {

  // State to hold chart data, plant name, loading state, time range, and statistics
  // The chart data is fetched from the sensor_data table in Supabase
  const [chartData, setChartData] = useState([]);
  const [plantName, setPlantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('15'); // Default to last 15 entries
  const [statistics, setStatistics] = useState({

    // Initialize statistics for temperature, pH, and EC
    // Each statistic has min, max, avg, and latest values initialized to 0
    temperature: { min: 0, max: 0, avg: 0, latest: 0 },
    ph: { min: 0, max: 0, avg: 0, latest: 0 },
    ec: { min: 0, max: 0, avg: 0, latest: 0 }
  });
  const [plantRanges, setPlantRanges] = useState({ ph_min: 5.5, ph_max: 7.0, ec_min: 1.0, ec_max: 3.0 });

  // Calculate statistics for a given data array and key
  // This function computes min, max, average, and latest values for the specified key in the data
  // If the data array is empty, it returns default values of 0 for all statistics
  const calculateStats = (data, key) => {
    if (!data.length) return { min: 0, max: 0, avg: 0, latest: 0 };
    const values = data.map(d => d[key]);
    return { 
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      latest: values[values.length - 1]
    };
  };

  // Check if value is out of range
  // This function checks if a given value is outside the selected plant's range for pH or EC
  const isOutOfRange = (value, type) => {
    if (type === 'ph') {
      return value < plantRanges.ph_min || value > plantRanges.ph_max;
    } else if (type === 'ec') {
      return value < plantRanges.ec_min || value > plantRanges.ec_max;
    } else if (type === 'temperature') {
      return value < 20 || value > 40;
    }
    return false;
  };

  // Helper to get a conclusion for a stat
  const getConclusion = (stats, type) => {
    let min, max;
    if (type === 'ph') {
      min = plantRanges.ph_min;
      max = plantRanges.ph_max;
    } else if (type === 'ec') {
      min = plantRanges.ec_min;
      max = plantRanges.ec_max;
    } else if (type === 'temperature') {
      min = 20;
      max = 40;
    }
    const avg = stats.avg;
    const latest = stats.latest;
    let status = 'good';
    let message = '';
    if (avg < min || avg > max) {
      status = 'warning';
      message = `Average ${type.toUpperCase()} is out of the ideal range (${min} - ${max}).`;
    } else if (latest < min || latest > max) {
      status = 'warning';
      message = `Latest ${type.toUpperCase()} reading is out of the ideal range (${min} - ${max}).`;
    } else {
      status = 'ok';
      message = `All ${type.toUpperCase()} readings are within the ideal range (${min} - ${max}).`;
    }
    return { status, message, avg, latest, min, max };
  };

  const ConclusionBox = ({ conclusion, type }) => {
    const color = 'green-600';
    return (
      <div className={`rounded-lg p-4 mt-2 mb-6 bg-${color} text-white shadow-md text-lg`}>
        <span className="font-bold capitalize">{type} Conclusion: </span>
        {conclusion.message} <br/>
        <span className="text-sm">Avg: {conclusion.avg.toFixed(2)}, Latest: {conclusion.latest.toFixed(2)}</span>
      </div>
    );
  };

  // Function to fetch selected plant data
  // This function retrieves the selected plant's data from the Supabase database
  const getSelectedPlantData = useCallback(async () => {
    try {
      // 1. Get selected plant ID from system_config
      const { data: configData, error: configError } = await supabase
        .from('system_config')
        .select('selected_plant_id')
        .limit(1)
        .single();

      if (configError || !configData) {
        console.error('Error fetching selected plant ID:', configError);
        return;
      }

      const selectedPlantId = configData.selected_plant_id;

      // 2. Get plant name and ranges using ID
      let fetchedPlantName = plantName;
      let fetchedRanges = null;
      if (!plantName) {
        // First try plant_profiles
        const { data: profileData, error: profileError } = await supabase
          .from('plant_profiles')
          .select('name, ph_min, ph_max, ec_min, ec_max')
          .eq('id', selectedPlantId)
          .single();

        if (profileError || !profileData) {
          // If not found in plant_profiles, try multiplant_profile
          const { data: multiplantData, error: multiplantError } = await supabase
            .from('multiplant_profile')
            .select('name, ph_min, ph_max, ec_min, ec_max')
            .eq('id', selectedPlantId)
            .single();

          if (multiplantError || !multiplantData) {
            console.error('Error fetching plant name or range:', multiplantError);
            return;
          }

          fetchedPlantName = multiplantData.name;
          fetchedRanges = multiplantData;
          setPlantName(fetchedPlantName);
        } else {
          fetchedPlantName = profileData.name;
          fetchedRanges = profileData;
          setPlantName(fetchedPlantName);
        }
      }

      // Set plant ranges
      if (fetchedRanges) {
        setPlantRanges({
          ph_min: fetchedRanges.ph_min,
          ph_max: fetchedRanges.ph_max,
          ec_min: fetchedRanges.ec_min,
          ec_max: fetchedRanges.ec_max
        });
      }

      // 3. Get data from sensor_data table for the selected plant
      // This fetches the sensor data for the plant name retrieved above
      // The data is ordered by created_at in ascending order
      const { data: sensorData, error: dataError } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('plant_name', fetchedPlantName)
        .order('created_at', { ascending: true });

      if (dataError) {
        console.error(`Error fetching data from sensor_data:`, dataError);
        return;
      }

      setChartData(sensorData);
      
      // Calculate statistics
      // This calculates the statistics for temperature, pH, and EC using the fetched sensor data
      // It uses the calculateStats function defined earlier to compute min, max, avg, and
      setStatistics({
        temperature: calculateStats(sensorData, 'water_temperature'),
        ph: calculateStats(sensorData, 'ph'),
        ec: calculateStats(sensorData, 'ec')
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error updating graph data:', error);
    }
  }, [plantName]);


  // useEffect to fetch data on mount and set up interval for periodic updates
  // This effect runs once when the component mounts and sets up an interval to fetch data every 3 seconds
  // It also cleans up the interval on component unmount to prevent memory leaks
  useEffect(() => {
    getSelectedPlantData(); // fetch on mount

    const interval = setInterval(() => {
      getSelectedPlantData(); // fetch every 3 seconds
    }, 3000);

    return () => clearInterval(interval); // cleanup
  }, [getSelectedPlantData]); // Added getSelectedPlantData as a dependency

  const limitedChartData = chartData.slice(-parseInt(timeRange)); // Limit chart data based on selected time range


  // Common chart options used for all charts
  // These options include chart ID, toolbar settings, zoom functionality, x-axis categories, and tooltip settings
  // The x-axis categories are set to display time in HH:mm:ss format based on the created_at field of the data
  // The tooltip is configured to show shared data for multiple series and format the x-axis labels
  const commonOptions = {
    chart: { 
      id: 'sensor-data', 
      toolbar: { 
        show: true,
        tools: { 
          download: true,    // <-- This enables downloading of the chart
          selection: true,   // <-- This enables selection of data points
          zoom: true,     // <-- This enables zooming
          zoomin: true,   // <-- This enables zooming in
          zoomout: true,  // <-- This enables zooming out
          pan: true,    // <-- This enables panning
          reset: false // <-- This removes the home (reset zoom) icon
        }
      },
      zoom: { enabled: true }   // <-- This enables zooming functionality
    },
    xaxis: {
      categories: limitedChartData.map(d => new Date(d.created_at).toLocaleTimeString()),  // Format x-axis labels to show time
    },
    tooltip: {
      enabled: true,   // <-- This enables tooltips on hover
      shared: true,     // <-- This allows tooltips to show data for multiple series
      intersect: false,   // <-- This allows tooltips to show data even when not directly over a point
      x: {
        format: 'HH:mm:ss'     // Format x-axis labels in tooltips to show time
      },
      y: {
        formatter: (value) => value.toFixed(2)   // Format y-axis values to two decimal places
      }
    },
    markers: {
      size: 4,    
      hover: { 
        size: 6    // Increase marker size on hover for better visibility
      }
    }
  };

  const StatCard = ({ title, stats, type }) => (

    // This component renders a card displaying statistics for temperature, pH, or EC
    // It includes min, max, avg, and latest values with appropriate styling

    <div className="bg-green-900 p-4 rounded shadow mb-4 text-white transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm">Min: <span className={isOutOfRange(stats.min, type) ? 'text-red-400' : 'text-white'}>{stats.min.toFixed(2)}</span></p>  
          <p className="text-sm">Max: <span className={isOutOfRange(stats.max, type) ? 'text-red-400' : 'text-white'}>{stats.max.toFixed(2)}</span></p>
        </div>
        <div>
          <p className="text-sm">Avg: <span className="text-white">{stats.avg.toFixed(2)}</span></p>
          <p className="text-sm">Latest: <span className={isOutOfRange(stats.latest, type) ? 'text-red-400' : 'text-white'}>{stats.latest.toFixed(2)}</span></p>
        </div>
      </div>
    </div>
  );

  return (

    // This is the main component that renders the graph view
    // It includes a title, plant name, loading state, time range selector, statistics cards
    // and line charts for temperature, pH, and EC
  
    <Layout>
      <div className="p-8">
        <div className="mb-4 p-8 bg-green-800 rounded-xl shadow-xl text-center">
          <h1 className="text-6xl font-bold mb-4 text-white">View Graph</h1>
          <h2 className="text-2xl mb-4 text-green-100">{plantName ? `Plant: ${plantName}` : 'Loading...'}</h2>

          {loading ? (
            <p className="text-lg text-green-200">Fetching data...</p>
          ) : (

            // If data is loaded, display the graph and statistics
            // The statistics are displayed in cards and the graphs are rendered using ApexCharts 
            // The graphs show the last 15, 30, 60 entries or all data based on the selected time range
            // The charts are styled with a dark theme and have tooltips enabled for better user experience
            <>
              <div className="mb-4 flex justify-between items-center">
                <select 
                  className="p-2 border rounded bg-green-900 text-white border-green-700"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="15">Last 15 entries</option>
                  <option value="30">Last 30 entries</option>
                  <option value="60">Last 60 entries</option>
                  <option value="all">All data</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatCard title={<span className='text-white'>Temperature Statistics</span>} stats={statistics.temperature} type="temperature" />
                <StatCard title={<span className='text-white'>pH Statistics</span>} stats={statistics.ph} type="ph" />
                <StatCard title={<span className='text-white'>EC Statistics</span>} stats={statistics.ec} type="ec" />
              </div>

              <div className="mb-4">   
                <h2 className="text-2xl font-bold mb-2 text-green-100">Temperature (°C)</h2> 

                <Chart   

                // Render the temperature chart using ApexCharts
                // The chart displays water temperature data over time with a line graph
                // The x-axis shows time and the y-axis shows temperature values
                // The chart is styled with a dark theme and tooltips for better user experience

                  options={{  
                    ...commonOptions,
                    xaxis: {
                      ...commonOptions.xaxis,
                      labels: { style: { colors: '#fff' } },
                    },
                    yaxis: {
                      labels: { style: { colors: '#fff' } },
                    },
                    tooltip: {
                      ...commonOptions.tooltip,
                      style: { fontSize: '14px', color: '#fff', background: '#222' },
                    },
                    legend: {
                      labels: { colors: '#fff' },
                    },
                  }}
                  series={[{ name: 'Temperature (°C)', data: limitedChartData.map(d => d.water_temperature) }]}
                  type="line"
                  width="100%"
                  height="400"
                />
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2 text-green-100">pH</h2>

                <Chart   

                // Render the pH chart using ApexCharts
                // The chart displays pH data over time with a line graph 
                // The x-axis shows time and the y-axis shows pH values
                // The chart is styled with a dark theme and tooltips for better user experience
                  options={{
                    ...commonOptions,
                    xaxis: {
                      ...commonOptions.xaxis,
                      labels: { style: { colors: '#fff' } },
                    },
                    yaxis: {
                      labels: { style: { colors: '#fff' } },
                    },
                    tooltip: {
                      ...commonOptions.tooltip,
                      style: { fontSize: '14px', color: '#fff', background: '#222' },
                    },
                    legend: {
                      labels: { colors: '#fff' },
                    },
                  }}
                  series={[{ name: 'pH', data: limitedChartData.map(d => d.ph) }]}
                  type="line"
                  width="100%"
                  height="400"
                />
                <ConclusionBox conclusion={getConclusion(statistics.ph, 'ph')} type="pH" />
              </div>

              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2 text-green-100">EC (mS/cm)</h2>
                
                <Chart

                // Render the EC chart using ApexCharts
                // The chart displays EC data over time with a line graph
                // The x-axis shows time and the y-axis shows EC values
                // The chart is styled with a dark theme and tooltips for better user experience
                  options={{
                    ...commonOptions,
                    xaxis: {
                      ...commonOptions.xaxis,
                      labels: { style: { colors: '#fff' } },
                    },
                    yaxis: {
                      labels: { style: { colors: '#fff' } },
                    },
                    tooltip: {
                      ...commonOptions.tooltip,
                      style: { fontSize: '14px', color: '#fff', background: '#222' },
                    },
                    legend: {
                      labels: { colors: '#fff' },
                    },
                  }}
                  series={[{ name: 'EC (mS/cm)', data: limitedChartData.map(d => d.ec) }]}
                  type="line"
                  width="100%"
                  height="400"
                />
                <ConclusionBox conclusion={getConclusion(statistics.ec, 'ec')} type="EC" />
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ViewGraph;
