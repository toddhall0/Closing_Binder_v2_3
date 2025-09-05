// src/components/projects/PublishBinderButton.js
import React, { useState } from 'react';
import { ClientDashboardService } from '../../services/clientDashboardService';
import { Button } from '../common/ui/Button';
import { Modal } from '../common/ui/Modal';
import { Input } from '../common/ui/Input';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';

const PublishBinderButton = ({ project, documents, sections, logos }) => {
  const [showModal, setShowModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    expiresAt: '',
    passwordProtected: false,
    accessPassword: '',
    includeAllDocuments: true,
    selectedDocuments: []
  });

  // Generate cover page data from current project
  const generateCoverPageData = () => {
    return {
      title: project.title,
      propertyAddress: project.property_address,
      propertyDescription: project.property_description,
      coverImage: project.cover_photo_url,
      logos: logos?.map(logo => ({
        url: logo.logo_url,
        position: logo.logo_position,
        name: logo.name || 'Company Logo'
      })) || [],
      generatedDate: new Date().toISOString()
    };
  };

  // Generate table of contents data from current project structure
  const generateTableOfContentsData = () => {
    // Create organized structure similar to your existing TOC logic
    const organizedStructure = {
      title: project.title,
      propertyAddress: project.property_address,
      sections: [],
      unorganized: []
    };

    // Group documents by sections
    const sectionMap = new Map();
    
    // Initialize sections
    (sections || []).forEach(section => {
      if (section.section_type === 'section') {
        sectionMap.set(section.id, {
          id: section.id,
          name: section.name,
          sort_order: section.sort_order,
          documents: [],
          subsections: []
        });
      }
    });

    // Add subsections
    (sections || []).forEach(section => {
      if (section.section_type === 'subsection' && section.parent_section_id) {
        const parentSection = sectionMap.get(section.parent_section_id);
        if (parentSection) {
          parentSection.subsections.push({
            id: section.id,
            name: section.name,
            sort_order: section.sort_order,
            documents: []
          });
        }
      }
    });

    // Organize documents
    (documents || []).forEach(doc => {
      if (doc.section_id) {
        // Find if document belongs to a main section
        const section = sectionMap.get(doc.section_id);
        if (section) {
          section.documents.push(doc);
          return;
        }

        // Check if it belongs to a subsection
        for (const [, sectionData] of sectionMap) {
          const subsection = sectionData.subsections.find(sub => sub.id === doc.section_id);
          if (subsection) {
            subsection.documents.push(doc);
            return;
          }
        }
      }
      
      // If no section found, add to unorganized
      organizedStructure.unorganized.push(doc);
    });

    // Convert map to array and sort
    organizedStructure.sections = Array.from(sectionMap.values())
      .sort((a, b) => a.sort_order - b.sort_order);

    // Sort documents within sections
    organizedStructure.sections.forEach(section => {
      section.documents.sort((a, b) => a.sort_order - b.sort_order);
      section.subsections.forEach(subsection => {
        subsection.documents.sort((a, b) => a.sort_order - b.sort_order);
      });
    });

    return organizedStructure;
  };

  // Handle form submission
  const handlePublish = async (e) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.clientEmail) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      // Generate binder data
      const coverPageData = generateCoverPageData();
      const tableOfContentsData = generateTableOfContentsData();
      
      // Determine which documents to include
      const documentsToInclude = formData.includeAllDocuments 
        ? documents 
        : documents.filter(doc => formData.selectedDocuments.includes(doc.id));

      const binderData = {
        projectId: project.id,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        title: project.title,
        propertyAddress: project.property_address,
        propertyDescription: project.property_description,
        expiresAt: formData.expiresAt || null,
        passwordProtected: formData.passwordProtected,
        accessPassword: formData.passwordProtected ? formData.accessPassword : null,
        coverPageData,
        tableOfContentsData,
        documents: documentsToInclude.map(doc => ({
          id: doc.id,
          isDownloadable: true,
          isViewable: true
        }))
      };

      const result = await ClientDashboardService.publishBinder(binderData);
      
      if (result.error) {
        throw result.error;
      }
      
      setSuccess({
        accessCode: result.data.access_code,
        sharingUrl: ClientDashboardService.generateSharingUrl(result.data.access_code)
      });
      
      // Reset form
      setFormData({
        clientName: '',
        clientEmail: '',
        expiresAt: '',
        passwordProtected: false,
        accessPassword: '',
        includeAllDocuments: true,
        selectedDocuments: []
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Handle document selection change
  const handleDocumentSelection = (documentId, selected) => {
    setFormData(prev => ({
      ...prev,
      selectedDocuments: selected 
        ? [...prev.selectedDocuments, documentId]
        : prev.selectedDocuments.filter(id => id !== documentId)
    }));
  };

  // Copy URL to clipboard
  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copied to clipboard!');
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white hover:bg-green-700"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
        Publish for Client
      </Button>

      <Modal 
        isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setError(null);
            setSuccess(null);
          }} 
          title="Publish Binder for Client Access"
          size="lg"
        >
          {success ? (
            <SuccessView 
              success={success} 
              onCopyUrl={copyToClipboard}
              onClose={() => setShowModal(false)}
            />
          ) : (
            <form onSubmit={handlePublish} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Client Name *"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
                <Input
                  label="Client Email *"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  required
                />
              </div>

              {/* Document Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Documents to Include
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.includeAllDocuments}
                      onChange={() => setFormData({ ...formData, includeAllDocuments: true })}
                      className="mr-2"
                    />
                    <span>Include all documents ({documents?.length || 0} documents)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.includeAllDocuments}
                      onChange={() => setFormData({ ...formData, includeAllDocuments: false })}
                      className="mr-2"
                    />
                    <span>Select specific documents</span>
                  </label>
                </div>

                {!formData.includeAllDocuments && (
                  <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {(documents || []).map(doc => (
                      <label key={doc.id} className="flex items-center p-3 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.selectedDocuments.includes(doc.id)}
                          onChange={(e) => handleDocumentSelection(doc.id, e.target.checked)}
                          className="mr-3"
                        />
                        <span className="text-sm">{doc.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Access Settings */}
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Expiration Date (Optional)"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.passwordProtected}
                      onChange={(e) => setFormData({ ...formData, passwordProtected: e.target.checked })}
                      className="rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span className="text-sm font-medium text-gray-700">Password protect this binder</span>
                  </label>
                </div>

                {formData.passwordProtected && (
                  <Input
                    label="Access Password"
                    type="password"
                    value={formData.accessPassword}
                    onChange={(e) => setFormData({ ...formData, accessPassword: e.target.value })}
                    placeholder="Enter a password for client access"
                  />
                )}
              </div>

              {/* Binder Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Binder Preview</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Title:</strong> {project.title}</p>
                  <p><strong>Property:</strong> {project.property_address}</p>
                  <p><strong>Documents:</strong> {
                    formData.includeAllDocuments 
                      ? documents?.length || 0
                      : formData.selectedDocuments.length
                  } files</p>
                  <p><strong>Sections:</strong> {sections?.filter(s => s.section_type === 'section').length || 0}</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={publishing}
                  className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                >
                  {publishing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Publishing...
                    </>
                  ) : (
                    'Publish Binder'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Modal>
    </>
  );
};

// Success View Component
const SuccessView = ({ success, onCopyUrl, onClose }) => {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900">Binder Published Successfully!</h3>
        <p className="text-gray-600 mt-2">
          Your closing binder is now available for client access.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Code
          </label>
          <div className="flex items-center space-x-2">
            <code className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded text-center font-mono text-lg">
              {success.accessCode}
            </code>
            <button
              onClick={() => onCopyUrl(success.accessCode)}
              className="px-3 py-2 text-gray-400 hover:text-gray-600"
              title="Copy access code"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sharing URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={success.sharingUrl}
              readOnly
              className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={() => onCopyUrl(success.sharingUrl)}
              className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm"
            >
              Copy URL
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>Send the access code or sharing URL to your client.</p>
        <p>They can access the binder at any time using either method.</p>
      </div>

      <Button
        onClick={onClose}
        className="bg-black text-white hover:bg-gray-800"
      >
        Done
      </Button>
    </div>
  );
};

export default PublishBinderButton;