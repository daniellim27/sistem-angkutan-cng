import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface SubNavItem {
  to: string;
  title: string;
  icon: string;
  label: string;
  exactMatch?: boolean;
  excludePaths?: string[];
}

interface NavItem {
  to: string;
  title: string;
  icon: string;
  label: string;
  exactMatch?: boolean;
  excludePaths?: string[]; // Paths to exclude when checking if this item is active
  hasSubItems?: boolean;
  subItems?: SubNavItem[];
}

interface DropdownNavSectionProps {
  title: string;
  icon: string;
  items: NavItem[];
  sidebarMinimized: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const DropdownNavSection: React.FC<DropdownNavSectionProps> = ({
  title,
  icon,
  items,
  sidebarMinimized,
  isOpen,
  onToggle,
}) => {
  const location = useLocation();
  const [subDropdownStates, setSubDropdownStates] = useState<{[key: string]: boolean}>({});

  const toggleSubDropdown = (itemKey: string) => {
    setSubDropdownStates(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const isActiveLink = (path: string, exactMatch = false, excludePaths: string[] = []) => {
    if (exactMatch) {
      return location.pathname === path;
    }
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) {
      // Check if current path should be excluded
      for (const excludePath of excludePaths) {
        if (location.pathname.startsWith(excludePath)) {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  // Check if any item in this section is active (including sub-items)
  const hasActiveItem = items.some((item) => {
    const isMainItemActive = isActiveLink(item.to, item.exactMatch, item.excludePaths);
    const isSubItemActive = item.subItems?.some(subItem => 
      isActiveLink(subItem.to, subItem.exactMatch, subItem.excludePaths)
    );
    return isMainItemActive || isSubItemActive;
  });

  return (
    <li className="mb-2">
      {/* Section Header - Clickable to toggle */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-2 rounded hover:bg-gray-700 transition-colors duration-200 ${
          hasActiveItem ? "bg-gray-700 border-l-4 border-blue-500" : ""
        }`}
        title={title}
      >
        <div className="flex items-center">
          <span className="text-xl mr-3">{icon}</span>
          <span className={`${sidebarMinimized ? "hidden" : "block"}`}>
            {title}
          </span>
        </div>
        {!sidebarMinimized && (
          <span
            className={`transform transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        )}
      </button>

      {/* Dropdown Items */}
      {isOpen && !sidebarMinimized && (
        <ul className="ml-6 mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              {item.hasSubItems ? (
                <>
                  {/* Item with sub-dropdown */}
                  <button
                    onClick={() => toggleSubDropdown(item.to)}
                    className={`w-full flex items-center justify-between p-2 rounded hover:bg-gray-600 transition-colors duration-200 ${
                      isActiveLink(item.to, item.exactMatch, item.excludePaths) ||
                      item.subItems?.some(subItem => isActiveLink(subItem.to, subItem.exactMatch, subItem.excludePaths))
                        ? "bg-gray-600 border-l-2 border-blue-400"
                        : ""
                    }`}
                    title={item.title}
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span
                      className={`transform transition-transform duration-200 text-xs ${
                        subDropdownStates[item.to] ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  
                  {/* Sub-dropdown items */}
                  {subDropdownStates[item.to] && (
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>
                        <Link
                          to={item.to}
                          className={`flex items-center p-2 rounded hover:bg-gray-500 transition-colors duration-200 ${
                            isActiveLink(item.to, item.exactMatch, item.excludePaths)
                              ? "bg-gray-500 border-l-2 border-blue-300"
                              : ""
                          }`}
                          title={item.title}
                        >
                          <span className="text-sm mr-3">{item.icon}</span>
                          <span className="text-xs">{item.label}</span>
                        </Link>
                      </li>
                      {item.subItems?.map((subItem) => (
                        <li key={subItem.to}>
                          <Link
                            to={subItem.to}
                            className={`flex items-center p-2 rounded hover:bg-gray-500 transition-colors duration-200 ${
                              isActiveLink(subItem.to, subItem.exactMatch, subItem.excludePaths)
                                ? "bg-gray-500 border-l-2 border-blue-300"
                                : ""
                            }`}
                            title={subItem.title}
                          >
                            <span className="text-sm mr-3">{subItem.icon}</span>
                            <span className="text-xs">{subItem.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                /* Regular item without sub-dropdown */
                <Link
                  to={item.to}
                  className={`flex items-center p-2 rounded hover:bg-gray-600 transition-colors duration-200 ${
                    isActiveLink(item.to, item.exactMatch, item.excludePaths)
                      ? "bg-gray-600 border-l-2 border-blue-400"
                      : ""
                  }`}
                  title={item.title}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* When sidebar is minimized, show items as separate buttons */}
      {sidebarMinimized &&
        items.map((item) => (
          <div key={item.to}>
            <div className="mt-1">
              <Link
                to={item.to}
                className={`flex items-center justify-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 ${
                  isActiveLink(item.to, item.exactMatch, item.excludePaths) ||
                  item.subItems?.some(subItem => isActiveLink(subItem.to, subItem.exactMatch, subItem.excludePaths))
                    ? "bg-gray-700 border-l-4 border-blue-500"
                    : ""
                }`}
                title={item.title}
              >
                <span className="text-xl">{item.icon}</span>
              </Link>
            </div>
            {/* Show sub-items as separate buttons when minimized */}
            {item.subItems?.map((subItem) => (
              <div key={subItem.to} className="mt-1">
                <Link
                  to={subItem.to}
                  className={`flex items-center justify-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 ${
                    isActiveLink(subItem.to, subItem.exactMatch, subItem.excludePaths)
                      ? "bg-gray-700 border-l-4 border-blue-500"
                      : ""
                  }`}
                  title={subItem.title}
                >
                  <span className="text-lg">{subItem.icon}</span>
                </Link>
              </div>
            ))}
          </div>
        ))}
    </li>
  );
};

export default DropdownNavSection;
