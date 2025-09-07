// src/pages/InfrastructureCreate.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/axiosConfig";

interface InfrastructureCategory {
  id: number;
  category_name: string;
}

interface InfrastructureLocation {
  id: number;
  location_name: string;
}

interface FormItem {
  id: number | null;
  category_id: string;
  location_id: string;
  item_code: string;
  item_name: string;
  supplier: string;
  unit: string;
  min_quantity: string;
  unit_price: string;
  initial_quantity: string;
  expired_date: string;
  notes: string;
  isNew: boolean;
  adjustmentType: string;
  adjustmentAmount: string;
  originalQuantity: number;
  createNewBatch: boolean;
}

const InfrastructureCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<InfrastructureCategory[]>([]);
  const [locations, setLocations] = useState<InfrastructureLocation[]>([]);
  const [infrastructureItems, setInfrastructureItems] = useState<any[]>([]);
  const [formItems, setFormItems] = useState<FormItem[]>([
    {
      id: null,
      category_id: "",
      location_id: "",
      item_code: "",
      item_name: "",
      supplier: "",
      unit: "Pcs",
      min_quantity: "",
      unit_price: "",
      initial_quantity: "",
      expired_date: "",
      notes: "",
      isNew: true,
      adjustmentType: "add",
      adjustmentAmount: "0",
      originalQuantity: 0,
      createNewBatch: false,
    },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveToCash, setSaveToCash] = useState(true);
  const [isTempo, setIsTempo] = useState(false);
  const [notaFile, setNotaFile] = useState<File | null>(null);

  // State declarations
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("General");

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiClient.get("/cash/accounts");
        setAccounts(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchLocations();
    fetchInfrastructureItems();
    if (isEdit && id) {
      fetchInfrastructureItem();
    }
  }, [isEdit, id]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get("/infrastructure/categories");
      setCategories(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get("/infrastructure/locations");
      setLocations(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const fetchInfrastructureItems = async () => {
    try {
      const response = await apiClient.get("/infrastructure");
      setInfrastructureItems(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch infrastructure items:", err);
    }
  };

  const fetchInfrastructureItem = async () => {
    try {
      const response = await apiClient.get(`/infrastructure/${id}`);
      const itemData = response.data.data;
      setFormItems([
        {
          id: itemData.id,
          category_id: itemData.category_id?.toString() || "",
          location_id: itemData.location_id?.toString() || "",
          item_code: itemData.item_code || "",
          item_name: itemData.item_name || "",
          supplier: itemData.supplier || "",
          unit: itemData.unit || "Pcs",
          min_quantity: itemData.min_quantity?.toString() || "",
          unit_price: itemData.average_unit_price?.toString() || "",
          initial_quantity: itemData.current_quantity?.toString() || "",
          expired_date: itemData.expired_date || "",
          notes: itemData.notes || "",
          isNew: false,
          adjustmentType: "add",
          adjustmentAmount: "0",
          originalQuantity: itemData.current_quantity || 0,
          createNewBatch: false,
        },
      ]);
    } catch (err) {
      console.error("Failed to fetch infrastructure item:", err);
    }
  };

  const addFormItem = () => {
    setFormItems([
      ...formItems,
      {
        id: null,
        category_id: "",
        location_id: "",
        item_code: "",
        item_name: "",
        supplier: "",
        unit: "Pcs",
        min_quantity: "",
        unit_price: "",
        initial_quantity: "",
        expired_date: "",
        notes: "",
        isNew: true,
        adjustmentType: "add",
        adjustmentAmount: "0",
        originalQuantity: 0,
        createNewBatch: false,
      },
    ]);
  };

  const removeFormItem = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index));
    }
  };

  const updateFormItem = (index: number, field: keyof FormItem, value: string | boolean) => {
    const updatedItems = [...formItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormItems(updatedItems);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    formItems.forEach((item, index) => {
      if (!item.item_name.trim()) {
        newErrors[`item_name_${index}`] = "Item name is required";
      }
      if (!item.unit.trim()) {
        newErrors[`unit_${index}`] = "Unit is required";
      }
      if (item.min_quantity && parseFloat(item.min_quantity) < 0) {
        newErrors[`min_quantity_${index}`] = "Minimum quantity must be non-negative";
      }
      if (item.unit_price && parseFloat(item.unit_price) < 0) {
        newErrors[`unit_price_${index}`] = "Unit price must be non-negative";
      }
      if (item.initial_quantity && parseFloat(item.initial_quantity) < 0) {
        newErrors[`initial_quantity_${index}`] = "Initial quantity must be non-negative";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      for (const item of formItems) {
        if (isEdit && item.id) {
          // Update existing item
          await apiClient.put(`/infrastructure/${item.id}`, {
            category_id: item.category_id || null,
            location_id: item.location_id || null,
            item_code: item.item_code || null,
            item_name: item.item_name,
            supplier: item.supplier || null,
            unit: item.unit,
            min_quantity: parseFloat(item.min_quantity) || 0,
            expired_date: item.expired_date || null,
            notes: item.notes || null,
          });

          // If there's an adjustment, apply it
          if (item.adjustmentAmount && parseFloat(item.adjustmentAmount) !== 0) {
            await apiClient.post("/infrastructure/adjust", {
              itemId: item.id,
              adjustmentType: item.adjustmentType,
              quantity: item.adjustmentAmount,
              unit_price: parseFloat(item.unit_price) || 0,
              supplier: item.supplier || null,
              notes: item.notes || null,
              create_new_batch: item.createNewBatch,
              expired_date: item.expired_date || null,
            });
          }
        } else {
          // Create new item
          await apiClient.post("/infrastructure", {
            category_id: item.category_id || null,
            location_id: item.location_id || null,
            item_code: item.item_code || null,
            item_name: item.item_name,
            supplier: item.supplier || null,
            unit: item.unit,
            min_quantity: parseFloat(item.min_quantity) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            initial_quantity: parseFloat(item.initial_quantity) || 0,
            expired_date: item.expired_date || null,
            notes: item.notes || null,
          });
        }
      }

      navigate("/infrastructure");
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to save infrastructure item(s)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? "Edit Infrastructure Item" : "Add Infrastructure Item"}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEdit
            ? "Update infrastructure item details and adjust quantities"
            : "Add new infrastructure items to your inventory"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formItems.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Item {index + 1}
              </h3>
              {formItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFormItem(index)}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={item.category_id}
                  onChange={(e) =>
                    updateFormItem(index, "category_id", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <select
                  value={item.location_id}
                  onChange={(e) =>
                    updateFormItem(index, "location_id", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.location_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  value={item.item_code}
                  onChange={(e) =>
                    updateFormItem(index, "item_code", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="INF-001"
                />
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={item.item_name}
                  onChange={(e) =>
                    updateFormItem(index, "item_name", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[`item_name_${index}`] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter item name"
                />
                {errors[`item_name_${index}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`item_name_${index}`]}
                  </p>
                )}
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={item.supplier}
                  onChange={(e) =>
                    updateFormItem(index, "supplier", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier name"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  value={item.unit}
                  onChange={(e) => updateFormItem(index, "unit", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[`unit_${index}`] ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Unit">Unit</option>
                  <option value="Set">Set</option>
                  <option value="Box">Box</option>
                  <option value="Kg">Kg</option>
                  <option value="Liter">Liter</option>
                  <option value="Meter">Meter</option>
                  <option value="Roll">Roll</option>
                </select>
                {errors[`unit_${index}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`unit_${index}`]}
                  </p>
                )}
              </div>

              {/* Minimum Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.min_quantity}
                  onChange={(e) =>
                    updateFormItem(index, "min_quantity", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[`min_quantity_${index}`] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="0"
                />
                {errors[`min_quantity_${index}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`min_quantity_${index}`]}
                  </p>
                )}
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) =>
                    updateFormItem(index, "unit_price", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[`unit_price_${index}`] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="0"
                />
                {errors[`unit_price_${index}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`unit_price_${index}`]}
                  </p>
                )}
              </div>

              {/* Initial Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.initial_quantity}
                  onChange={(e) =>
                    updateFormItem(index, "initial_quantity", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[`initial_quantity_${index}`] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="0"
                />
                {errors[`initial_quantity_${index}`] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[`initial_quantity_${index}`]}
                  </p>
                )}
              </div>

              {/* Expired Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expired Date
                </label>
                <input
                  type="date"
                  value={item.expired_date}
                  onChange={(e) =>
                    updateFormItem(index, "expired_date", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={item.notes}
                  onChange={(e) =>
                    updateFormItem(index, "notes", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about this item"
                />
              </div>
            </div>

            {/* Adjustment Section for Edit Mode */}
            {isEdit && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Quantity Adjustment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjustment Type
                    </label>
                    <select
                      value={item.adjustmentType}
                      onChange={(e) =>
                        updateFormItem(index, "adjustmentType", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="add">Add</option>
                      <option value="deduct">Deduct</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjustment Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.adjustmentAmount}
                      onChange={(e) =>
                        updateFormItem(index, "adjustmentAmount", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={item.createNewBatch}
                        onChange={(e) =>
                          updateFormItem(index, "createNewBatch", e.target.checked)
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Create New Batch
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Item Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={addFormItem}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            + Add Another Item
          </button>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/infrastructure")}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            {loading ? "Saving..." : isEdit ? "Update Item" : "Create Item(s)"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InfrastructureCreatePage;
