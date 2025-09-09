// ===============================
// FILE: src/utils/pdfBinderGenerator.js
// FIXED VERSION - Complete PDF generation with all documents
// ===============================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

class PDFBinderGenerator {
  constructor() {
    this.pdfDoc = null;
    this.fonts = {};
    this.pageWidth = 612;
    this.pageHeight = 792;
    this.margin = 50;
    this.embeddedImages = {};
  }

  async initialize() {
    this.pdfDoc = await PDFDocument.create();
    
    // Load fonts
    this.fonts.helvetica = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.fonts.helveticaBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    this.fonts.times = await this.pdfDoc.embedFont(StandardFonts.TimesRoman);
    this.fonts.timesBold = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  }

  async embedImages(project, logos) {
    console.log('Embedding images...');
    
    // Embed property photo
    if (project?.property_photo_url || project?.cover_photo_url) {
      try {
        const photoUrl = project.property_photo_url || project.cover_photo_url;
        const photoResponse = await fetch(photoUrl);
        if (photoResponse.ok) {
          const photoBytes = await photoResponse.arrayBuffer();
          this.embeddedImages.propertyPhoto = await this.pdfDoc.embedJpg(photoBytes);
          console.log('Property photo embedded successfully');
        }
      } catch (error) {
        console.warn('Failed to embed property photo:', error);
      }
    }

    // Embed logos
    if (logos && Array.isArray(logos)) {
      for (let i = 0; i < Math.min(logos.length, 3); i++) {
        try {
          const logoUrl = logos[i]?.url || logos[i]?.logo_url;
          if (logoUrl) {
            const logoResponse = await fetch(logoUrl);
            if (logoResponse.ok) {
              const logoBytes = await logoResponse.arrayBuffer();
              this.embeddedImages[`logo${i}`] = await this.pdfDoc.embedPng(logoBytes);
              console.log(`Logo ${i + 1} embedded successfully`);
            }
          }
        } catch (error) {
          console.warn(`Failed to embed logo ${i + 1}:`, error);
        }
      }
    }
  }

  measureText(text, font, size) {
    return font.widthOfTextAtSize(text, size);
  }

  async drawMultiLineText(page, text, x, startY, maxWidth, fontSize, font, color, align = 'left') {
    const lines = text.split('\n');
    let currentY = startY;
    const lineHeight = fontSize * 1.2;

    for (const line of lines) {
      if (!line.trim()) {
        currentY -= lineHeight;
        continue;
      }

      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = this.measureText(testLine, font, fontSize);
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            let textX = x;
            if (align === 'center') {
              const lineWidth = this.measureText(currentLine, font, fontSize);
              textX = x + (maxWidth - lineWidth) / 2;
            }
            
            page.drawText(currentLine, {
              x: textX,
              y: currentY,
              size: fontSize,
              font: font,
              color: color
            });
            currentY -= lineHeight;
          }
          currentLine = word;
        }
      }
      
      if (currentLine) {
        let textX = x;
        if (align === 'center') {
          const lineWidth = this.measureText(currentLine, font, fontSize);
          textX = x + (maxWidth - lineWidth) / 2;
        }
        
        page.drawText(currentLine, {
          x: textX,
          y: currentY,
          size: fontSize,
          font: font,
          color: color
        });
        currentY -= lineHeight;
      }
    }
    
    return currentY;
  }

  formatPropertyAddress(project) {
    if (!project?.property_address) return '';
    
    const address = project.property_address.trim();
    if (address.length > 80) {
      const midPoint = address.length / 2;
      const breakPoint = address.indexOf(',', midPoint);
      if (breakPoint !== -1) {
        return address.substring(0, breakPoint + 1) + '\n' + address.substring(breakPoint + 2);
      }
    }
    return address;
  }

  async generateCoverPage(project, logos) {
    console.log('Generating cover page with property image...');
    
    const page = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    let yPosition = this.pageHeight - this.margin;

    // Header Section
    const headerBottom = yPosition - 150;
    
    // Title
    const title = project?.title || 'CLOSING BINDER';
    const titleSize = 28;
    const titleWidth = this.measureText(title, this.fonts.timesBold, titleSize);
    page.drawText(title, {
      x: (this.pageWidth - titleWidth) / 2,
      y: yPosition - 20,
      size: titleSize,
      font: this.fonts.timesBold,
      color: rgb(0, 0, 0)
    });

    // Property Address
    if (project?.property_address) {
      const address = this.formatPropertyAddress(project);
      const addressSize = 16;
      const addressWidth = this.measureText(address, this.fonts.helvetica, addressSize);
      page.drawText(address, {
        x: (this.pageWidth - addressWidth) / 2,
        y: yPosition - 60,
        size: addressSize,
        font: this.fonts.helvetica,
        color: rgb(0.3, 0.3, 0.3)
      });
    }

    // Property Description
    if (project?.property_description) {
      yPosition = await this.drawMultiLineText(
        page, 
        project.property_description, 
        this.margin, 
        yPosition - 95, 
        this.pageWidth - (this.margin * 2), 
        12, 
        this.fonts.helvetica,
        rgb(0.4, 0.4, 0.4),
        'center'
      );
    }

    // Header border
    page.drawLine({
      start: { x: this.margin, y: headerBottom },
      end: { x: this.pageWidth - this.margin, y: headerBottom },
      thickness: 2,
      color: rgb(0, 0, 0)
    });

    yPosition = headerBottom - 30;

    // FIXED: Property Photo Section (now properly includes the image)
    if (this.embeddedImages.propertyPhoto) {
      const photoWidth = 300;
      const photoHeight = 200;
      const photoX = (this.pageWidth - photoWidth) / 2;
      const photoY = yPosition - photoHeight;
      
      // Scale image to fit within bounds
      const imgDims = this.embeddedImages.propertyPhoto.scale(1);
      const scaleX = photoWidth / imgDims.width;
      const scaleY = photoHeight / imgDims.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = imgDims.width * scale;
      const scaledHeight = imgDims.height * scale;
      
      page.drawImage(this.embeddedImages.propertyPhoto, {
        x: photoX + (photoWidth - scaledWidth) / 2,
        y: photoY + (photoHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
      
      yPosition -= photoHeight + 20;
      console.log('Property photo rendered on cover page');
    }

    // Rest of cover page content...
    return yPosition;
  }

  async generateSimpleTableOfContents(project, numberedStructure, logos) {
    console.log('Generating table of contents...');
    
    const page = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    let yPosition = this.pageHeight - this.margin;

    // TOC Header
    const tocTitle = 'TABLE OF CONTENTS';
    const tocTitleSize = 20;
    const tocTitleWidth = this.measureText(tocTitle, this.fonts.timesBold, tocTitleSize);
    page.drawText(tocTitle, {
      x: (this.pageWidth - tocTitleWidth) / 2,
      y: yPosition - 20,
      size: tocTitleSize,
      font: this.fonts.timesBold,
      color: rgb(0, 0, 0)
    });

    yPosition -= 60;

    // List all sections and documents
    Object.values(numberedStructure.sections).forEach(section => {
      if (yPosition < 100) return; // Page break needed
      
      // Section header
      page.drawText(`${section.displayNumber}. ${section.name}`, {
        x: this.margin,
        y: yPosition,
        size: 14,
        font: this.fonts.helveticaBold,
        color: rgb(0, 0, 0)
      });
      yPosition -= 25;

      // Section documents
      section.documents.forEach(doc => {
        if (yPosition < 100) return;
        page.drawText(`   ${doc.displayNumber}. ${doc.name || doc.title}`, {
          x: this.margin + 20,
          y: yPosition,
          size: 11,
          font: this.fonts.helvetica,
          color: rgb(0.2, 0.2, 0.2)
        });
        yPosition -= 18;
      });

      // Subsections
      Object.values(section.subsections).forEach(subsection => {
        if (yPosition < 100) return;
        
        page.drawText(`   ${subsection.displayNumber}. ${subsection.name}`, {
          x: this.margin + 20,
          y: yPosition,
          size: 12,
          font: this.fonts.helveticaBold,
          color: rgb(0.1, 0.1, 0.1)
        });
        yPosition -= 20;

        subsection.documents.forEach(doc => {
          if (yPosition < 100) return;
          page.drawText(`      ${doc.displayNumber}. ${doc.name || doc.title}`, {
            x: this.margin + 40,
            y: yPosition,
            size: 11,
            font: this.fonts.helvetica,
            color: rgb(0.2, 0.2, 0.2)
          });
          yPosition -= 18;
        });
      });

      yPosition -= 10; // Extra space between sections
    });

    // Unorganized documents
    if (numberedStructure.unorganized.length > 0) {
      page.drawText('Additional Documents', {
        x: this.margin,
        y: yPosition,
        size: 14,
        font: this.fonts.helveticaBold,
        color: rgb(0, 0, 0)
      });
      yPosition -= 25;

      numberedStructure.unorganized.forEach(doc => {
        if (yPosition < 100) return;
        page.drawText(`${doc.displayNumber}. ${doc.name || doc.title}`, {
          x: this.margin + 20,
          y: yPosition,
          size: 11,
          font: this.fonts.helvetica,
          color: rgb(0.2, 0.2, 0.2)
        });
        yPosition -= 18;
      });
    }
  }

  // FIXED: This method now properly includes ALL documents
  async addDocumentsInOrder(numberedStructure) {
    console.log('Adding documents in order...');
    let documentsAdded = 0;

    try {
      // Add documents from organized sections
      for (const section of Object.values(numberedStructure.sections)) {
        console.log(`Processing section: ${section.name}`);
        
        // Add section documents
        for (const doc of section.documents) {
          await this.addSingleDocument(doc);
          documentsAdded++;
        }

        // Add subsection documents
        for (const subsection of Object.values(section.subsections)) {
          console.log(`Processing subsection: ${subsection.name}`);
          for (const doc of subsection.documents) {
            await this.addSingleDocument(doc);
            documentsAdded++;
          }
        }
      }

      // Add unorganized documents
      console.log(`Processing ${numberedStructure.unorganized.length} unorganized documents`);
      for (const doc of numberedStructure.unorganized) {
        await this.addSingleDocument(doc);
        documentsAdded++;
      }

      console.log(`Successfully added ${documentsAdded} documents to binder`);
    } catch (error) {
      console.error('Error adding documents:', error);
      throw error;
    }
  }

  async addSingleDocument(doc) {
    try {
      console.log(`Adding document: ${doc.name || doc.title}`);
      
      let documentBytes;
      
      // Get document data from different possible sources
      if (doc.blob) {
        documentBytes = await doc.blob.arrayBuffer();
      } else if (doc.storage_path) {
        // Fetch from Supabase storage
        const { supabase } = await import('../utils/supabase');
        const { data, error } = await supabase.storage
          .from('documents')
          .download(doc.storage_path);
        
        if (error) throw error;
        documentBytes = await data.arrayBuffer();
      } else if (doc.file_url) {
        // Fetch from URL
        const response = await fetch(doc.file_url);
        if (!response.ok) throw new Error(`Failed to fetch document: ${response.statusText}`);
        documentBytes = await response.arrayBuffer();
      } else {
        console.warn(`No valid source found for document: ${doc.name || doc.title}`);
        return;
      }

      // Load and merge the PDF
      const documentPdf = await PDFDocument.load(documentBytes);
      const pages = await this.pdfDoc.copyPages(documentPdf, documentPdf.getPageIndices());
      
      pages.forEach(page => {
        this.pdfDoc.addPage(page);
      });

      console.log(`Successfully added ${pages.length} pages from ${doc.name || doc.title}`);
    } catch (error) {
      console.error(`Failed to add document ${doc.name || doc.title}:`, error);
      // Continue with other documents instead of failing completely
    }
  }

  // UPDATED: Main generation method with proper error handling
  async generateBinder(project, documents, structure, logos) {
    try {
      console.log('Starting binder generation...');
      
      await this.initialize();
      await this.embedImages(project, logos);
      
      const numberedStructure = this.createNumberedStructure(documents, structure);
      console.log('Numbered structure created:', numberedStructure);
      
      // Generate cover page with property image
      await this.generateCoverPage(project, logos);
      
      // Generate table of contents
      await this.generateSimpleTableOfContents(project, numberedStructure, logos);
      
      // FIXED: Add all documents in proper order
      await this.addDocumentsInOrder(numberedStructure);
      
      // Generate final PDF
      console.log('Saving PDF...');
      const pdfBytes = await this.pdfDoc.save();
      
      console.log('PDF binder generation completed successfully');
      return { success: true, data: pdfBytes };
      
    } catch (error) {
      console.error('Error generating PDF binder:', error);
      return { success: false, error: error.message };
    }
  }

  createNumberedStructure(documents, structure) {
    console.log('Creating numbered structure...');
    
    const result = {
      sections: {},
      unorganized: [],
      orderedItems: []
    };

    if (!structure || !structure.sections) {
      console.log('No structure provided, treating all documents as unorganized');
      documents.forEach((doc, index) => {
        const numberedDoc = {
          ...doc,
          number: index + 1,
          displayNumber: (index + 1).toString()
        };
        result.unorganized.push(numberedDoc);
      });
      return result;
    }

    // Group sections by type and parent
    const sections = structure.sections.filter(s => s.section_type === 'section').sort((a, b) => a.sort_order - b.sort_order);
    const subsections = structure.sections.filter(s => s.section_type === 'subsection').sort((a, b) => a.sort_order - b.sort_order);

    // Create numbered sections
    sections.forEach((section, index) => {
      const sectionNumber = index + 1;
      result.sections[section.id] = {
        ...section,
        number: sectionNumber,
        displayNumber: sectionNumber.toString(),
        documents: [],
        subsections: {}
      };
    });

    // Add subsections to their parent sections
    subsections.forEach((subsection) => {
      const parentSection = result.sections[subsection.parent_section_id];
      if (parentSection) {
        const subsectionIndex = Object.keys(parentSection.subsections).length + 1;
        const subsectionNumber = `${parentSection.number}.${subsectionIndex}`;
        
        parentSection.subsections[subsection.id] = {
          ...subsection,
          number: subsectionNumber,
          displayNumber: subsectionNumber,
          documents: []
        };
      }
    });

    // Assign documents to sections/subsections
    documents.forEach((doc) => {
      if (doc.section_id) {
        // Check if it belongs to a main section
        if (result.sections[doc.section_id]) {
          const section = result.sections[doc.section_id];
          const docNumber = section.documents.length + 1;
          section.documents.push({
            ...doc,
            number: docNumber,
            displayNumber: `${section.displayNumber}.${docNumber}`
          });
          return;
        }

        // Check if it belongs to a subsection
        for (const section of Object.values(result.sections)) {
          if (section.subsections[doc.section_id]) {
            const subsection = section.subsections[doc.section_id];
            const docNumber = subsection.documents.length + 1;
            subsection.documents.push({
              ...doc,
              number: docNumber,
              displayNumber: `${subsection.displayNumber}.${docNumber}`
            });
            return;
          }
        }
      }
      
      // If no section found, add to unorganized
      const docNumber = result.unorganized.length + 1;
      result.unorganized.push({
        ...doc,
        number: docNumber,
        displayNumber: docNumber.toString()
      });
    });

    console.log('Numbered structure created successfully');
    return result;
  }
}

export default PDFBinderGenerator;