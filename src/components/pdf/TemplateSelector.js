import React from 'react';
import { Check } from 'lucide-react';

const TemplateSelector = ({ selectedTemplate, onTemplateChange }) => {
  const templates = [
    {
      id: 'standard',
      name: 'Standard',
      description: 'Professional layout with property details and imagery',
      preview: 'Standard business format with logos, property info, and main photo'
    },
    {
      id: 'corporate',
      name: 'Corporate',
      description: 'Bold, formal design with prominent branding',
      preview: 'High-contrast design with strong typography and borders'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean, understated layout focusing on essential information',
      preview: 'Simple, elegant design with generous white space'
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Cover Page Template</h3>
        <p className="text-xs text-gray-600 mt-1">
          Choose a professional template for your cover page
        </p>
      </div>

      <div className="p-4 space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
              selectedTemplate === template.id
                ? 'border-black bg-gray-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center">
                <h4 className="text-sm font-medium text-gray-900">
                  {template.name}
                </h4>
                {selectedTemplate === template.id && (
                  <Check className="h-4 w-4 text-black ml-2" />
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {template.description}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {template.preview}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;