import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectView = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="professional-heading">Project Details</h1>
          <p className="text-text-muted">Project ID: {id}</p>
        </div>
        <div className="flex space-x-4">
          <button className="btn-secondary">Upload Documents</button>
          <button className="btn-primary">Generate Binder</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="professional-subheading">Project Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Project Title
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter project title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Property Address
                </label>
                <textarea 
                  className="input-field" 
                  rows="3" 
                  placeholder="Enter property address"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="professional-subheading">Document Organization</h2>
            <div className="text-center py-12 text-text-muted">
              <p>Document organization interface will be implemented here.</p>
              <p className="text-sm mt-2">
                Drag-and-drop functionality, sections, and document management.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;