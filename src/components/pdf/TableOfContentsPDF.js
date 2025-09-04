// ===============================
// FILE: src/components/pdf/TableOfContentsPDF.js
// Enhanced with proper PDF bookmarks and named destinations
// ===============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    padding: 72,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottom: '2px solid #000000',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  logo: {
    maxWidth: 60,
    maxHeight: 45,
    objectFit: 'contain',
  },
  headerInfo: {
    textAlign: 'right',
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  projectAddress: {
    fontSize: 12,
    color: '#4A4A4A',
  },
  tocTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 40,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1px solid #F5F5F5',
  },
  subsectionContainer: {
    marginLeft: 20,
    marginBottom: 15,
  },
  subsectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  documentRowSubsection: {
    marginLeft: 40,
  },
  documentName: {
    fontSize: 11,
    color: '#000000',
    flex: 1,
  },
  documentNameLink: {
    fontSize: 11,
    color: '#0066CC',
    flex: 1,
    textDecoration: 'underline',
  },
  documentNumber: {
    fontSize: 11,
    color: '#4A4A4A',
    minWidth: 30,
    textAlign: 'right',
  },
  unorganizedSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '1px solid #F5F5F5',
  },
  footer: {
    position: 'absolute',
    bottom: 72,
    left: 72,
    right: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTop: '1px solid #F5F5F5',
    fontSize: 9,
    color: '#4A4A4A',
  },
  instructionBox: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    marginBottom: 20,
    borderRadius: 4,
  },
  instructionText: {
    fontSize: 10,
    color: '#4A4A4A',
    lineHeight: 1.4,
    textAlign: 'center',
  }
});

const TableOfContentsPDF = ({ 
  project, 
  structure, 
  logos = [], 
  generateDocumentUrl,
  documentBookmarks = new Map(), // Bookmarks from PDF merger
  options = { createBookmarks: true } // Default options to prevent undefined error
}) => {
  
  // Process documents with page references from the PDF merger
  const generateNumbering = () => {
    const numbered = {
      sections: {},
      documents: {},
      unorganized: []
    };

    let sectionNumber = 1;
    let documentNumber = 1;

    // Process sections
    structure.sections.forEach((section) => {
      if (section.section_type === 'section') {
        numbered.sections[section.id] = {
          ...section,
          number: sectionNumber++,
          subsections: {},
          documents: []
        };

        let subsectionNumber = 1;
        
        // Process subsections
        structure.sections
          .filter(sub => sub.parent_section_id === section.id)
          .forEach((subsection) => {
            numbered.sections[section.id].subsections[subsection.id] = {
              ...subsection,
              number: `${numbered.sections[section.id].number}.${subsectionNumber++}`,
              documents: []
            };
          });
      }
    });

    // Process documents with page references from documentBookmarks
    structure.documents.forEach((doc) => {
      // Try to get page number from bookmarks created by PDF merger
      const docName = doc.original_name || doc.name;
      const pageNumber = documentBookmarks.get(docName)?.pageNumber || null;
      
      const docWithNumber = {
        ...doc,
        number: documentNumber++,
        url: generateDocumentUrl ? generateDocumentUrl(doc) : null,
        // Use page number from PDF merger if available
        pageNumber: pageNumber
      };

      if (doc.section_id) {
        const parentSection = Object.values(numbered.sections).find(s => s.id === doc.section_id);
        if (parentSection) {
          parentSection.documents.push(docWithNumber);
        } else {
          Object.values(numbered.sections).forEach(section => {
            const subsection = Object.values(section.subsections).find(sub => sub.id === doc.section_id);
            if (subsection) {
              subsection.documents.push(docWithNumber);
            }
          });
        }
      } else {
        numbered.unorganized.push(docWithNumber);
      }
    });

    return numbered;
  };

  const numberedStructure = generateNumbering();

  // Safe logo rendering
  const renderLogos = () => {
    if (!logos || logos.length === 0) return null;
    
    return logos
      .filter(logo => logo && (logo.url || logo.logo_url))
      .slice(0, 3)
      .map((logo, index) => (
        <Image
          key={index}
          style={styles.logo}
          src={logo.url || logo.logo_url}
        />
      ));
  };

  // Document rendering with external links (since internal PDF links don't work reliably)
  const renderDocument = (doc, isSubsection = false) => {
    return (
      <View 
        key={doc.id} 
        style={[
          styles.documentRow, 
          isSubsection && styles.documentRowSubsection
        ]}
      >
        {/* Document name - make it look like a link but show page reference */}
        {doc.url ? (
          <Link 
            src={doc.url}
            style={styles.documentNameLink}
          >
            <Text>{doc.original_name || doc.name}</Text>
          </Link>
        ) : (
          <Text style={styles.documentNameLink}>
            {doc.original_name || doc.name}
          </Text>
        )}
        
        {/* Show page number if available */}
        <Text style={styles.documentNumber}>
          {doc.pageNumber ? `Page ${doc.pageNumber}` : `Doc ${doc.number}`}
        </Text>
      </View>
    );
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Add TOC bookmark destination */}
        <Text 
          id="table_of_contents"
          style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}
        >
          TOC
        </Text>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {renderLogos()}
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.projectTitle}>
              {project?.title || 'Closing Binder'}
            </Text>
            {project?.property_address && (
              <Text style={styles.projectAddress}>
                {project.property_address}
              </Text>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.tocTitle}>Table of Contents</Text>

        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Click on document names to navigate directly to that document. 
            Each document contains a "Back to TOC" link in the top-right corner to return here.
          </Text>
        </View>

        {/* Organized Sections */}
        {Object.values(numberedStructure.sections).map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>
              {section.number}. {section.name}
            </Text>
            
            {/* Section Documents */}
            {section.documents.map(doc => renderDocument(doc))}
            
            {/* Subsections */}
            {Object.values(section.subsections).map((subsection) => (
              <View key={subsection.id} style={styles.subsectionContainer}>
                <Text style={styles.subsectionHeader}>
                  {subsection.number} {subsection.name}
                </Text>
                {subsection.documents.map(doc => renderDocument(doc, true))}
              </View>
            ))}
          </View>
        ))}

        {/* Unorganized Documents */}
        {numberedStructure.unorganized.length > 0 && (
          <View style={[styles.sectionContainer, styles.unorganizedSection]}>
            <Text style={styles.sectionHeader}>Additional Documents</Text>
            {numberedStructure.unorganized.map(doc => renderDocument(doc))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Table of Contents</Text>
          <Text>Generated: {new Date().toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TableOfContentsPDF;