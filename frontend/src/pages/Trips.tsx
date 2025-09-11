import React from "react";
import { Navigate } from "react-router-dom";

const TripsPage = () => {
  // Redirect to delivery orders page since POs are deprecated
  // and DOs are now standalone entities
  return <Navigate to="/delivery-orders" replace />;
};

export default TripsPage;