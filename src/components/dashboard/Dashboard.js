// src/components/dashboard/Dashboard.js
import React, { useState } from 'react';
import { ProjectsDashboard } from '../projects/ProjectsDashboard';
import ClientsDashboard from '../projects/ClientsDashboard';
import Settings from './Settings';

const Dashboard = () => {
  const [, setSelectedProject] = useState(null);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    console.log('Selected project:', project);
    // TODO: Navigate to project workspace when ready
  };

  const [tab, setTab] = useState('projects');

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setTab('projects')}
                className={`text-sm font-medium py-2 border-b-2 ${tab==='projects' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-black'}`}
              >
                Projects
              </button>
              <button
                onClick={() => setTab('clients')}
                className={`text-sm font-medium py-2 border-b-2 ${tab==='clients' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-black'}`}
              >
                Clients
              </button>
              <button
                onClick={() => setTab('settings')}
                className={`text-sm font-medium py-2 border-b-2 ${tab==='settings' ? 'border-black text-black' : 'border-transparent text-gray-600 hover:text-black'}`}
              >
                Settings
              </button>
            </div>
            <div className="hidden sm:block"></div>
          </div>
        </div>
      </div>

      {tab === 'projects' && (
        <ProjectsDashboard onProjectSelect={handleProjectSelect} />
      )}
      {tab === 'clients' && (
        <ClientsDashboard />
      )}
      {tab === 'settings' && (
        <Settings />
      )}
    </div>
  );
};

export default Dashboard;