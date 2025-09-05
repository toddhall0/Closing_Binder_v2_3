// ===============================
// FILE: src/components/HybridBinderGenerator.js
// Hybrid binder generator with WORKING PDF generation
// ===============================

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, FileText, RefreshCw, Download } from 'lucide-react';
import { documentOrganizationService } from '../utils/documentOrganizationService';
import CoverPageHTML from './web/CoverPageHTML';
import TableOfContentsHTML from './web/TableOfContentsHTML';

const HybridBinderGenerator = ({ project, onProjectUpdate }) => {
  const [mode, setMode] = useState('web');
  const [documents, setDocuments] = useState([]);
  const [structure, setStructure] = useState({ sections: [], documents: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedWeb, setGeneratedWeb] = useState(false);

  // Load documents when component mounts or project changes
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading documents for project:', project.id);
      const structureData = await documentOrganizationService.getProjectStructure(project.id);
      setStructure(structureData);
      setDocuments(structureData.documents || []);
      console.log('Documents loaded successfully:', {
        sections: structureData.sections.length,
        documents: structureData.documents.length
      });
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(`Failed to load documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (project?.id) {
      loadDocuments();
    }
  }, [project?.id, loadDocuments]);

  

  const handleGenerateWeb = () => {
    console.log('handleGenerateWeb called with:', {
      documents: documents.length,
      documentsArray: documents,
      sections: structure.sections.length
    });
    
    if (documents.length === 0) {
      setError('No documents found. Please upload documents first.');
      return;
    }
    
    setGeneratedWeb(true);
    setError(null);
  };

  const handleGeneratePDF = async () => {
    console.log('Starting PDF generation...');
    setLoading(true);
    setError(null);
    
    try {
      if (documents.length === 0) {
        throw new Error('No documents found. Please upload documents first.');
      }

      // Import the PDF generator
      const { generatePDFBinder } = await import('../utils/pdfBinderGenerator');
      
      // Load logos for PDF generation
      const { supabase } = await import('../lib/supabase');
      const { data: logosData, error: logosError } = await supabase
        .from('logos')
        .select('*')
        .eq('project_id', project.id)
        .order('logo_position');

      if (logosError) {
        console.error('Error loading logos for PDF:', logosError);
      }

      console.log('Generating PDF with data:', {
        project: project?.title,
        documents: documents.length,
        sections: structure.sections.length,
        logos: logosData?.length || 0
      });

      // Generate the complete PDF binder
      const result = await generatePDFBinder({
        project,
        documents,
        structure,
        logos: logosData || []
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Create download
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.title || 'Closing Binder'}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('PDF generated and downloaded successfully');

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const ModeSelector = () => (
    <div className="flex items-center space-x-4 mb-6">
      <button
        onClick={() => setMode('web')}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          mode === 'web'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Globe className="h-4 w-4 mr-2" />
        Web Binder
      </button>
      <button
        onClick={() => setMode('pdf')}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          mode === 'pdf'
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <FileText className="h-4 w-4 mr-2" />
        PDF Binder
      </button>
      <button
        onClick={loadDocuments}
        disabled={loading}
        className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );

  const DocumentStats = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h4 className="font-medium text-blue-900 mb-2">Project Status</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-blue-800">
          <span className="font-medium">{documents.length}</span> Documents
        </div>
        <div className="text-blue-800">
          <span className="font-medium">{structure.sections.filter(s => s.section_type === 'section').length}</span> Sections
        </div>
        <div className="text-blue-800">
          <span className="font-medium">{structure.sections.filter(s => s.section_type === 'subsection').length}</span> Subsections
        </div>
        <div className="text-blue-800">
          <span className="font-medium">{documents.filter(d => d.section_id).length}</span> Organized
        </div>
      </div>
    </div>
  );

  const WebBinderContent = () => {
    if (!generatedWeb) {
      return (
        <div className="text-center py-12">
          <Globe className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Generate Web-Based Binder
          </h3>
          <p className="text-gray-600 mb-6">
            Create an interactive HTML binder with clickable links to cloud-hosted documents
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerateWeb}
            disabled={loading || documents.length === 0}
            className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Globe className="h-5 w-5 mr-2" />
            Generate Web Binder
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Cover Page */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Cover Page</h3>
            <button
              onClick={() => window.print()}
              className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
          <CoverPageHTML project={project} />
        </div>

        {/* Table of Contents */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Table of Contents</h3>
            <button
              onClick={() => window.print()}
              className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
          <TableOfContentsHTML 
            project={project}
            documents={documents}
            structure={structure}
          />
        </div>

        {/* Instructions */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">✓ Web Binder Generated</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Professional cover page with property details</li>
            <li>• Interactive table of contents with document links</li>
            <li>• Documents open in new tabs for easy viewing</li>
            <li>• Print-ready format for physical binders</li>
          </ul>
          <button
            onClick={() => setGeneratedWeb(false)}
            className="mt-3 text-sm text-green-700 hover:text-green-900 underline"
          >
            ← Back to generate options
          </button>
        </div>
      </div>
    );
  };

  const PdfBinderContent = () => (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Generate Complete PDF Binder
      </h3>
      <p className="text-gray-600 mb-6">
        Create a single PDF with cover page, table of contents, and all documents with bookmarks
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleGeneratePDF}
        disabled={loading || documents.length === 0}
        className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Generating PDF...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF Binder
          </>
        )}
      </button>

      {loading && (
        <div className="mt-4 text-sm text-gray-600">
          <p>This may take a few minutes for large binders...</p>
          <p>Please keep this tab open during generation.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Generate Closing Binder</h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose between interactive web format or downloadable PDF
        </p>
      </div>

      <ModeSelector />
      <DocumentStats />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      ) : (
        <>
          {mode === 'web' && <WebBinderContent />}
          {mode === 'pdf' && <PdfBinderContent />}
        </>
      )}
    </div>
  );
};

export default HybridBinderGenerator;