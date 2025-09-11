import React from "react";
import { Navigate } from "react-router-dom";

const RitaseDashboard = () => {
  // Redirect to comprehensive ritase table since PO-based dashboard is deprecated
  // TODO: Create new DO-based dashboard
  return <Navigate to="/ritase/comprehensive" replace />;
};

export default RitaseDashboard;
