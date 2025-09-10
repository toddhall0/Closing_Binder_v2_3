// ===============================
// FILE: src/components/projects/PublishBinderButton.js
// FIXED VERSION - "Open New Window" button instead of "Copy URL"
// ===============================

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../common/ui/LoadingSpinner';
import { Button } from '../common/ui/Button';
import { Input } from '../common/ui/Input';
import { Modal } from '../common/ui/Modal';
import { ClientDashboardService } from '../../services/clientDashboardService';
import ClientsService from '../../services/clientsService';

const PublishBinderButton = ({ project, documents, sections, logos }) => {
  const [showModal, setShowModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    expiresAt: '',
    passwordProtected: false,
    accessPassword: '',
    includeAllDocuments: true,
    selectedDocuments: []
  });

  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const { data } = await ClientsService.getClients(clientSearch);
      if (active) setClientOptions(data);
    };
    run();
    return () => { active = false; };
  }, [clientSearch]);

  const generateCoverPageData = () => {
    return {
      title: project?.title || '',
      propertyAddress: project?.property_address || '',
      propertyDescription: project?.property_description || '',
      purchasePrice: project?.purchase_price || '',
      closingDate: project?.closing_date || '',
      buyer: project?.buyer || '',
      seller: project?.seller || '',
      attorney: project?.attorney || '',
      lender: project?.lender || '',
      titleCompany: project?.title_company || '',
      escrowAgent: project?.escrow_agent || '',
      propertyPhotoUrl: project?.property_photo_url || project?.cover_photo_url || '',
      contact_info: project?.contact_info || {}
    };
  };

  const generateTableOfContentsData = () => {
    return {
      sections: sections || [],
      totalDocuments: documents?.length || 0,
      generatedAt: new Date().toISOString()
    };
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    
    if (!(formData.clientId || (formData.clientName && formData.clientEmail))) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      const coverPageData = generateCoverPageData();
      const tableOfContentsData = generateTableOfContentsData();
      
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
        })),
        // Optional direct client_id (if selected from list)
        clientId: formData.clientId || null
      };

      const result = await ClientDashboardService.publishBinder(binderData);
      
      if (result.error) {
        throw result.error;
      }
      
      setSuccess({
        accessCode: result.data.access_code,
        sharingUrl: ClientDashboardService.generateSharingUrl(result.data.access_code),
        clientSlug: result.data.client_slug || null
      });
      
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

  const handleDocumentSelection = (documentId, selected) => {
    setFormData(prev => ({
      ...prev,
      selectedDocuments: selected 
        ? [...prev.selectedDocuments, documentId]
        : prev.selectedDocuments.filter(id => id !== documentId)
    }));
  };

  // FIXED: Replace copy URL with open new window
  const openClientBinder = (url) => {
    try {
      // Calculate window dimensions (75% of current window)
      const width = Math.floor(window.innerWidth * 0.75);
      const height = Math.floor(window.innerHeight * 0.75);
      
      // Center the window
      const left = Math.floor((window.innerWidth - width) / 2) + window.screenX;
      const top = Math.floor((window.innerHeight - height) / 2) + window.screenY;
      
      // Window features for the new popup
      const windowFeatures = `
        width=${width},
        height=${height},
        left=${left},
        top=${top},
        scrollbars=yes,
        resizable=yes,
        toolbar=no,
        menubar=no,
        location=no,
        status=no
      `.replace(/\s+/g, '');
      
      // Open the client binder in a new window
      const newWindow = window.open(url, `client_binder_${Date.now()}`, windowFeatures);
      
      if (newWindow) {
        newWindow.focus();
        console.log('Opened client binder in new window:', url);
      } else {
        // Fallback if popup is blocked
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening client binder:', error);
      // Final fallback
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Still keep copy functionality as a secondary option
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Copied to clipboard!');
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
            onOpenWindow={openClientBinder}
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

            <div className="grid grid-cols-2 gap-4">
              {/* Client picker */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Client</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search clients by name or email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  />
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const selected = clientOptions.find(c => c.id === id);
                      setFormData(prev => ({
                        ...prev,
                        clientId: id,
                        clientName: selected ? selected.name : prev.clientName,
                        clientEmail: selected ? selected.email : prev.clientEmail
                      }));
                    }}
                    className="px-3 py-2 border border-gray-300 rounded min-w-[220px]"
                  >
                    <option value="">Select client...</option>
                    {clientOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Or create a new client below.</p>
              </div>

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
                  <span className="text-sm">Include all documents ({documents?.length || 0})</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!formData.includeAllDocuments}
                    onChange={() => setFormData({ ...formData, includeAllDocuments: false })}
                    className="mr-2"
                  />
                  <span className="text-sm">Select specific documents</span>
                </label>
              </div>

              {!formData.includeAllDocuments && documents && documents.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                  {documents.map(doc => (
                    <label key={doc.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={formData.selectedDocuments.includes(doc.id)}
                        onChange={(e) => handleDocumentSelection(doc.id, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm truncate">{doc.name || doc.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <Button
                type="submit"
                disabled={publishing}
                className="bg-green-600 text-white hover:bg-green-700"
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

// FIXED: Success View Component with "Open New Window" button
const SuccessView = ({ success, onOpenWindow, onCopyUrl, onClose }) => {
  const clientDashboardUrl = success.clientSlug ? `${window.location.origin}/client/${success.clientSlug}` : null;
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
              className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded text-sm"
              title="Copy URL"
            >
              Copy
            </button>
          </div>
        </div>

        {clientDashboardUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Dashboard URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={clientDashboardUrl}
                readOnly
                className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => onCopyUrl(clientDashboardUrl)}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded text-sm"
                title="Copy URL"
              >
                Copy
              </button>
            </div>
            <div className="pt-3">
              <button
                onClick={() => onOpenWindow(clientDashboardUrl)}
                className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Open Client Dashboard
              </button>
            </div>
          </div>
        )}

        {/* FIXED: Primary "Open New Window" button */}
        <div className="pt-3">
          <button
            onClick={() => onOpenWindow(success.sharingUrl)}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Client Binder
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>Send the access code or sharing URL to your client.</p>
        <p>They can access the binder at any time using either method.</p>
        <p>Use the "Open Client Binder" button to preview how it will look to your client.</p>
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