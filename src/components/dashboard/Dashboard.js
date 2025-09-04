// src/components/dashboard/Dashboard.js
import React, { useState } from 'react';
import { ProjectsDashboard } from '../projects/ProjectsDashboard';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState(null);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    console.log('Selected project:', project);
    // TODO: Navigate to project workspace when ready
  };

  return (
    <div>
      {/* Replace the welcome message with the full ProjectsDashboard */}
      <ProjectsDashboard onProjectSelect={handleProjectSelect} />
    </div>
  );
};

export default Dashboard;