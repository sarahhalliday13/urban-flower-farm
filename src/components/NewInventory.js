import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPlants, updatePlant } from '../services/firebase';

function NewInventory() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPlants = async () => {
      try {
        setLoading(true);
        const plantsData = await fetchPlants();
        setPlants(plantsData);
      } catch (err) {
        console.error('Error loading plants:', err);
        setError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };

    loadPlants();
  }, []);

  const updateStatus = async (plantId, newStatus) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const updatedPlant = {
        ...plant,
        inventory: {
          ...plant.inventory,
          status: newStatus
        }
      };

      await updatePlant(plantId, updatedPlant);
      setPlants(plants.map(p => p.id === plantId ? updatedPlant : p));
    } catch (err) {
      console.error('Error updating plant status:', err);
    }
  };

  const handleEdit = (plantId) => {
    navigate(`/admin/edit-flower/${plantId}`);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading inventory...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  return (
    <div className="new-inventory" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Inventory</h1>
        <Link 
          to="/admin/add-flower"
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Add New Flower
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={tableHeaderStyle}>Name</th>
            <th style={tableHeaderStyle}>Status</th>
            <th style={tableHeaderStyle}>Price</th>
            <th style={tableHeaderStyle}>Current Stock</th>
            <th style={tableHeaderStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {plants.map(plant => (
            <tr key={plant.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={tableCellStyle}>{plant.name}</td>
              <td style={tableCellStyle}>
                <select
                  value={plant.inventory?.status || 'Unknown'}
                  onChange={(e) => updateStatus(plant.id, e.target.value)}
                  style={{
                    padding: '5px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Coming Soon">Coming Soon</option>
                </select>
              </td>
              <td style={tableCellStyle}>${plant.price || '0.00'}</td>
              <td style={tableCellStyle}>{plant.inventory?.currentStock || 0}</td>
              <td style={tableCellStyle}>
                <button 
                  style={{
                    padding: '5px 10px',
                    marginRight: '5px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleEdit(plant.id)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableHeaderStyle = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd'
};

const tableCellStyle = {
  padding: '12px',
  textAlign: 'left'
};

export default NewInventory; 