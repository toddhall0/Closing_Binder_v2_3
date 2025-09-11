// ===============================
// FILE: src/components/pdf/TableOfContentsPDF.js
// Enhanced with proper PDF bookmarks and named destinations
// ===============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 56,
    paddingBottom: 56,
    fontFamily: 'Helvetica',
  },
  headerSpacer: {
    height: 40,
    marginBottom: 12,
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
  },
  projectMeta: {
    textAlign: 'center',
    marginBottom: 16,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 6,
  },
  projectAddress: {
    fontSize: 12,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  projectDetails: {
    fontSize: 10,
    color: '#666666',
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionHeaderContainer: {
    backgroundColor: '#F3F4F6', // gray-100
    borderLeft: '4 solid #000000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  subsectionContainer: {
    marginLeft: 16,
    marginBottom: 10,
  },
  subsectionHeaderContainer: {
    backgroundColor: '#F9FAFB', // gray-50
    borderLeft: '4 solid #000000',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  subsectionHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111111',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  documentRowSubsection: {
    marginLeft: 36,
  },
  docNumberCell: {
    fontSize: 11,
    color: '#666666',
    minWidth: 36,
    width: 36,
  },
  docNameCell: {
    fontSize: 11,
    color: '#000000',
    flexGrow: 1,
    marginLeft: 8,
    marginRight: 12,
  },
  docNameLink: {
    fontSize: 11,
    color: '#0066CC',
    textDecoration: 'underline',
  },
  docPageCell: {
    fontSize: 11,
    color: '#4A4A4A',
    minWidth: 44,
    textAlign: 'right',
  },
  unorganizedSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '1px solid #F5F5F5',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 56,
    right: 56,
    textAlign: 'center',
    paddingTop: 10,
    borderTop: '2 solid #000000',
    fontSize: 10,
    color: '#4A4A4A',
  },
  // logos removed per request
  instructionBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    marginBottom: 16,
    borderRadius: 4,
  },
  instructionText: {
    fontSize: 9,
    color: '#4A4A4A',
    lineHeight: 1.3,
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

    // Process sections in sort order
    const sectionsSorted = [...structure.sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    sectionsSorted.forEach((section) => {
      if (section.section_type === 'section') {
        numbered.sections[section.id] = {
          ...section,
          number: sectionNumber++,
          subsections: {},
          documents: []
        };

        let subsectionNumber = 1;
        
        // Process subsections in sort order
        sectionsSorted
          .filter(sub => sub.parent_section_id === section.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .forEach((subsection) => {
            numbered.sections[section.id].subsections[subsection.id] = {
              ...subsection,
              number: `${numbered.sections[section.id].number}.${subsectionNumber++}`,
              documents: []
            };
          });
      }
    });

    // Process documents with page references from documentBookmarks in sort order
    const docsSorted = [...structure.documents].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    docsSorted.forEach((doc) => {
      // Try to get page number from bookmarks created by PDF merger
      const docName = doc.original_name || doc.name || doc.display_name;
      const pageNumber = documentBookmarks.get(docName)?.pageNumber || null;
      
      const docWithNumber = {
        ...doc,
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

    // Assign hierarchical numbers matching client UI
    Object.values(numbered.sections).forEach((section) => {
      // Section documents: 1.1, 1.2, ...
      section.documents = section.documents.map((d, i) => ({
        ...d,
        number: `${section.number}.${i + 1}`
      }));
      // Subsection documents: 1.1.1, 1.1.2, ...
      Object.values(section.subsections).forEach((sub) => {
        sub.documents = sub.documents.map((d, i) => ({
          ...d,
          number: `${sub.number}.${i + 1}`
        }));
      });
    });

    // Unorganized numbering like client: sequential after main sections
    const mainSectionsCount = sectionsSorted.filter(s => s.section_type === 'section').length;
    numbered.unorganized = numbered.unorganized.map((d, i) => ({
      ...d,
      number: `${mainSectionsCount + i + 1}`
    }));

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

  // Document rendering in UI-like format: "1.1 [tab] Name" with optional page number
  const renderDocument = (doc, isSubsection = false) => {
    return (
      <View 
        key={doc.id} 
        style={[
          styles.documentRow, 
          isSubsection && styles.documentRowSubsection
        ]}
        wrap={false}
      >
        <Text style={styles.docNumberCell}>{doc.number}</Text>
        <View style={styles.docNameCell}>
          {doc.url ? (
            <Link src={doc.url} style={styles.docNameLink}>
              <Text>{doc.display_name || doc.original_name || doc.name}</Text>
            </Link>
          ) : (
            <Text>{doc.display_name || doc.original_name || doc.name}</Text>
          )}
        </View>
        <Text style={styles.docPageCell}>{doc.pageNumber ? `Page ${doc.pageNumber}` : ''}</Text>
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

        {/* Header - shown on first page */}
        <View fixed>
          <Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>
          <View style={styles.projectMeta}>
            {!!project?.title && (
              <Text style={styles.projectTitle}>{project.title}</Text>
            )}
            {!!project?.property_address && (
              <Text style={styles.projectAddress}>{project.property_address}</Text>
            )}
            <Text style={styles.projectDetails}>
              {!!project?.purchase_price && `Purchase Price: $${Number(project.purchase_price).toLocaleString()}`}
              {!!project?.purchase_price && !!project?.closing_date && '  •  '}
              {!!project?.closing_date && `Closing Date: ${new Date(project.closing_date).toLocaleDateString()}`}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />

        {/* Organized Sections */}
        {Object.values(numberedStructure.sections).map((section) => (
          <View key={section.id} style={styles.sectionContainer} wrap={false}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeaderText}>
                {section.number}. {section.name}
              </Text>
            </View>
            
            {/* Section Documents */}
            {section.documents.map(doc => renderDocument(doc))}
            
            {/* Subsections */}
            {Object.values(section.subsections).map((subsection) => (
              <View key={subsection.id} style={styles.subsectionContainer} wrap={false}>
                <View style={styles.subsectionHeaderContainer}>
                  <Text style={styles.subsectionHeaderText}>
                    {subsection.number} {subsection.name}
                  </Text>
                </View>
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

        {/* Footer only; logos removed to avoid overlap */}
        <View style={styles.footer}>
          <Text>
            <Text style={{ fontWeight: 'bold' }}>Generated:</Text> {new Date().toLocaleDateString()}
          </Text>
          <Text>This table of contents provides quick access to all documents in your closing binder.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default TableOfContentsPDF;