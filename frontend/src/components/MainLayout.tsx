// src/components/MainLayout.tsx
import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import DropdownNavSection from "./ui/DropdownNavSection";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  
  // State for dropdown sections
  const [dropdownStates, setDropdownStates] = useState({
    operations: true,
    fleetManagement: false,
    inventory: false,
    finance: false,
  });
  
  const toggleDropdown = (section: keyof typeof dropdownStates) => {
    setDropdownStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "CNG Dashboard";
    if (path.startsWith("/delivery-orders")) return "Delivery Orders";
    if (path.startsWith("/ocr-processing")) return "OCR Processing";
    if (path.startsWith("/big-dos")) return "Big Delivery Orders";
    if (path.startsWith("/live-tracking")) return "Live GPS Tracking";
    if (path.startsWith("/vehicles/tires")) return "Tire Management";
    if (path.startsWith("/vehicles")) return "Fleet Management";
    if (path.startsWith("/drivers")) return "Driver Management";
    if (path.startsWith("/stock")) return "Inventory Management";
    if (path.startsWith("/infrastructure")) return "Infrastructure Inventory";
    if (path.startsWith("/cash")) return "Cash Book";
    if (path.startsWith("/cash-coordinator")) return "Cash Coordinator";
    if (path.startsWith("/ritase")) return "Ritase Dashboard";
    if (path.startsWith("/buku-kas")) return "Cash Book";
    if (path.startsWith("/tempo")) return "Credit Book";
    if (path.startsWith("/vehicle-expense-cash")) return "Kas Pengeluaran Mobil";
    if (path.startsWith("/deposit-groups")) return "SPBG Management";
    if (path.startsWith("/driver-expenses")) return "Driver Expense Management";
    if (path.startsWith("/customers") && path.includes("/nota-besar")) return "Nota Besar Management";
    if (path.startsWith("/customers") && path.includes("/nota-kecil")) return "Nota Kecil Management";
    if (path.startsWith("/customers")) return "Customer Management";
    return "CNG Dashboard";
  };

  const isActiveLink = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const toggleSidebar = () => {
    setSidebarMinimized(!sidebarMinimized);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarMinimized ? "w-16" : "w-64"
        } flex-shrink-0 bg-gray-800 text-white p-4 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Header with toggle button */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className={`text-2xl font-bold ${
              sidebarMinimized ? "hidden" : "block"
            }`}
          >
            CNG Angkutan Sys
          </h1>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-gray-700 focus:outline-none"
            title={sidebarMinimized ? "Expand sidebar" : "Minimize sidebar"}
          >
            {sidebarMinimized ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            )}
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto">
          <ul>
            {/* Dashboard */}
            <li className="mb-4">
              <Link
                to="/"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
                title="CNG Dashboard"
              >
                <span className="text-xl mr-3">📊</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  CNG Dashboard
                </span>
              </Link>
            </li>

            {/* Reports & Analytics Section */}
            <li className="mb-2 mt-6">
              <div className="text-xs uppercase text-gray-400 font-semibold mb-2 px-2">
                Reports & Analytics
              </div>
            </li>
            <li className="mb-4">
              <Link
                to="/ritase/comprehensive"
                className={`block p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/ritase/comprehensive")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                📊 Ritase Dashboard
              </Link>
            </li>

            <li className="mb-4">
              <Link
                to="/payments"
                className={`block p-2 rounded hover:bg-gray-700 ${
                  location.pathname.startsWith("/payments")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                💰 Payments
              </Link>
            </li>

            <li className="mb-4">
              <Link
                to="/deposit-groups"
                className={`block p-2 rounded hover:bg-gray-700 ${
                  location.pathname.startsWith("/deposit-groups")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                🏪 SPBG Management
              </Link>
            </li>

            <li className="mb-4">
              <Link
                to="/live-tracking"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/live-tracking")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
                title="Live GPS Tracking"
              >
                <span className="text-xl mr-3">🗺️</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  Live GPS
                </span>
              </Link>
            </li>

            {/* Customer Management */}
            <li className="mb-4">
              <Link
                to="/customers"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/customers")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
                title="Customer Management"
              >
                <span className="text-xl mr-3">👥</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  Customer Management
                </span>
              </Link>
            </li>

            {/* Operations Section */}
            <DropdownNavSection
              title="Operations"
              icon="⚡"
              items={[
                {
                  to: "/delivery-orders",
                  title: "Delivery Orders",
                  icon: "🚚",
                  label: "Delivery Orders"
                },
                {
                  to: "/ocr-processing",
                  title: "OCR Processing",
                  icon: "🔍",
                  label: "OCR Processing"
                },
                {
                  to: "/big-dos",
                  title: "Big Delivery Orders",
                  icon: "🚛",
                  label: "Big DOs"
                }
              ]}
              sidebarMinimized={sidebarMinimized}
              isOpen={dropdownStates.operations}
              onToggle={() => toggleDropdown('operations')}
            />

            {/* Fleet Management Section */}
            <DropdownNavSection
              title="Fleet Management"
              icon="🚛"
              items={[
                {
                  to: "/vehicles",
                  title: "Fleet Management",
                  icon: "🚛",
                  label: "Fleet Management",
                  excludePaths: ["/vehicles/tires"]
                },
                {
                  to: "/vehicles/tires",
                  title: "Tire Management",
                  icon: "🛞",
                  label: "Tire Management"
                },
                {
                  to: "/drivers",
                  title: "Driver Management",
                  icon: "👨‍💼",
                  label: "Driver Management"
                },
                {
                  to: "/driver-expenses",
                  title: "Driver Expense Management",
                  icon: "💰",
                  label: "Pengeluaran Driver"
                }
              ]}
              sidebarMinimized={sidebarMinimized}
              isOpen={dropdownStates.fleetManagement}
              onToggle={() => toggleDropdown('fleetManagement')}
            />

            {/* Inventory Management Section */}
            <DropdownNavSection
              title="Inventory"
              icon="📦"
              items={[
                {
                  to: "/stock",
                  title: "Inventory Management",
                  icon: "📦",
                  label: "Inventory Management"
                },
                {
                  to: "/infrastructure",
                  title: "Infrastructure Inventory",
                  icon: "🏗️",
                  label: "Infrastructure Inventory",
                  hasSubItems: true,
                  subItems: [
                    {
                      to: "/vehicles/tires/removed",
                      title: "Used Tires",
                      icon: "🔄",
                      label: "Used Tires"
                    }
                  ]
                }
              ]}
              sidebarMinimized={sidebarMinimized}
              isOpen={dropdownStates.inventory}
              onToggle={() => toggleDropdown('inventory')}
            />

            {/* Finance Section */}
            <DropdownNavSection
              title="Finance"
              icon="💰"
              items={[
                {
                  to: "/cash",
                  title: "Cash Book",
                  icon: "💰",
                  label: "Cash Book"
                },
                {
                  to: "/cash-coordinator",
                  title: "Cash Coordinator",
                  icon: "👥",
                  label: "Cash Coordinator"
                },
                {
                  to: "/tempo",
                  title: "Credit Book",
                  icon: "🤬",
                  label: "Credit Book"
                },
                {
                  to: "/vehicle-expense-cash",
                  title: "Vehicle Expense Cash",
                  icon: "🚗",
                  label: "Kas Pengeluaran Mobil"
                }
              ]}
              sidebarMinimized={sidebarMinimized}
              isOpen={dropdownStates.finance}
              onToggle={() => toggleDropdown('finance')}
            />
          </ul>
        </nav>

        {/* Footer */}
        <div
          className={`text-sm text-gray-400 mt-4 ${
            sidebarMinimized ? "text-center" : ""
          }`}
        >
          <p className={`${sidebarMinimized ? "hidden" : "block"}`}>v1.0.0</p>
          {sidebarMinimized && <p className="text-xs">v1.0</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{getPageTitle()}</h2>
          <div className="flex items-center">
            <span className="mr-4 hidden sm:inline">
              Welcome,{" "}
              <strong className="font-semibold">
                {user?.username || "User"}
              </strong>
            </span>
            <span className="mr-4 sm:hidden">
              <strong className="font-semibold">
                {user?.username || "User"}
              </strong>
            </span>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="p-8 overflow-y-auto bg-gray-50 flex-grow">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
