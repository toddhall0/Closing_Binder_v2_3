// ===============================
// FILE: src/utils/pdfBinderGenerator.js
// Complete PDF Binder Generator - SIMPLIFIED & STABLE
// ===============================

import { PDFDocument, rgb } from 'pdf-lib';

export class PDFBinderGenerator {
  constructor() {
    this.pdfDoc = null;
    this.fonts = {};
    this.pageHeight = 792; // Letter size
    this.pageWidth = 612;
    this.margin = 72; // 1 inch margin
    this.embeddedImages = {};
  }

  async initialize() {
    this.pdfDoc = await PDFDocument.create();
    
    // Load fonts
    try {
      this.fonts.helvetica = await this.pdfDoc.embedFont('Helvetica');
      this.fonts.helveticaBold = await this.pdfDoc.embedFont('Helvetica-Bold');
      this.fonts.timesRoman = await this.pdfDoc.embedFont('Times-Roman');
      this.fonts.timesBold = await this.pdfDoc.embedFont('Times-Bold');
      
      console.log('PDF fonts loaded successfully');
    } catch (error) {
      console.error('Error loading fonts:', error);
      // Fallback to basic fonts
      this.fonts.helvetica = await this.pdfDoc.embedFont('Helvetica');
      this.fonts.helveticaBold = await this.pdfDoc.embedFont('Helvetica-Bold');
      this.fonts.timesRoman = await this.pdfDoc.embedFont('Helvetica');
      this.fonts.timesBold = await this.pdfDoc.embedFont('Helvetica-Bold');
    }
  }

  async embedImages(project, logos) {
    console.log('Embedding images...');
    
    // Embed property photo
    if (project?.cover_photo_url || project?.property_photo_url) {
      const photoUrl = project.cover_photo_url || project.property_photo_url;
      try {
        console.log('Fetching property photo:', photoUrl);
        const response = await fetch(photoUrl);
        if (response.ok) {
          const imageBytes = await response.arrayBuffer();
          const isJpg = photoUrl.toLowerCase().includes('.jpg') || photoUrl.toLowerCase().includes('.jpeg');
          
          if (isJpg) {
            this.embeddedImages.propertyPhoto = await this.pdfDoc.embedJpg(imageBytes);
          } else {
            this.embeddedImages.propertyPhoto = await this.pdfDoc.embedPng(imageBytes);
          }
          console.log('Property photo embedded successfully');
        }
      } catch (error) {
        console.error('Error embedding property photo:', error);
      }
    }

    // Embed logos - FIXED: Handle logo objects properly
    if (logos && logos.length > 0) {
      this.embeddedImages.logos = [];
      
      for (let i = 0; i < Math.min(3, logos.length); i++) {
        const logo = logos[i];
        try {
          // Extract logo URL correctly
          let logoUrl;
          if (typeof logo === 'string') {
            logoUrl = logo;
          } else if (logo && logo.logo_url) {
            logoUrl = logo.logo_url;
          } else if (logo && logo.url) {
            logoUrl = logo.url;
          } else {
            console.warn(`Logo ${i + 1} has no valid URL:`, logo);
            this.embeddedImages.logos.push(null);
            continue;
          }

          console.log(`Fetching logo ${i + 1}:`, logoUrl);
          const response = await fetch(logoUrl);
          
          if (response.ok) {
            const logoBytes = await response.arrayBuffer();
            const isJpg = logoUrl.toLowerCase().includes('.jpg') || logoUrl.toLowerCase().includes('.jpeg');
            
            let embeddedLogo;
            if (isJpg) {
              embeddedLogo = await this.pdfDoc.embedJpg(logoBytes);
            } else {
              embeddedLogo = await this.pdfDoc.embedPng(logoBytes);
            }
            
            this.embeddedImages.logos.push(embeddedLogo);
            console.log(`Logo ${i + 1} embedded successfully`);
          } else {
            this.embeddedImages.logos.push(null);
          }
        } catch (error) {
          console.error(`Error embedding logo ${i + 1}:`, error);
          this.embeddedImages.logos.push(null); // Placeholder for failed logo
        }
      }
    }
  }

  async generateCompleteBinder({ project, documents, structure, logos }) {
    try {
      await this.initialize();
      
      console.log('Starting PDF binder generation...');
      console.log('Project:', project?.title);
      console.log('Documents:', documents?.length || 0);
      console.log('Sections:', structure?.sections?.length || 0);
      console.log('Logos:', logos?.length || 0);

      if (!documents || documents.length === 0) {
        throw new Error('No documents found to include in the binder');
      }

      // Embed images first
      await this.embedImages(project, logos);

      // Create numbered structure for consistent ordering
      const numberedStructure = this.createNumberedStructure(documents, structure);
      
      // Generate cover page (matches HTML exactly)
      await this.generateCoverPage(project, logos);
      
      // Generate simple table of contents as second page
      await this.generateSimpleTableOfContents(project, numberedStructure, logos);
      
      // Add all documents after cover and TOC
      const documentPageInfo = await this.addDocumentsInOrder(numberedStructure);
      
      // Skip bookmarks for now to avoid stack overflow
      console.log('Skipping bookmarks to avoid circular reference issues');
      
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
        result.orderedItems.push({
          type: 'document',
          item: numberedDoc,
          section: 'Additional Documents'
        });
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
        const subsectionIndex = Object.keys(parentSection.subsections).length;
        const subsectionNumber = `${parentSection.number}.${subsectionIndex + 1}`;
        
        parentSection.subsections[subsection.id] = {
          ...subsection,
          number: subsectionNumber,
          displayNumber: subsectionNumber,
          documents: []
        };
      }
    });

    // Assign documents to sections/subsections
    documents.forEach(doc => {
      if (!doc.section_id) {
        // Unorganized document
        const numberedDoc = {
          ...doc,
          number: result.unorganized.length + 1,
          displayNumber: (result.unorganized.length + 1).toString()
        };
        result.unorganized.push(numberedDoc);
      } else {
        // Try to find in main sections first
        const section = result.sections[doc.section_id];
        if (section) {
          const docNumber = `${section.displayNumber}.${section.documents.length + 1}`;
          section.documents.push({
            ...doc,
            number: docNumber,
            displayNumber: docNumber
          });
        } else {
          // Check subsections
          for (const sectionId of Object.keys(result.sections)) {
            const subsection = result.sections[sectionId].subsections[doc.section_id];
            if (subsection) {
              const docNumber = `${subsection.displayNumber}.${subsection.documents.length + 1}`;
              subsection.documents.push({
                ...doc,
                number: docNumber,
                displayNumber: docNumber
              });
              break;
            }
          }
        }
      }
    });

    // Create ordered list for TOC and document insertion (MATCHES HTML ORDER)
    Object.values(result.sections).forEach(section => {
      // Add section documents
      section.documents.forEach(doc => {
        result.orderedItems.push({
          type: 'document',
          item: doc,
          section: section.name,
          sectionNumber: section.displayNumber
        });
      });
      
      // Add subsection documents
      Object.values(section.subsections).forEach(subsection => {
        subsection.documents.forEach(doc => {
          result.orderedItems.push({
            type: 'document',
            item: doc,
            section: section.name,
            subsection: subsection.name,
            sectionNumber: section.displayNumber,
            subsectionNumber: subsection.displayNumber
          });
        });
      });
    });

    // Add unorganized documents
    result.unorganized.forEach(doc => {
      result.orderedItems.push({
        type: 'document',
        item: doc,
        section: 'Additional Documents'
      });
    });

    console.log('Numbered structure created with', result.orderedItems.length, 'items');
    return result;
  }

  async generateCoverPage(project, logos) {
    console.log('Generating cover page (matching HTML format)...');
    
    const page = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    let yPosition = this.pageHeight - this.margin;

    // Header Section with Border (matches HTML)
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

    // Property Description (with line breaks preserved)
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

    // Generation Date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const dateText = `Prepared on ${currentDate}`;
    const dateWidth = this.measureText(dateText, this.fonts.helvetica, 10);
    page.drawText(dateText, {
      x: (this.pageWidth - dateWidth) / 2,
      y: headerBottom + 10,
      size: 10,
      font: this.fonts.helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Draw header border
    page.drawLine({
      start: { x: this.margin, y: headerBottom },
      end: { x: this.pageWidth - this.margin, y: headerBottom },
      thickness: 2,
      color: rgb(0, 0, 0)
    });

    yPosition = headerBottom - 30;

    // Property Photo Section (with actual image if available)
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
    } else if (project?.cover_photo_url || project?.property_photo_url) {
      // Fallback placeholder if image couldn't be loaded
      page.drawRectangle({
        x: this.pageWidth / 2 - 150,
        y: yPosition - 100,
        width: 300,
        height: 80,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1
      });
      
      const photoText = 'Property Photo (Could not load image)';
      const photoTextWidth = this.measureText(photoText, this.fonts.helvetica, 10);
      page.drawText(photoText, {
        x: (this.pageWidth - photoTextWidth) / 2,
        y: yPosition - 65,
        size: 10,
        font: this.fonts.helvetica,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      yPosition -= 120;
    }

    // Transaction Details - EXACTLY like HTML (centered, separate lines)
    if (project?.purchase_price) {
      const priceText = `Purchase Price: $${project.purchase_price.toLocaleString()}`;
      const priceWidth = this.measureText(priceText, this.fonts.timesBold, 16);
      page.drawText(priceText, {
        x: (this.pageWidth - priceWidth) / 2,
        y: yPosition,
        size: 16,
        font: this.fonts.timesBold,
        color: rgb(0, 0, 0)
      });
      yPosition -= 25;
    }

    if (project?.closing_date) {
      const dateText = `Closing Date: ${new Date(project.closing_date).toLocaleDateString()}`;
      const dateTextWidth = this.measureText(dateText, this.fonts.timesBold, 16);
      page.drawText(dateText, {
        x: (this.pageWidth - dateTextWidth) / 2,
        y: yPosition,
        size: 16,
        font: this.fonts.timesBold,
        color: rgb(0, 0, 0)
      });
      yPosition -= 40;
    }

    // Transaction Parties and Service Providers (two columns like HTML)
    const parties = this.getTransactionParties(project);
    if (parties.length > 0) {
      // Transaction Parties Header
      page.drawText('Transaction Parties', {
        x: this.margin,
        y: yPosition,
        size: 14,
        font: this.fonts.helveticaBold,
        color: rgb(0, 0, 0)
      });

      // Service Providers Header
      page.drawText('Service Providers', {
        x: this.pageWidth / 2 + 20,
        y: yPosition,
        size: 14,
        font: this.fonts.helveticaBold,
        color: rgb(0, 0, 0)
      });

      yPosition -= 25;

      // Split parties into transaction parties and service providers
      const transactionParties = parties.filter(p => 
        p.includes('Buyer:') || p.includes('Seller:') || p.includes('Attorney:') || p.includes('Real Estate Agent:')
      );
      
      const serviceProviders = parties.filter(p => 
        p.includes('Lender:') || p.includes('Title Company:') || p.includes('Escrow Agent:')
      );

      const maxRows = Math.max(transactionParties.length, serviceProviders.length);
      
      for (let i = 0; i < maxRows; i++) {
        if (i < transactionParties.length) {
          page.drawText(transactionParties[i], {
            x: this.margin,
            y: yPosition,
            size: 11,
            font: this.fonts.helvetica,
            color: rgb(0.2, 0.2, 0.2)
          });
        }
        
        if (i < serviceProviders.length) {
          page.drawText(serviceProviders[i], {
            x: this.pageWidth / 2 + 20,
            y: yPosition,
            size: 11,
            font: this.fonts.helvetica,
            color: rgb(0.2, 0.2, 0.2)
          });
        }
        
        yPosition -= 18;
      }
      
      yPosition -= 20;
    }

    // Company Logos Section (with actual logos if available)
    if (this.embeddedImages.logos && this.embeddedImages.logos.length > 0) {
      const logoWidth = 120;
      const logoHeight = 60;
      const logoSpacing = (this.pageWidth - (this.margin * 2) - (logoWidth * Math.min(3, this.embeddedImages.logos.length))) / Math.max(1, Math.min(3, this.embeddedImages.logos.length) - 1);
      
      let logoX = this.margin;
      
      for (let i = 0; i < Math.min(3, this.embeddedImages.logos.length); i++) {
        const logo = this.embeddedImages.logos[i];
        
        if (logo) {
          // Draw actual logo
          const logoDims = logo.scale(1);
          const scaleX = logoWidth / logoDims.width;
          const scaleY = logoHeight / logoDims.height;
          const scale = Math.min(scaleX, scaleY);
          
          const scaledWidth = logoDims.width * scale;
          const scaledHeight = logoDims.height * scale;
          
          page.drawImage(logo, {
            x: logoX + (logoWidth - scaledWidth) / 2,
            y: yPosition - logoHeight + (logoHeight - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else {
          // Draw placeholder box for failed logo
          page.drawRectangle({
            x: logoX,
            y: yPosition - logoHeight,
            width: logoWidth,
            height: logoHeight,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 1
          });
          
          const logoText = `Logo ${i + 1}`;
          const logoTextWidth = this.measureText(logoText, this.fonts.helvetica, 10);
          page.drawText(logoText, {
            x: logoX + (logoWidth - logoTextWidth) / 2,
            y: yPosition - logoHeight / 2,
            size: 10,
            font: this.fonts.helvetica,
            color: rgb(0.5, 0.5, 0.5)
          });
        }
        
        logoX += logoWidth + logoSpacing;
      }
    } else if (logos && logos.length > 0) {
      // Fallback to placeholder boxes if logos couldn't be loaded
      const logoWidth = 120;
      const logoHeight = 60;
      const logoSpacing = (this.pageWidth - (this.margin * 2) - (logoWidth * Math.min(3, logos.length))) / Math.max(1, Math.min(3, logos.length) - 1);
      
      let logoX = this.margin;
      
      for (let i = 0; i < Math.min(3, logos.length); i++) {
        page.drawRectangle({
          x: logoX,
          y: yPosition - logoHeight,
          width: logoWidth,
          height: logoHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1
        });
        
        const logoText = `Logo ${i + 1} (Could not load)`;
        const logoTextWidth = this.measureText(logoText, this.fonts.helvetica, 8);
        page.drawText(logoText, {
          x: logoX + (logoWidth - logoTextWidth) / 2,
          y: yPosition - logoHeight / 2,
          size: 8,
          font: this.fonts.helvetica,
          color: rgb(0.5, 0.5, 0.5)
        });
        
        logoX += logoWidth + logoSpacing;
      }
    }

    console.log('Cover page generated (matches HTML format)');
  }

  async generateSimpleTableOfContents(project, numberedStructure, logos) {
    console.log('Generating simple table of contents...');
    
    const tocPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    let yPosition = this.pageHeight - this.margin;

    // Company Logos (if available) - simple placeholder approach
    if (logos && logos.length > 0) {
      const logoHeight = 40;
      yPosition -= logoHeight + 20;
    }

    // TOC Title
    const tocTitle = 'TABLE OF CONTENTS';
    const tocTitleWidth = this.measureText(tocTitle, this.fonts.timesBold, 20);
    tocPage.drawText(tocTitle, {
      x: (this.pageWidth - tocTitleWidth) / 2,
      y: yPosition,
      size: 20,
      font: this.fonts.timesBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= 25;

    // Project title and address (matching HTML)
    if (project?.title) {
      const titleWidth = this.measureText(project.title, this.fonts.helvetica, 14);
      tocPage.drawText(project.title, {
        x: (this.pageWidth - titleWidth) / 2,
        y: yPosition,
        size: 14,
        font: this.fonts.helvetica,
        color: rgb(0.3, 0.3, 0.3)
      });
      yPosition -= 20;
    }

    if (project?.property_address) {
      const address = this.formatPropertyAddress(project);
      const addressWidth = this.measureText(address, this.fonts.helvetica, 12);
      tocPage.drawText(address, {
        x: (this.pageWidth - addressWidth) / 2,
        y: yPosition,
        size: 12,
        font: this.fonts.helvetica,
        color: rgb(0.4, 0.4, 0.4)
      });
      yPosition -= 40;
    }

    // Simple document entries - we'll calculate page numbers after documents are added
    let pageNum = 3; // Cover + TOC = 2 pages, documents start on page 3
    numberedStructure.orderedItems.forEach((item, index) => {
      const doc = item.item;
      
      const entryText = `${doc.displayNumber}. ${doc.original_name || doc.name}`;
      const pageNumberText = pageNum.toString();
      
      // Truncate long document names to fit
      const maxWidth = this.pageWidth - this.margin * 2 - 50;
      const truncatedText = this.truncateText(entryText, this.fonts.helvetica, 10, maxWidth);
      
      // Draw document name
      tocPage.drawText(truncatedText, {
        x: this.margin,
        y: yPosition,
        size: 10,
        font: this.fonts.helvetica,
        color: rgb(0, 0, 0)
      });
      
      // Draw dotted line
      const dotsStart = this.margin + this.measureText(truncatedText, this.fonts.helvetica, 10) + 10;
      const dotsEnd = this.pageWidth - this.margin - this.measureText(pageNumberText, this.fonts.helvetica, 10) - 10;
      this.drawDottedLine(tocPage, dotsStart, dotsEnd, yPosition + 2);
      
      // Draw page number (right aligned)
      const pageNumWidth = this.measureText(pageNumberText, this.fonts.helvetica, 10);
      tocPage.drawText(pageNumberText, {
        x: this.pageWidth - this.margin - pageNumWidth,
        y: yPosition,
        size: 10,
        font: this.fonts.helvetica,
        color: rgb(0, 0, 0)
      });

      yPosition -= 15;
      pageNum += 1; // Assume each document is 1 page for simplicity
    });

    // Footer (matching HTML)
    const footerY = this.margin + 40;
    const generateDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const generatedText = `Generated: ${generateDate}`;
    const totalDocsText = `Total Documents: ${numberedStructure.orderedItems.length}`;
    
    tocPage.drawText(generatedText, {
      x: this.margin,
      y: footerY,
      size: 9,
      font: this.fonts.helvetica,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    const totalWidth = this.measureText(totalDocsText, this.fonts.helvetica, 9);
    tocPage.drawText(totalDocsText, {
      x: this.pageWidth - this.margin - totalWidth,
      y: footerY,
      size: 9,
      font: this.fonts.helvetica,
      color: rgb(0.4, 0.4, 0.4)
    });

    console.log('Simple table of contents generated');
  }

  async addDocumentsInOrder(numberedStructure) {
    console.log('Adding', numberedStructure.orderedItems.length, 'documents to PDF...');
    
    const documentPageInfo = [];
    
    for (let i = 0; i < numberedStructure.orderedItems.length; i++) {
      const item = numberedStructure.orderedItems[i];
      const doc = item.item;
      
      try {
        console.log(`Processing document ${i + 1}/${numberedStructure.orderedItems.length}: ${doc.name}`);
        
        // Record the starting page (before adding document)
        const startPageIndex = this.pdfDoc.getPageCount();
        
        // Get document URL
        let documentUrl;
        if (doc.storage_path) {
          const baseUrl = process.env.REACT_APP_SUPABASE_URL;
          documentUrl = `${baseUrl}/storage/v1/object/public/documents/${doc.storage_path}`;
        } else if (doc.file_url) {
          documentUrl = doc.file_url;
        } else {
          console.warn(`Document ${doc.name} has no URL, creating placeholder`);
          this.createPlaceholderPage(doc, 'No document URL available');
          documentPageInfo.push({
            document: doc,
            startPageIndex: startPageIndex,
            pageCount: 1,
            displayNumber: doc.displayNumber
          });
          continue;
        }

        // Fetch document
        console.log(`Fetching: ${documentUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(documentUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const documentBytes = await response.arrayBuffer();
        
        if (documentBytes.byteLength === 0) {
          throw new Error('Document is empty');
        }
        
        const documentPdf = await PDFDocument.load(documentBytes);
        const pageIndices = documentPdf.getPageIndices();
        
        if (pageIndices.length === 0) {
          throw new Error('Document has no pages');
        }
        
        // Copy all pages from the document
        const pages = await this.pdfDoc.copyPages(documentPdf, pageIndices);
        
        // Add all pages to our document
        pages.forEach(page => {
          this.pdfDoc.addPage(page);
        });
        
        // Record document info for TOC and bookmarks
        documentPageInfo.push({
          document: doc,
          startPageIndex: startPageIndex,
          pageCount: pages.length,
          displayNumber: doc.displayNumber
        });
        
        console.log(`Added document: ${doc.name} (${pages.length} pages)`);
        
      } catch (error) {
        console.error(`Error processing document ${doc.name}:`, error.message);
        
        // Add a placeholder page with error message
        const startPageIndex = this.pdfDoc.getPageCount();
        this.createPlaceholderPage(doc, error.message);
        documentPageInfo.push({
          document: doc,
          startPageIndex: startPageIndex,
          pageCount: 1,
          displayNumber: doc.displayNumber
        });
      }
    }
    
    console.log('Document processing completed');
    return documentPageInfo;
  }

  drawDottedLine(page, startX, endX, y) {
    const dotSpacing = 3;
    for (let x = startX; x < endX; x += dotSpacing) {
      page.drawText('.', {
        x: x,
        y: y,
        size: 8,
        font: this.fonts.helvetica,
        color: rgb(0.5, 0.5, 0.5)
      });
    }
  }

  createPlaceholderPage(doc, errorMessage) {
    const errorPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    
    errorPage.drawText(`Error Loading Document`, {
      x: this.margin,
      y: this.pageHeight - this.margin - 50,
      size: 16,
      font: this.fonts.helveticaBold,
      color: rgb(0.8, 0, 0)
    });
    
    errorPage.drawText(`Document: ${doc.name}`, {
      x: this.margin,
      y: this.pageHeight - this.margin - 80,
      size: 12,
      font: this.fonts.helvetica,
      color: rgb(0, 0, 0)
    });
    
    errorPage.drawText(`Error: ${errorMessage}`, {
      x: this.margin,
      y: this.pageHeight - this.margin - 110,
      size: 10,
      font: this.fonts.helvetica,
      color: rgb(0.5, 0, 0)
    });
  }

  // Helper methods
  measureText(text, font, size) {
    try {
      return font.widthOfTextAtSize(text, size);
    } catch (error) {
      return text.length * size * 0.6;
    }
  }

  truncateText(text, font, size, maxWidth) {
    if (this.measureText(text, font, size) <= maxWidth) {
      return text;
    }
    
    let truncated = text;
    while (this.measureText(truncated + '...', font, size) > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  formatPropertyAddress(project) {
    const parts = [];
    if (project.property_address) parts.push(project.property_address);
    if (project.city) parts.push(project.city);
    if (project.state) parts.push(project.state);
    if (project.zip_code) parts.push(project.zip_code);
    return parts.join(', ');
  }

  getTransactionParties(project) {
    const parties = [];
    if (project?.buyer && project.buyer !== 'Not specified') {
      parties.push(`Buyer: ${project.buyer}`);
    }
    if (project?.seller && project.seller !== 'Not specified') {
      parties.push(`Seller: ${project.seller}`);
    }
    if (project?.attorney && project.attorney !== 'Not specified') {
      parties.push(`Attorney: ${project.attorney}`);
    }
    if (project?.real_estate_agent && project.real_estate_agent !== 'Not specified') {
      parties.push(`Real Estate Agent: ${project.real_estate_agent}`);
    }
    if (project?.lender && project.lender !== 'Not specified') {
      parties.push(`Lender: ${project.lender}`);
    }
    if (project?.title_company && project.title_company !== 'Not specified') {
      parties.push(`Title Company: ${project.title_company}`);
    }
    if (project?.escrow_agent && project.escrow_agent !== 'Not specified') {
      parties.push(`Escrow Agent: ${project.escrow_agent}`);
    }
    return parties;
  }

  async drawMultiLineText(page, text, x, y, maxWidth, fontSize, font, color, align = 'left') {
    const lines = text.split('\n');
    let currentY = y;
    
    for (const line of lines) {
      if (line.trim()) {
        const textWidth = this.measureText(line, font, fontSize);
        let textX = x;
        
        if (align === 'center') {
          textX = x + (maxWidth - textWidth) / 2;
        } else if (align === 'right') {
          textX = x + maxWidth - textWidth;
        }
        
        page.drawText(line, {
          x: Math.max(x, textX),
          y: currentY,
          size: fontSize,
          font: font,
          color: color
        });
      }
      currentY -= fontSize + 4;
    }
    
    return currentY;
  }
}

// Export the generator function
export const generatePDFBinder = async ({ project, documents, structure, logos }) => {
  const generator = new PDFBinderGenerator();
  return await generator.generateCompleteBinder({ project, documents, structure, logos });
};