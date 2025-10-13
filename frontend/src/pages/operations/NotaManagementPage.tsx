// src/pages/operations/NotaManagementPage.tsx
import React, { useState } from 'react';
import NotaKecilTab from './components/NotaKecilTab';
import NotaBesarTab from './components/NotaBesarTab';

const NotaManagementPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'nota-kecil' | 'nota-besar'>('nota-kecil');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nota Management</h1>
          <p className="text-gray-600">Manage all nota kecils and nota besars in one place</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setSelectedTab('nota-kecil')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  selectedTab === 'nota-kecil'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Nota Kecil
              </button>
              <button
                onClick={() => setSelectedTab('nota-besar')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  selectedTab === 'nota-besar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Nota Besar
              </button>
            </nav>
          </div>

          {/* Tab Content Description */}
          <div className="p-4">
            {selectedTab === 'nota-kecil' && (
              <div className="text-sm text-gray-600">
                Manage individual nota kecils from drivers. Select multiple nota kecils to create a nota besar.
              </div>
            )}
            {selectedTab === 'nota-besar' && (
              <div className="text-sm text-gray-600">
                View and manage consolidated nota besars created from selected nota kecils.
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'nota-kecil' && <NotaKecilTab />}
        {selectedTab === 'nota-besar' && <NotaBesarTab />}
      </div>
    </div>
  );
};

export default NotaManagementPage;
