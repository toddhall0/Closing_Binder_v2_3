// ===============================
// FILE: src/utils/PDFNavigationEnhancer.js
// Adds REAL PDF navigation links and "Back to TOC" buttons using pdf-lib
// ===============================

import { PDFDocument, PDFName, PDFArray, PDFDict, StandardFonts, rgb } from 'pdf-lib';

export class PDFNavigationEnhancer {
  constructor() {
    this.pdfDoc = null;
    this.tocPageNumber = null;
    this.documentStartPages = new Map();
  }

  /**
   * Load existing PDF and prepare for navigation enhancement
   */
  async loadPDF(pdfBytes) {
    this.pdfDoc = await PDFDocument.load(pdfBytes);
    return this.pdfDoc;
  }

  /**
   * Set the TOC page number for "Back to TOC" links
   */
  setTOCPageNumber(pageNumber) {
    this.tocPageNumber = pageNumber;
  }

  /**
   * Register a document's starting page for navigation
   */
  registerDocument(documentName, startPageNumber) {
    this.documentStartPages.set(documentName, startPageNumber);
  }

  /**
   * Add "Back to TOC" button to a specific page
   */
  async addBackToTOCButton(pageIndex) {
    if (!this.pdfDoc || !this.tocPageNumber) return;

    const pages = this.pdfDoc.getPages();
    if (pageIndex >= pages.length) return;

    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    
    // Font for the button text
    const helveticaFont = await this.pdfDoc.embedFont(StandardFonts.Helvetica);

    // Button dimensions and position
    const buttonWidth = 90;
    const buttonHeight = 25;
    const buttonX = width - buttonWidth - 15;
    const buttonY = height - buttonHeight - 15;

    // Draw button background
    page.drawRectangle({
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    // Draw button text
    page.drawText('← Back to TOC', {
      x: buttonX + 8,
      y: buttonY + 8,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0.4, 0.8),
    });

    // Create the actual clickable link annotation
    const linkAnnotation = this.pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [buttonX, buttonY, buttonX + buttonWidth, buttonY + buttonHeight],
      A: {
        Type: 'Action',
        S: 'GoTo',
        D: [this.pdfDoc.getPages()[this.tocPageNumber - 1].ref, 'XYZ', null, null, null]
      },
      Border: [0, 0, 0],
      H: 'I',
    });

    // Add annotation to the page
    const existingAnnots = page.node.Annots();
    const annots = existingAnnots || this.pdfDoc.context.obj([]);
    
    if (existingAnnots) {
      annots.push(linkAnnotation);
    } else {
      page.node.set(PDFName.of('Annots'), this.pdfDoc.context.obj([linkAnnotation]));
    }

    console.log(`Added "Back to TOC" button to page ${pageIndex + 1} linking to TOC page ${this.tocPageNumber}`);
  }

  /**
   * Add named destination for a document (for TOC links to work)
   */
  async addNamedDestination(documentName, pageIndex) {
    if (!this.pdfDoc) return;

    const pages = this.pdfDoc.getPages();
    if (pageIndex >= pages.length) return;

    const page = pages[pageIndex];
    const destName = `doc_${documentName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Create named destination
    const destination = this.pdfDoc.context.obj([
      page.ref,
      'XYZ',
      null,
      null,
      null
    ]);

    // Add to document's named destinations
    const catalog = this.pdfDoc.catalog;
    let names = catalog.lookup(PDFName.of('Names'));
    
    if (!names) {
      names = this.pdfDoc.context.obj({});
      catalog.set(PDFName.of('Names'), names);
    }

    let dests = names.lookup(PDFName.of('Dests'));
    
    if (!dests) {
      dests = this.pdfDoc.context.obj({});
      names.set(PDFName.of('Dests'), dests);
    }

    let destNames = dests.lookup(PDFName.of('Names'));
    
    if (!destNames) {
      destNames = this.pdfDoc.context.obj([]);
      dests.set(PDFName.of('Names'), destNames);
    }

    // Add the named destination
    destNames.push(this.pdfDoc.context.obj(destName));
    destNames.push(destination);

    console.log(`Added named destination "${destName}" for page ${pageIndex + 1}`);
  }

  /**
   * Process the entire PDF to add navigation features
   */
  async enhanceNavigation() {
    if (!this.pdfDoc) return;

    const pages = this.pdfDoc.getPages();
    
    // Add "Back to TOC" buttons to all document pages (skip cover and TOC)
    let startPage = 1; // Skip cover page
    if (this.tocPageNumber) {
      startPage = this.tocPageNumber; // Skip TOC page too
    }

    for (let i = startPage; i < pages.length; i++) {
      await this.addBackToTOCButton(i);
    }

    // Add named destinations for each document
    for (const [docName, pageNum] of this.documentStartPages) {
      await this.addNamedDestination(docName, pageNum - 1); // Convert to 0-based index
    }

    console.log(`Enhanced navigation for ${pages.length} pages with ${this.documentStartPages.size} document destinations`);
  }

  /**
   * Get the enhanced PDF bytes
   */
  async getEnhancedPDFBytes() {
    if (!this.pdfDoc) return null;
    
    return await this.pdfDoc.save();
  }
}

/**
 * Function to enhance an existing PDF with navigation features
 */
export const enhancePDFNavigation = async (pdfBytes, navigationConfig) => {
  const enhancer = new PDFNavigationEnhancer();
  
  // Load the PDF
  await enhancer.loadPDF(pdfBytes);
  
  // Set TOC page if provided
  if (navigationConfig.tocPageNumber) {
    enhancer.setTOCPageNumber(navigationConfig.tocPageNumber);
  }
  
  // Register document start pages
  if (navigationConfig.documentStartPages) {
    for (const [docName, pageNum] of navigationConfig.documentStartPages) {
      enhancer.registerDocument(docName, pageNum);
    }
  }
  
  // Enhance navigation
  await enhancer.enhanceNavigation();
  
  // Return enhanced PDF
  return await enhancer.getEnhancedPDFBytes();
};

export default PDFNavigationEnhancer;