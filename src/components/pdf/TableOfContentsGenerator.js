// ===============================
// FILE: src/components/pdf/TableOfContentsGenerator.js
// COMPLETE IMPLEMENTATION - Replace your existing file with this
// ===============================

import React, { useState, useEffect } from 'react';
import { Download, Eye, FileText, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { documentOrganizationService } from '../../utils/documentOrganizationService';
import { documentUrlUtils } from '../../utils/documentUrlUtils';
import { supabase } from '../../lib/supabase';
import TableOfContentsPDF from './TableOfContentsPDF';

const TableOfContentsGenerator = ({ project }) => {
  const [structure, setStructure] = useState({ sections: [], documents: [] });
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [documentStats, setDocumentStats] = useState({
    total: 0,
    organized: 0,
    unorganized: 0,
    sections: 0,
    subsections: 0
  });
  const [documentUrls, setDocumentUrls] = useState({});
  const [urlsLoading, setUrlsLoading] = useState(false);

  useEffect(() => {
    loadTableOfContentsData();
    loadLogos();
  }, [project.id]);

  const loadTableOfContentsData = async () => {
    setLoading(true);
    try {
      console.log('Loading TOC data for project:', project.id);
      
      const structureData = await documentOrganizationService.getProjectStructure(project.id);
      setStructure(structureData);

      // Calculate statistics
      const total = structureData.documents.length;
      const organized = structureData.documents.filter(doc => doc.section_id).length;
      const unorganized = total - organized;
      
      const sections = structureData.sections.filter(s => s.section_type === 'section').length;
      const subsections = structureData.sections.filter(s => s.section_type === 'subsection').length;

      setDocumentStats({ total, organized, unorganized, sections, subsections });
      
      // Pre-generate all document URLs for PDF links
      if (structureData.documents.length > 0) {
        await generateAllDocumentUrls(structureData.documents);
      }
      
      console.log('TOC data loaded successfully:', {
        sections: structureData.sections.length,
        documents: structureData.documents.length
      });
    } catch (error) {
      console.error('Error loading table of contents data:', error);
      alert('Failed to load document structure. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAllDocumentUrls = async (documents) => {
    setUrlsLoading(true);
    try {
      console.log('Generating signed URLs for', documents.length, 'documents');
      const urlMap = {};
      
      // Generate URLs in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchPromises = batch.map(async (doc) => {
          try {
            const url = await documentUrlUtils.generateSignedUrl(doc, 7200); // 2 hours for PDF links
            if (url) {
              urlMap[doc.id] = url;
              console.log(`Generated URL for ${doc.name}:`, url);
              console.log('URL is accessible:', url);
            }
          } catch (error) {
            console.error(`Failed to generate URL for document ${doc.name}:`, error);
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      setDocumentUrls(urlMap);
      console.log('Generated URLs for', Object.keys(urlMap).length, 'documents');
      console.log('URL Map:', urlMap);
    } catch (error) {
      console.error('Error generating document URLs:', error);
    } finally {
      setUrlsLoading(false);
    }
  };

  const loadLogos = async () => {
    try {
      const { data, error } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', project.id)
        .order('logo_position');

      if (error) {
        console.error('Error loading logos:', error);
      } else {
        setLogos(data || []);
      }
    } catch (error) {
      console.error('Exception loading logos:', error);
    }
  };

  const handleTestDocumentLinks = async () => {
    if (structure.documents.length === 0) {
      alert('No documents to test. Please upload some documents first.');
      return;
    }

    setLoading(true);
    try {
      console.log('Testing document links...');
      const testDoc = structure.documents[0]; // Test first document
      
      // Get URL from our pre-generated URLs or generate a new one
      let url = documentUrls[testDoc.id];
      if (!url) {
        url = await documentUrlUtils.generateSignedUrl(testDoc, 7200);
      }
      
      if (url) {
        console.log('Test URL:', url);
        
        // Test if URL is accessible
        const isAccessible = await documentUrlUtils.testUrl(url);
        console.log('URL accessible:', isAccessible);
        
        if (isAccessible) {
          await documentUrlUtils.openDocumentInNewTab(testDoc, url);
          alert('Test successful! The document should have opened in a new tab.');
        } else {
          alert('URL generated but document is not accessible. Check Supabase permissions.');
        }
      } else {
        alert('Failed to generate document URL. Please check your document storage setup.');
      }
    } catch (error) {
      console.error('Error testing document links:', error);
      alert('Error testing document links. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const getPDFFileName = () => {
    const projectName = project.title || 'Closing-Binder';
    const cleanName = projectName.replace(/[^a-z0-9]/gi, '-');
    const date = new Date().toISOString().split('T')[0];
    return `${cleanName}-TOC-${date}.pdf`;
  };

  // Create the PDF component with pre-generated URLs
  const createTOCPDF = () => (
    <TableOfContentsPDF 
      project={project}
      structure={structure}
      logos={logos}
      documentUrls={documentUrls} // Pass pre-generated URLs instead of function
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Table of Contents Generator</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generate a professional table of contents with clickable document links
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadTableOfContentsData}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {structure.documents.length > 0 && (
            <button
              onClick={handleTestDocumentLinks}
              disabled={loading || urlsLoading}
              className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {urlsLoading ? 'Generating URLs...' : 'Test Links'}
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={loading || urlsLoading}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? 'Hide Preview' : 'Preview'}
        </button>

        {(structure.sections.length > 0 || structure.documents.length > 0) ? (
          <PDFDownloadLink
            document={createTOCPDF()}
            fileName={getPDFFileName()}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              urlsLoading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {({ loading: pdfLoading }) => (
              <>
                <Download className="h-4 w-4 mr-2" />
                {urlsLoading ? 'Generating URLs...' : pdfLoading ? 'Generating PDF...' : 'Download TOC'}
              </>
            )}
          </PDFDownloadLink>
        ) : (
          <div className="flex items-center px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed">
            <Download className="h-4 w-4 mr-2" />
            Download TOC
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {loading || urlsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-600">
              {urlsLoading ? 'Generating document URLs...' : 'Loading document structure...'}
            </span>
          </div>
        ) : documentStats.total === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No documents uploaded yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Upload and organize documents to generate a table of contents
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Document Structure Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{documentStats.total}</div>
                  <div className="text-blue-800">Total Documents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{documentStats.organized}</div>
                  <div className="text-blue-800">Organized</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{documentStats.unorganized}</div>
                  <div className="text-blue-800">Unorganized</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{documentStats.sections}</div>
                  <div className="text-blue-800">Sections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{documentStats.subsections}</div>
                  <div className="text-blue-800">Subsections</div>
                </div>
              </div>
            </div>
            
            {/* Features List */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Table of Contents Features</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Hierarchical document structure with automatic numbering (1, 1.1, 1.2, etc.)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Company logos and project information in professional header
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Clickable document links that open files in new browser tabs
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Professional formatting suitable for legal and financial closing binders
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  Automatic page numbering and generation timestamp
                </li>
              </ul>
            </div>

            {/* Warnings if any */}
            {documentStats.unorganized > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-orange-900 mb-1">Unorganized Documents</h4>
                    <p className="text-sm text-orange-800">
                      You have {documentStats.unorganized} document{documentStats.unorganized === 1 ? '' : 's'} that {documentStats.unorganized === 1 ? 'is' : 'are'} not organized into sections. 
                      {documentStats.unorganized === 1 ? ' It' : ' They'} will appear at the bottom of the table of contents under "Unorganized Documents".
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Preview */}
      {showPreview && (structure.sections.length > 0 || structure.documents.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">PDF Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="border border-gray-300 rounded" style={{ height: '600px' }}>
            <PDFViewer width="100%" height="100%">
              {createTOCPDF()}
            </PDFViewer>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableOfContentsGenerator;