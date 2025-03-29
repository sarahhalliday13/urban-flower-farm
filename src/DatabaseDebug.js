import React, { useEffect, useState } from 'react';
import { fetchPlants } from './services/firebase';

const DatabaseDebug = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Directly fetch from Firebase
        const plantsData = await fetchPlants();
        
        // Process the data
        const statusCounts = {};
        plantsData.forEach(plant => {
          const status = plant.inventory?.status || 'Unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Group plants by status
        const plantsByStatus = {};
        for (const plant of plantsData) {
          const status = plant.inventory?.status || 'Unknown';
          if (!plantsByStatus[status]) {
            plantsByStatus[status] = [];
          }
          plantsByStatus[status].push(plant);
        }

        setData({ 
          totalPlants: plantsData.length,
          statusCounts,
          plantsByStatus
        });
        
        // Log it to console as well
        console.log('Firebase plants data:', {
          totalPlants: plantsData.length,
          statusCounts,
          plantsByStatus
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading direct database data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="database-debug">
      <h1>Database Debug</h1>
      
      <div className="data-summary">
        <h2>Data Summary</h2>
        <p>Total Plants: {data.totalPlants}</p>
        
        <h3>Status Counts</h3>
        <ul>
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <li key={status}>
              <strong>{status}:</strong> {count} plants
            </li>
          ))}
        </ul>
      </div>

      <div className="plants-by-status">
        <h2>Plants By Status</h2>
        {Object.entries(data.plantsByStatus).map(([status, plants]) => (
          <div key={status} className="status-group">
            <h3>{status} ({plants.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {plants.map(plant => (
                  <tr key={plant.id}>
                    <td>{plant.id}</td>
                    <td>{plant.name}</td>
                    <td>{plant.inventory?.currentStock || 0}</td>
                    <td>{plant.inventory?.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatabaseDebug; 