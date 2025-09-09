// ===============================
// FILE: src/components/HybridBinderGenerator.js
// FINAL WORKING VERSION with Enhanced PDF and Working Web Binder
// ===============================

import React, { useState, useEffect, useCallback } from 'react';
import { Globe, FileText, RefreshCw, Download, CheckCircle } from 'lucide-react';
import { documentOrganizationService } from '../utils/documentOrganizationService';
import CoverPageHTML from './web/CoverPageHTML';
import TableOfContentsHTML from './web/TableOfContentsHTML';

const HybridBinderGenerator = ({ project, onProjectUpdate }) => {
  const [mode, setMode] = useState('web'); // Start with web mode
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
    console.log('Starting ENHANCED PDF generation...');
    setLoading(true);
    setError(null);
    
    try {
      if (documents.length === 0) {
        throw new Error('No documents found. Please upload documents first.');
      }

      // Import the ENHANCED PDF generator (THIS IS THE KEY CHANGE!)
      const { generateEnhancedPDFBinder } = await import('../utils/enhancedPdfBinderGenerator');
      
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

      console.log('Generating ENHANCED PDF with data:', {
        project: project?.title,
        documents: documents.length,
        sections: structure.sections.length,
        logos: logosData?.length || 0
      });

      // Generate the ENHANCED PDF binder with better TOC
      const result = await generateEnhancedPDFBinder({
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
      link.download = `${project?.title || 'Enhanced Closing Binder'}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('ENHANCED PDF generated and downloaded successfully');

    } catch (err) {
      console.error('Error generating ENHANCED PDF:', err);
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
        Enhanced PDF
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

    // Show the actual web binder when generated
    return (
      <div className="space-y-8">
        {/* Success Header */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Web Binder Generated Successfully!</h3>
          </div>
          <button
            onClick={() => setGeneratedWeb(false)}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            ← Back to generate options
          </button>
        </div>

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
          {/* Use the fixed TableOfContentsHTML component */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <TableOfContentsHTML 
              project={project}
              documents={documents}
              structure={structure}
            />
          </div>
        </div>
      </div>
    );
  };

  const PdfBinderContent = () => (
    <div className="text-center py-12">
      <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Generate Enhanced PDF Binder
      </h3>
      <p className="text-gray-600 mb-6">
        Create a professional PDF with enhanced table of contents, clickable links, and improved formatting
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Enhanced PDF Features */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
          <h4 className="font-medium text-blue-900 mb-2">Enhanced PDF Features</h4>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            <li>• Professional cover page with property photos and logos</li>
            <li>• Enhanced table of contents with better formatting</li>
            <li>• Clickable document links that open in new windows</li>
            <li>• Professional typography and legal/financial formatting</li>
            <li>• Proper hierarchical document organization</li>
            <li>• Dotted lines and page numbers like Complete Binder Generator</li>
          </ul>
        </div>
      </div>
      
      <button
        onClick={handleGeneratePDF}
        disabled={loading || documents.length === 0}
        className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Generating Enhanced PDF...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5 mr-2" />
            Generate Enhanced PDF Binder
          </>
        )}
      </button>

      {loading && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Creating enhanced PDF with improved formatting...</p>
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
          Choose between interactive web format or enhanced PDF with improved table of contents
        </p>
      </div>

      <ModeSelector />
      <DocumentStats />

      {/* Content based on mode */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">
              {mode === 'web' ? 'Loading web binder...' : 'Generating enhanced PDF...'}
            </p>
          </div>
        ) : (
          <>
            {mode === 'web' && <WebBinderContent />}
            {mode === 'pdf' && <PdfBinderContent />}
          </>
        )}
      </div>
    </div>
  );
};

export default HybridBinderGenerator;