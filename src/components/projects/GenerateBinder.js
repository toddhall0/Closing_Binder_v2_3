// ===============================
// FILE: src/components/projects/GenerateBinder.js
// FIXED VERSION - Removed "Complete Binder" tab only
// ===============================

import React, { useState } from 'react';
import { FileText, Globe } from 'lucide-react';

// Import components
import CoverPageEditor from '../pdf/CoverPageEditor';
import HybridBinderGenerator from '../HybridBinderGenerator';

const GenerateBinder = ({ project, onProjectUpdate }) => {
  const [activeSection, setActiveSection] = useState('cover');

  // FIXED: Removed the "complete" section from the array
  const sections = [
    {
      id: 'cover',
      name: 'Property Information Input',
      icon: FileText,
      component: CoverPageEditor,
      description: 'Enter and manage property and transaction details'
    },
    {
      id: 'hybrid',
      name: 'Generate Binder',
      icon: Globe,
      component: HybridBinderGenerator,
      description: 'Generate the interactive web binder and PDF'
    }
  ];

// ADD THIS LINE TO TEST:
  console.log('GenerateBinder sections:', sections.map(s => s.name));

  
  const ActiveComponent = sections.find(s => s.id === activeSection)?.component;

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors min-w-0 ${
                  activeSection === section.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                title={section.description}
              >
                <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{section.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Section Description */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          {(() => {
            const currentSection = sections.find(s => s.id === activeSection);
            const Icon = currentSection?.icon;
            return (
              <>
                {Icon && <Icon className="h-5 w-5 text-gray-600" />}
                <div>
                  <h3 className="font-medium text-gray-900">{currentSection?.name}</h3>
                  <p className="text-sm text-gray-600">{currentSection?.description}</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {ActiveComponent && (
          <div className="p-6">
            <ActiveComponent 
              project={project} 
              onProjectUpdate={onProjectUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateBinder;