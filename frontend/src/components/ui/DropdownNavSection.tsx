import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  to: string;
  title: string;
  icon: string;
  label: string;
  exactMatch?: boolean;
  excludePaths?: string[]; // Paths to exclude when checking if this item is active
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

  // Check if any item in this section is active
  const hasActiveItem = items.some((item) =>
    isActiveLink(item.to, item.exactMatch, item.excludePaths)
  );

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
            </li>
          ))}
        </ul>
      )}

      {/* When sidebar is minimized, show items as separate buttons */}
      {sidebarMinimized &&
        items.map((item) => (
          <div key={item.to} className="mt-1">
            <Link
              to={item.to}
              className={`flex items-center justify-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 ${
                isActiveLink(item.to, item.exactMatch, item.excludePaths)
                  ? "bg-gray-700 border-l-4 border-blue-500"
                  : ""
              }`}
              title={item.title}
            >
              <span className="text-xl">{item.icon}</span>
            </Link>
          </div>
        ))}
    </li>
  );
};

export default DropdownNavSection;
