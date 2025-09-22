// src/pages/NotaKecilManagement.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

interface Customer {
  id: number;
  customer_name: string;
  location: string;
  nota_besar: number;
  nota_kecil: number;
  created_at: string;
  updated_at: string;
}

const NotaKecilManagement: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch customer data
  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/customers/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customer");
      }

      const data = await response.json();
      
      if (data.success) {
        setCustomer(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch customer");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nota Kecil Management</h1>
          <p className="text-gray-600">
            Manage Nota Kecil for {customer.customer_name}
          </p>
        </div>
        <button
          onClick={() => navigate("/customers")}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Customers
        </button>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Customer Name</label>
            <p className="text-lg font-medium text-gray-900">{customer.customer_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Location</label>
            <p className="text-lg text-gray-900">{customer.location}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Nota Besar</label>
            <p className="text-lg text-green-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(customer.nota_besar)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Current Nota Kecil</label>
            <p className="text-lg font-bold text-blue-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(customer.nota_kecil)}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default NotaKecilManagement;
