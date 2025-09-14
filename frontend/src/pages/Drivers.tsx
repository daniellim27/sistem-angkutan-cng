// src/pages/Drivers.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

// Define the shape of the data from the backend
interface DriverProfile {
  full_name: string;
  phone: string;
  sim_expiry_date?: string;
  status: 'available' | 'busy' | 'on_leave';
}

interface Driver {
  id: number; // This is the user_id
  username: string;
  driverProfile: DriverProfile;
}

interface Vehicle {
  id: number;
  license_plate: string;
  driver_id: number | null;
  status: string;
}

const DriversPage = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleAssignments, setVehicleAssignments] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDrivers = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch drivers
      const driversResponse = await apiClient.get('/drivers');
      const driversData = Array.isArray(driversResponse.data) ? driversResponse.data : [];
      
      // Fetch vehicles to get assignment information
      const vehiclesResponse = await apiClient.get('/vehicles');
      const vehiclesData = Array.isArray(vehiclesResponse.data) ? vehiclesResponse.data : [];
      
      // Create assignment map (driver_id -> vehicle license_plate)
      const assignmentMap = new Map<number, string>();
      vehiclesData.forEach((vehicle: Vehicle) => {
        if (vehicle.driver_id) {
          assignmentMap.set(vehicle.driver_id, vehicle.license_plate);
        }
      });
      
      setDrivers(driversData);
      setVehicleAssignments(assignmentMap);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch drivers.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchDrivers(true);
  };

  useEffect(() => {
    fetchDrivers();
    
    // Set up periodic refresh every 30 seconds to sync with mobile app updates
    const interval = setInterval(() => {
      fetchDrivers();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      try {
        await apiClient.delete(`/drivers/${id}`);
        setDrivers(prevDrivers => prevDrivers.filter(driver => driver.id !== id));
        // Also remove from vehicle assignments if exists
        setVehicleAssignments(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      } catch (err) {
        alert('Failed to delete driver.');
      }
    }
  };

  const getStatusDisplay = (driver: Driver) => {
    const assignedVehicle = vehicleAssignments.get(driver.id);
    
    // If driver is assigned to a vehicle, show assignment status
    if (assignedVehicle) {
      return {
        text: `Assigned to ${assignedVehicle}`,
        className: 'bg-blue-100 text-blue-800'
      };
    }
    
    // Otherwise, show the driver's profile status
    switch (driver.driverProfile.status) {
      case 'available':
        return {
          text: 'Available',
          className: 'bg-green-100 text-green-800'
        };
      case 'busy':
        return {
          text: 'Busy',
          className: 'bg-yellow-100 text-yellow-800'
        };
      case 'on_leave':
        return {
          text: 'On Leave',
          className: 'bg-red-100 text-red-800'
        };
      default:
        return {
          text: driver.driverProfile.status,
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  if (loading) return <div>Loading drivers...</div>;
  if (error) return <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Driver Management</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-600 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()} 
              <span className="ml-2 text-xs text-gray-500">(Auto-refreshes every 30 seconds)</span>
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link to="/drivers/create">
            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              + Add Driver
            </button>
          </Link>
        </div>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Full Name</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Phone Number</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">SIM Expiry</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => {
              const statusDisplay = getStatusDisplay(driver);
              const simExpiryDate = driver.driverProfile.sim_expiry_date;
              const isSimExpired = simExpiryDate && new Date(simExpiryDate) < new Date();
              const isSimExpiringSoon = simExpiryDate && !isSimExpired && new Date(simExpiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
              
              return (
                <tr key={driver.id}>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900">{driver.driverProfile.full_name}</p>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900">{driver.driverProfile.phone}</p>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    {simExpiryDate ? (
                      <div className="flex flex-col">
                        <span className={`text-xs ${
                          isSimExpired ? 'text-red-600 font-semibold' : 
                          isSimExpiringSoon ? 'text-yellow-600 font-semibold' : 
                          'text-gray-900'
                        }`}>
                          {new Date(simExpiryDate).toLocaleDateString('id-ID')}
                        </span>
                        {isSimExpired && (
                          <span className="text-xs text-red-500">Expired</span>
                        )}
                        {isSimExpiringSoon && !isSimExpired && (
                          <span className="text-xs text-yellow-500">Expires Soon</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Not Set</span>
                    )}
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.className}`}>
                      {statusDisplay.text}
                    </span>
                  </td>
                  <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-right">
                    <Link to={`/drivers/edit/${driver.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</Link>
                    <button onClick={() => handleDelete(driver.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriversPage;
