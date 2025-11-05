// src/pages/DriverCreate.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axiosConfig";
import DriverForm from "../components/DriverForm";

const DriverCreatePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (data: any) => {
    setIsLoading(true);
    try {
      await apiClient.post("/drivers", data);
      navigate("/drivers");
    } catch (err) {
      // Show detailed backend error if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosErr = err as any;
      const status = axiosErr?.response?.status;
      const data = axiosErr?.response?.data;
      const serverMessage = data?.message;
      const notice = data?.notice;
      const details = data?.details;
      const fieldErrors = Array.isArray(data?.errors)
        ? data.errors
            .map((e: { field?: string; message?: string }) =>
              [e.field, e.message].filter(Boolean).join(": ")
            )
            .join("\n")
        : undefined;

      const parts = [
        "Failed to create driver",
        status ? `(HTTP ${status})` : undefined,
        serverMessage,
        notice,
        details,
        fieldErrors,
      ].filter(Boolean);

      alert(parts.join("\n"));
      console.error("Error creating driver:", axiosErr);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Tambah Supir Baru</h1>
      <DriverForm onSubmit={handleCreate} isLoading={isLoading} />
    </div>
  );
};

export default DriverCreatePage;
