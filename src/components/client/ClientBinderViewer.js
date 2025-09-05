// src/components/client/ClientBinderViewer.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientDashboardService from '../../services/clientDashboardService';
import { Eye, Download as DownloadIcon, FileText } from 'lucide-react';

const ClientBinderViewer = () => {
  const { accessCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [binder, setBinder] = useState(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  const loadBinder = useCallback(async (pwd = null) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await ClientDashboardService.getBinderByAccessCode(accessCode, pwd);
      if (error) {
        if (error.message && error.message.toLowerCase().includes('password')) {
          setNeedsPassword(true);
          return;
        }
        throw error;
      }
      setBinder(data);
      setNeedsPassword(false);
    } catch (err) {
      setError(err.message || 'Unable to load binder');
    } finally {
      setLoading(false);
    }
  }, [accessCode]);

  useEffect(() => {
    if (accessCode) {
      loadBinder();
    }
  }, [accessCode, loadBinder]);

  const openDocument = async (item) => {
    try {
      if (binder?.id && item?.document_id) {
        // Track view
        await ClientDashboardService.trackDocumentAccess(binder.id, item.document_id, 'view');
      }
    } catch (e) {
      // Non-blocking
      console.warn('Failed to track view:', e);
    }

    const doc = item.documents || {};
    // Prefer file_url if present; otherwise construct from file_path
    if (doc.file_url) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (doc.file_path) {
      const baseUrl = process.env.REACT_APP_SUPABASE_URL;
      const url = `${baseUrl}/storage/v1/object/public/documents/${doc.file_path}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadDocument = async (item) => {
    try {
      if (binder?.id && item?.document_id) {
        // Track download
        await ClientDashboardService.trackDocumentAccess(binder.id, item.document_id, 'download');
      }
    } catch (e) {
      console.warn('Failed to track download:', e);
    }

    const doc = item.documents || {};
    if (doc.file_url) {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (doc.file_path) {
      const baseUrl = process.env.REACT_APP_SUPABASE_URL;
      const url = `${baseUrl}/storage/v1/object/public/documents/${doc.file_path}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
        <p className="text-gray-600">Loading binder...</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Password Required</h2>
          <p className="text-sm text-gray-600 mb-4">Enter the password to view this binder.</p>
          <input
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadBinder(password)}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
              Unlock
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load binder</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (!binder) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Binder header card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{binder.title || 'Client Binder'}</h1>
            {binder.property_address && (
              <p className="text-gray-600 mt-1">{binder.property_address}</p>
            )}
            {binder.property_description && (
              <p className="text-sm text-gray-600 mt-2">{binder.property_description}</p>
            )}
          </div>
          {binder.access_code && (
            <div className="text-right">
              <div className="text-xs uppercase text-gray-500">Access Code</div>
              <div className="font-mono text-lg text-gray-900">{binder.access_code}</div>
            </div>
          )}
        </div>
      </div>

      {/* Documents list */}
      <div className="bg-white border border-gray-200 rounded-lg p-0">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Documents</h2>
          <div className="text-sm text-gray-500">{binder.client_binder_documents?.length || 0} files</div>
        </div>
        {binder.client_binder_documents && binder.client_binder_documents.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {binder.client_binder_documents.map((item) => (
              <li key={item.document_id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.documents?.name || 'Document'}</div>
                    {item.documents?.file_size && (
                      <div className="text-xs text-gray-500 mt-0.5">{Math.round((item.documents.file_size / 1024 / 1024) * 10) / 10} MB</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {item.is_viewable !== false && (
                    <button
                      onClick={() => openDocument(item)}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </button>
                  )}
                  {item.is_downloadable !== false && (
                    <button
                      onClick={() => downloadDocument(item)}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800"
                    >
                      <DownloadIcon className="w-3.5 h-3.5 mr-1" /> Download
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-gray-600">No documents available.</div>
        )}
      </div>
    </div>
  );
};

export default ClientBinderViewer;


