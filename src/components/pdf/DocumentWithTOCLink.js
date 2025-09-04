// ===============================
// FILE: src/components/pdf/DocumentWithTOCLink.js
// Utility to add "Back to TOC" link to document pages
// ===============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  tocLink: {
    position: 'absolute',
    top: 20,
    right: 20,
    fontSize: 9,
    color: '#0066CC',
    textDecoration: 'underline',
    backgroundColor: '#FFFFFF',
    padding: 4,
    border: '1px solid #E5E7EB',
    zIndex: 1000,
  }
});

/**
 * Utility function to add "Back to TOC" link to a document page
 * This should be used when processing documents for the complete binder
 */
export const addTOCLinkToDocument = (originalDocument, documentName, pageNumber = 1) => {
  // Create the enhanced document with TOC link
  return (
    <Document>
      {/* Add bookmark destination for this document */}
      <Page 
        size="LETTER" 
        style={{ position: 'relative' }}
        bookmark={documentName}
        id={`doc_${documentName.replace(/[^a-zA-Z0-9]/g, '_')}`}
      >
        {/* Back to TOC link */}
        <Link src="#table_of_contents" style={styles.tocLink}>
          <Text>← Back to TOC</Text>
        </Link>
        
        {/* Original document content would be rendered here */}
        {/* This is typically handled by the PDF merger */}
      </Page>
    </Document>
  );
};

/**
 * Component version for standalone use
 */
const DocumentWithTOCLink = ({ 
  children, 
  documentName, 
  pageNumber = 1,
  bookmarkId = null 
}) => {
  const finalBookmarkId = bookmarkId || `doc_${documentName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  return (
    <Document>
      <Page 
        size="LETTER" 
        style={{ position: 'relative' }}
        bookmark={documentName}
        id={finalBookmarkId}
      >
        {/* Invisible bookmark anchor */}
        <Text 
          id={finalBookmarkId}
          style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}
        >
          {documentName}
        </Text>

        {/* Back to TOC link */}
        <Link src="#table_of_contents" style={styles.tocLink}>
          <Text>← Back to TOC</Text>
        </Link>
        
        {/* Document content */}
        {children}
      </Page>
    </Document>
  );
};

export default DocumentWithTOCLink;