import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { CSVLink } from 'react-csv';
import Layout from './Layout';

const BACKEND_URL = 'https://automated-hydroponic-monitoring-o8eti.ondigitalocean.app/hydroponic-webapp-backend';


// RawDataView component to display raw sensor data
// This component fetches data from the sensor_data table, displays it in a paginated table
// and allows users to select rows for deletion or export to CSV.
// It also fetches the selected plant name from system_config and updates the data every 3
function RawDataView() {
  const [chartData, setChartData] = useState([]);
  const [plantName, setPlantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const itemsPerPage = 20;


  // Function to fetch selected plant data
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

      const selectedPlantId = configData.selected_plant_id;  //

      // 2. Get plant name using ID
      // First try plant_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('plant_profiles')
        .select('name')
        .eq('id', selectedPlantId)
        .single();

      if (profileError) {
        // If not found in plant_profiles, try multiplant_profile
        const { data: multiplantData, error: multiplantError } = await supabase
          .from('multiplant_profile')
          .select('name')
          .eq('id', selectedPlantId)
          .single();

        if (multiplantError) {
          console.error('Error fetching plant name:', multiplantError);
          return;
        }

        if (multiplantData) {
          setPlantName(multiplantData.name);
        }
      } else if (profileData) {
        setPlantName(profileData.name);
      }

      // 3. Get data from sensor_data table
      const { data: sensorData, error: dataError } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('plant_name', plantName)
        .order('created_at', { ascending: false });

      if (dataError) {
        console.error(`Error fetching data from sensor_data:`, dataError);
        return;
      }

      setChartData(sensorData);
      setLoading(false);
    } catch (error) {
      console.error('Error updating data:', error);
    }
  }, [plantName]);


  // Fetch selected plant data on component mount and set up interval for updates
  // This effect runs once when the component mounts and then every 3 seconds to refresh data
  useEffect(() => {
    getSelectedPlantData();

    const interval = setInterval(() => {
      getSelectedPlantData();
    }, 3000);

    return () => clearInterval(interval);   // Clear interval on component unmount
  }, [getSelectedPlantData]);



  // Calculate pagination
  // This calculates the total number of pages based on the length of chartData and itemsPerPage
  // It also determines the start and end indices for the current page's data
  // 20 items per page are displayed, and the current page is tracked with currentPage state
  const totalPages = Math.ceil(chartData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, chartData.length);
  const currentData = chartData.slice(startIndex, endIndex);

  // Handle page change 
  // This function updates the current page state when the user navigates through pages
  // It ensures the new page is within valid bounds (1 to totalPages)
  // It also updates the selected rows to ensure they are valid for the new page
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };


  // Handle row selection
  // This function toggles the selection state of a row based on its ID
  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {   // This function toggles selection for all rows on the current page
    const currentPageIds = currentData.map(d => d.id);
    const allOnPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.includes(id));

    if (allOnPageSelected) {
      // Deselect all on current page
      setSelectedRows(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedRows(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleDeleteSelected = async () => {  // This function handles the deletion of selected rows
    if (selectedRows.length === 0) {
      alert('No rows selected to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the ${selectedRows.length} selected items? This action is permanent.`)) {  // Confirm deletion with the user
      return;
    }
     
    try {  

      // Send a DELETE request to the backend to delete selected rows
      // The request body contains the IDs of the selected rows to be deleted
      const response = await fetch(`${BACKEND_URL}/api/sensor-data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedRows }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete data');
      }


      // If deletion is successful, update the state
      // This updates the chartData to remove the deleted rows and resets the selectedRows state
      setSelectedRows([]);
      await getSelectedPlantData();
      alert('Selected rows have been deleted successfully.');
    } catch (error) {
      console.error('Error deleting data:', error);
      alert(`Failed to delete data: ${error.message}`);
    }
  };

  return (
    
    // Render the layout with the fetched plant data
    // The layout contains a title, plant name, and a table displaying the raw data
    // The table includes checkboxes for selecting rows, a button to delete selected rows, and
    // a button to export the data to CSV
    // The table is paginated, allowing users to navigate through pages of data
    // The table rows are styled with alternating colors for better readability
    // The component uses Tailwind CSS for styling and ApexCharts for data visualization
    <Layout>
      <div className="p-8">
        <div className="mb-4 p-8 bg-green-800 rounded-xl shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-white">Raw Data View</h1>
          </div>
          <h2 className="text-2xl mb-4 text-green-100">
            {plantName ? `Plant: ${plantName}` : 'Loading...'}
          </h2>
          {loading ? (
            <p className="text-lg text-green-200">Loading data...</p>
          ) : (
            <>
              <div className="mb-4 flex justify-end gap-4 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-on-page"
                    onChange={handleSelectAllOnPage}   // This checkbox allows users to select or deselect all rows on the current page
                    checked={currentData.length > 0 && currentData.every(d => selectedRows.includes(d.id))}   // Check if all rows on the current page are selected
                    className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-400"
                  />
                  <label htmlFor="select-all-on-page" className="text-white font-medium">Select All</label>
                </div>
                <button
                  onClick={handleDeleteSelected}   // This button deletes the selected rows
                  disabled={selectedRows.length === 0}   // Disable the button if no rows are selected
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Selected ({selectedRows.length})    
                </button>
                <CSVLink     // This link allows users to export the current data to a CSV file
                  data={currentData}
                  filename={`${plantName}_raw_data.csv`}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Export CSV
                </CSVLink>  
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-green-900 text-white">
                  <thead>
                    <tr className="bg-green-700 text-white">
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">Temperature (°C)</th>
                      <th className="px-4 py-2 text-left">pH</th>
                      <th className="px-4 py-2 text-left">EC (mS/cm)</th>
                      <th className="px-4 py-2 text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((data) => (    // Map through the current data to display each row

                    // Each row displays the timestamp, temperature, pH, EC values, and a checkbox for selection
                    // The row is highlighted if it is selected, and has alternating background colors for readability

                      <tr key={data.id} className={selectedRows.includes(data.id) ? 'bg-green-600' : (chartData.indexOf(data) % 2 === 0 ? 'bg-green-800' : 'bg-green-900')}>  
                        <td className="px-4 py-2">{new Date(data.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2">{data.water_temperature.toFixed(2)}</td>
                        <td className="px-4 py-2">{data.ph.toFixed(2)}</td>
                        <td className="px-4 py-2">{data.ec.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(data.id)}   // Check if the row is selected
                            onChange={() => handleSelectRow(data.id)}  // Toggle selection state when checkbox is clicked
                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (   // This section displays pagination controls if there are multiple pages of data
                <div className="mt-4 flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}   // This button navigates to the previous page
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-green-700 text-white rounded disabled:opacity-50"
                  >
                    
                    Previous
                  </button>
                  <span className="px-4 py-2 text-white"> 
                    Page {currentPage} of {totalPages}       
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}   // This button navigates to the next page
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-green-700 text-white rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default RawDataView; 