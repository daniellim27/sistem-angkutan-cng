// src/components/MainLayout.tsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import DropdownNavSection from "./ui/DropdownNavSection";
import { Bell, X, Check } from "lucide-react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, Notification } from "../api/notificationApi";

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await getUnreadCount();
        setUnreadCount(response.unreadCount);
        setHasNotifications(response.unreadCount > 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown is opened
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await getNotifications(1, 20);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      setHasNotifications(response.unreadCount > 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setHasNotifications(unreadCount - 1 > 0);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setHasNotifications(false);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const deleted = notifications.find(n => n.id === id);
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        setHasNotifications(unreadCount - 1 > 0);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);
  
  // State for dropdown sections
  const [dropdownStates, setDropdownStates] = useState({
    operations: true,
    fleetManagement: false,
    inventory: false,
    finance: false,
    others: true,
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

    // Ape-friendly main modules
    if (path.startsWith("/pembelian") || path.startsWith("/deposit-groups")) {
      return "Pembelian - SPBG & Deposit";
    }

    if (
      path.startsWith("/penjualan") ||
      path.startsWith("/operations/nota-management") ||
      path.startsWith("/operations/cctv-monitoring")
    ) {
      return "Penjualan - Nota & CCTV";
    }

    if (path.startsWith("/ritase")) return "Ritase & Laporan";

    if (
      path.startsWith("/fleet") ||
      path.startsWith("/live-tracking") ||
      path.startsWith("/vehicles")
    ) {
      return "Fleet - Peta Armada & Perjalanan";
    }

    if (
      path.startsWith("/inventaris") ||
      path.startsWith("/stock") ||
      path.startsWith("/infrastructure")
    ) {
      return "Inventaris - Stok & Infrastruktur";
    }

    // Legacy / detailed pages
    if (path.startsWith("/delivery-orders")) return "Delivery Orders";
    if (path.startsWith("/vehicles/tires")) return "Tire Management";
    if (path.startsWith("/drivers")) return "Driver Management";
    if (path.startsWith("/cash")) return "Cash Book";
    if (path.startsWith("/cash-coordinator")) return "Cash Coordinator";
    if (path.startsWith("/buku-kas")) return "Cash Book";
    if (path.startsWith("/tempo")) return "Credit Book";
    if (path.startsWith("/vehicle-expense-cash")) return "Kas Pengeluaran Mobil";
    if (path.startsWith("/driver-expenses")) return "Driver Expense Management";
    if (path.startsWith("/customers") && path.includes("/nota-besar"))
      return "Nota Besar Management";
    if (path.startsWith("/customers") && path.includes("/nota-kecil"))
      return "Nota Kecil Management";
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
                  Dashboard
                </span>
              </Link>
            </li>

            {/* Ape-friendly main modules */}
            <li className="mb-3">
              <Link
                to="/pembelian"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/pembelian") ||
                  location.pathname.startsWith("/deposit-groups")
                    ? "bg-gray-700 border-l-4 border-green-500"
                    : ""
                }`}
              >
                <span className="text-xl mr-3">🧾</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  Pembelian
                </span>
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/penjualan"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/penjualan") ||
                  location.pathname.startsWith("/operations/nota-management") ||
                  location.pathname.startsWith("/operations/cctv-monitoring")
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                <span className="text-xl mr-3">📹</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  Penjualan
                </span>
              </Link>
            </li>

            {/* Fleet Management Section */}
            <DropdownNavSection
              title="Fleet Management"
              icon="🚛"
              items={[
                {
                  to: "/fleet",
                  title: "Live GPS Tracking",
                  icon: "🗺️",
                  label: "Live GPS",
                },
                {
                  to: "/vehicles",
                  title: "Fleet Management",
                  icon: "🚛",
                  label: "Fleet Management",
                  excludePaths: ["/vehicles/tires"]
                },
                {
                  to: "/drivers",
                  title: "Driver Management",
                  icon: "👨‍💼",
                  label: "Driver Management"
                },
                {
                  to: "/vehicles/tires",
                  title: "Tire Management",
                  icon: "🛞",
                  label: "Tire Management"
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

            <li className="mb-3">
              <Link
                to="/inventaris"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/inventaris") ||
                  location.pathname.startsWith("/stock") ||
                  location.pathname.startsWith("/infrastructure")
                    ? "bg-gray-700 border-l-4 border-purple-500"
                    : ""
                }`}
              >
                <span className="text-xl mr-3">📦</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  Inventaris
                </span>
              </Link>
            </li>

            {/* Direct Customer Management section (separate from Lain-lain) */}
            <li className="mb-3">
              <Link
                to="/customers"
                className={`flex items-center p-2 rounded hover:bg-gray-700 ${
                  isActiveLink("/customers")
                    ? "bg-gray-700 border-l-4 border-teal-500"
                    : ""
                }`}
                title="Customer Management"
              >
                <span className="text-xl mr-3">👥</span>
                <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
                  Customers
                </span>
              </Link>
            </li>

            {/* Lain-lain section with all extra modules */}
            <DropdownNavSection
              title="Lain-lain"
              icon="🧰"
              items={[
                // {
                //   to: "/ritase/comprehensive",
                //   title: "Ritase & Laporan",
                //   icon: "📊",
                //   label: "Ritase & Laporan",
                // },
                {
                  to: "/operations/cctv-monitoring",
                  title: "CCTV Monitoring",
                  icon: "📹",
                  label: "CCTV Monitoring",
                },
                {
                  to: "/payments",
                  title: "Payments",
                  icon: "💳",
                  label: "Payments",
                },
                {
                  to: "/deposit-groups",
                  title: "SPBG Management",
                  icon: "🏪",
                  label: "SPBG Management",
                },
                {
                  to: "/customers",
                  title: "Customer Management",
                  icon: "👥",
                  label: "Customers",
                },
                {
                  to: "/cash",
                  title: "Cash Book",
                  icon: "📒",
                  label: "Cash Book",
                },
                {
                  to: "/cash-coordinator",
                  title: "Cash Coordinator",
                  icon: "🧑‍💼",
                  label: "Cash Coordinator",
                },
                {
                  to: "/tempo",
                  title: "Credit Book",
                  icon: "⏱️",
                  label: "Tempo / Kredit",
                },
                {
                  to: "/vehicle-expense-cash",
                  title: "Kas Pengeluaran Mobil",
                  icon: "🚗",
                  label: "Kas Pengeluaran Mobil",
                },
                {
                  to: "/driver-expenses",
                  title: "Pengeluaran Driver",
                  icon: "🧾",
                  label: "Pengeluaran Driver",
                },
              ]}
              sidebarMinimized={sidebarMinimized}
              isOpen={dropdownStates.others}
              onToggle={() => toggleDropdown("others")}
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
          <div className="flex items-center gap-4">
            {/* Notification Icon */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[32rem] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          title="Mark all as read"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close notifications"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {loadingNotifications ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-gray-500">No notifications at this time</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              !notification.is_read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  {!notification.is_read && (
                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                                      {notification.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    {notification.vehicle && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Vehicle: {notification.vehicle.license_plate || notification.vehicle.device_id}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!notification.is_read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(notification.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
