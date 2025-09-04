// ===============================
// FILE: src/utils/pdfMerger.js
// FIXED PDF merging utilities with WORKING bookmarks and internal links
// ===============================

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, rgb, StandardFonts } from 'pdf-lib';

export class PDFMerger {
  constructor() {
    this.finalDoc = null;
    this.pageOffsets = [];
    this.bookmarks = [];
    this.documentBookmarks = new Map();
    this.tocPageRef = null;
    this.helveticaFont = null;
  }

  async initialize() {
    this.finalDoc = await PDFDocument.create();
    this.pageOffsets = [];
    this.bookmarks = [];
    this.documentBookmarks.clear();
    this.tocPageRef = null;
    // Embed font for "Back to TOC" button text
    this.helveticaFont = await this.finalDoc.embedFont(StandardFonts.Helvetica);
  }

  async addPdfFromBlob(pdfBlob, title, isFirstLevel = true, pageNumber = null) {
    try {
      // Validate blob first
      if (!pdfBlob || typeof pdfBlob.arrayBuffer !== 'function') {
        throw new Error('Invalid PDF blob provided');
      }

      if (pdfBlob.size === 0) {
        throw new Error('PDF blob is empty');
      }

      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('PDF arrayBuffer is empty or invalid');
      }

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
          capNumbers: false,
          throwOnInvalidObject: false
        });
      } catch (loadError) {
        console.error('PDF loading failed:', loadError);
        throw new Error(`Failed to load PDF "${title}": ${loadError.message}`);
      }

      if (!pdfDoc) {
        throw new Error('PDF document could not be loaded');
      }

      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        throw new Error(`PDF "${title}" contains no pages`);
      }

      // Get current page count for offset calculation
      const currentPageCount = this.finalDoc.getPageCount();
      
      let copiedPages;
      try {
        const pageIndices = pdfDoc.getPageIndices();
        copiedPages = await this.finalDoc.copyPages(pdfDoc, pageIndices);
      } catch (copyError) {
        console.error('Page copying failed:', copyError);
        throw new Error(`Failed to copy pages from "${title}": ${copyError.message}`);
      }

      if (!copiedPages || copiedPages.length === 0) {
        throw new Error(`No pages were copied from "${title}"`);
      }
      
      // Add copied pages to final document and create destinations/bookmarks
      copiedPages.forEach((page, index) => {
        try {
          this.finalDoc.addPage(page);
          const finalPageIndex = currentPageCount + index;
          const finalPageNumber = finalPageIndex + 1; // 1-based
          
          // Create named destination for the first page of each document (for TOC linking)
          if (index === 0 && title !== 'Cover Page' && title !== 'Table of Contents') {
            const destName = `doc_${title.replace(/[^a-zA-Z0-9]/g, '_')}`;
            this.createNamedDestination(destName, finalPageIndex);
          }

          // Store TOC page reference for "Back to TOC" links
          if (title === 'Table of Contents' && index === 0) {
            this.tocPageRef = finalPageNumber; // Store 1-based page number
            this.createNamedDestination('toc', finalPageIndex);
          }
          
        } catch (addError) {
          console.error(`Failed to add page ${index + 1} from "${title}":`, addError);
        }
      });

      // NOW add "Back to TOC" buttons AFTER pages are added to final document
      if (title !== 'Cover Page' && title !== 'Table of Contents' && this.tocPageRef) {
        for (let i = 0; i < copiedPages.length; i++) {
          const finalPageIndex = currentPageCount + i;
          await this.addBackToTocButton(finalPageIndex);
        }
      }
      
      // Store page offset for bookmarks
      const pageOffset = {
        title,
        startPage: currentPageCount,
        pageCount: copiedPages.length,
        isFirstLevel,
        specifiedPageNumber: pageNumber
      };
      
      this.pageOffsets.push(pageOffset);

      // Store document bookmark info
      if (currentPageCount < this.finalDoc.getPageCount()) {
        this.documentBookmarks.set(title, {
          pageNumber: currentPageCount + 1, // 1-based page numbering
          destName: title !== 'Cover Page' && title !== 'Table of Contents' ? 
            `doc_${title.replace(/[^a-zA-Z0-9]/g, '_')}` : null
        });
      }

      console.log(`Successfully added PDF "${title}" with ${copiedPages.length} pages`);

      return {
        success: true,
        startPage: currentPageCount,
        pageCount: copiedPages.length
      };
    } catch (error) {
      console.error(`Error adding PDF "${title}":`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createNamedDestination(destName, pageIndex) {
    try {
      const page = this.finalDoc.getPage(pageIndex);
      if (!page) {
        console.warn(`Cannot create destination ${destName}: page ${pageIndex} not found`);
        return;
      }

      // Get or create the Names dictionary in the catalog
      const catalog = this.finalDoc.catalog;
      let names = catalog.get(PDFName.of('Names'));
      if (!names) {
        names = this.finalDoc.context.obj({});
        catalog.set(PDFName.of('Names'), names);
      }

      // Get or create the Dests dictionary
      let dests = names.get(PDFName.of('Dests'));
      if (!dests) {
        dests = this.finalDoc.context.obj({});
        names.set(PDFName.of('Dests'), dests);
      }

      // Get or create the Names array for destinations
      let destNames = dests.get(PDFName.of('Names'));
      if (!destNames) {
        destNames = this.finalDoc.context.obj([]);
        dests.set(PDFName.of('Names'), destNames);
      }

      // Create destination array [page, /XYZ, left, top, zoom]
      const destArray = this.finalDoc.context.obj([
        page.ref,
        PDFName.of('XYZ'),
        null, // left
        null, // top  
        null  // zoom
      ]);

      // Add to Names array: [name, destination, name, destination, ...]
      destNames.push(this.finalDoc.context.obj(destName));
      destNames.push(destArray);
      
      console.log(`Created named destination: ${destName} -> page ${pageIndex + 1}`);
    } catch (error) {
      console.warn(`Failed to create named destination ${destName}:`, error);
    }
  }

  async addBackToTocButton(pageIndex) {
    try {
      if (!this.tocPageRef) {
        console.warn('No TOC page reference available for back link');
        return;
      }

      const page = this.finalDoc.getPage(pageIndex);
      if (!page) {
        console.warn(`Cannot add back button: page ${pageIndex} not found`);
        return;
      }

      const { width, height } = page.getSize();
      
      // Button dimensions and position (top-right corner)
      const buttonWidth = 90;
      const buttonHeight = 25;
      const buttonX = width - buttonWidth - 15;
      const buttonY = height - buttonHeight - 15;

      // Draw the button background
      page.drawRectangle({
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });

      // Draw the button text
      page.drawText('← Back to TOC', {
        x: buttonX + 8,
        y: buttonY + 8,
        size: 9,
        font: this.helveticaFont,
        color: rgb(0, 0.4, 0.8),
      });

      // Create a MUCH simpler link annotation that actually works
      const tocPage = this.finalDoc.getPage(this.tocPageRef - 1); // Convert to 0-based
      if (!tocPage) {
        console.warn('TOC page not found for back link');
        return;
      }

      const linkDict = PDFDict.withContext(this.finalDoc.context);
      linkDict.set(PDFName.of('Type'), PDFName.of('Annot'));
      linkDict.set(PDFName.of('Subtype'), PDFName.of('Link'));
      linkDict.set(PDFName.of('Rect'), PDFArray.withContext(this.finalDoc.context, [
        this.finalDoc.context.obj(buttonX),
        this.finalDoc.context.obj(buttonY),
        this.finalDoc.context.obj(buttonX + buttonWidth),
        this.finalDoc.context.obj(buttonY + buttonHeight)
      ]));
      
      // Simple direct page reference (more reliable than named destinations)
      const destArray = PDFArray.withContext(this.finalDoc.context);
      destArray.push(tocPage.ref);
      destArray.push(PDFName.of('XYZ'));
      destArray.push(this.finalDoc.context.obj(0));    // left
      destArray.push(this.finalDoc.context.obj(792));  // top
      destArray.push(this.finalDoc.context.obj(0));    // zoom

      linkDict.set(PDFName.of('Dest'), destArray);
      linkDict.set(PDFName.of('Border'), PDFArray.withContext(this.finalDoc.context, [
        this.finalDoc.context.obj(0),
        this.finalDoc.context.obj(0),
        this.finalDoc.context.obj(0)
      ]));

      // Add to page annotations
      let annots = page.node.get(PDFName.of('Annots'));
      if (!annots) {
        annots = PDFArray.withContext(this.finalDoc.context);
        page.node.set(PDFName.of('Annots'), annots);
      }
      
      const linkRef = this.finalDoc.context.register(linkDict);
      annots.push(linkRef);

      console.log(`Added back to TOC link on page ${pageIndex + 1} -> TOC page ${this.tocPageRef}`);
    } catch (error) {
      console.warn(`Failed to add back to TOC link on page ${pageIndex + 1}:`, error);
    }
  }

  async addPdfFromUrl(pdfUrl, title, isFirstLevel = true, pageNumber = null) {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const pdfBlob = await response.blob();
      return await this.addPdfFromBlob(pdfBlob, title, isFirstLevel, pageNumber);
    } catch (error) {
      console.error('Error fetching and adding PDF:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createBookmarks() {
    try {
      if (!this.pageOffsets.length) return;

      const bookmarkRefs = [];
      const bookmarkObjects = [];

      // Create bookmark objects for each section
      this.pageOffsets.forEach((offset, index) => {
        const bookmarkRef = this.finalDoc.context.nextRef();
        bookmarkRefs.push(bookmarkRef);

        const page = this.finalDoc.getPage(offset.startPage);
        const destArray = this.finalDoc.context.obj([
          page.ref,
          PDFName.of('XYZ'),
          null,
          null,
          null
        ]);

        const bookmarkDict = this.finalDoc.context.obj({
          Title: this.finalDoc.context.obj(offset.title),
          Dest: destArray
        });

        // Set parent/child relationships
        if (index > 0) {
          bookmarkDict.set(PDFName.of('Prev'), bookmarkRefs[index - 1]);
        }
        if (index < this.pageOffsets.length - 1) {
          bookmarkDict.set(PDFName.of('Next'), bookmarkRefs[index + 1]);
        }

        bookmarkObjects.push({
          ref: bookmarkRef,
          dict: bookmarkDict
        });
      });

      // Create outline root
      if (bookmarkObjects.length > 0) {
        const outlineRef = this.finalDoc.context.nextRef();
        const outlineDict = this.finalDoc.context.obj({
          Type: 'Outlines',
          Count: bookmarkObjects.length,
          First: bookmarkObjects[0].ref,
          Last: bookmarkObjects[bookmarkObjects.length - 1].ref
        });

        // Set parent references for bookmarks
        bookmarkObjects.forEach(bookmark => {
          bookmark.dict.set(PDFName.of('Parent'), outlineRef);
        });

        // Register all objects
        this.finalDoc.context.assign(outlineRef, outlineDict);
        bookmarkObjects.forEach(bookmark => {
          this.finalDoc.context.assign(bookmark.ref, bookmark.dict);
        });

        // Set outline in catalog
        const catalog = this.finalDoc.catalog;
        catalog.set(PDFName.of('Outlines'), outlineRef);
      }

    } catch (error) {
      console.error('Error creating bookmarks:', error);
    }
  }

  async finalize() {
    try {
      // Create bookmarks for navigation
      this.createBookmarks();

      // Set document metadata
      this.finalDoc.setTitle('Closing Binder');
      this.finalDoc.setCreator('Closing Binder Generator');
      this.finalDoc.setProducer('pdf-lib');
      this.finalDoc.setCreationDate(new Date());
      this.finalDoc.setModificationDate(new Date());

      let pdfBytes;
      
      try {
        console.log('Attempting normal PDF save...');
        pdfBytes = await this.finalDoc.save();
      } catch (error) {
        console.warn('Normal save failed, trying with minimal options:', error.message);
        
        try {
          pdfBytes = await this.finalDoc.save({
            useObjectStreams: false,
            addDefaultPage: false,
            objectsPerTick: 50
          });
        } catch (error2) {
          console.warn('Minimal options save failed, trying compatibility mode:', error2.message);
          
          try {
            const compatDoc = await PDFDocument.create();
            const pageCount = this.finalDoc.getPageCount();
            
            const batchSize = 5;
            for (let i = 0; i < pageCount; i += batchSize) {
              const endIndex = Math.min(i + batchSize, pageCount);
              const pageIndices = Array.from({ length: endIndex - i }, (_, idx) => i + idx);
              
              console.log(`Copying pages ${i + 1}-${endIndex} of ${pageCount}`);
              const copiedPages = await compatDoc.copyPages(this.finalDoc, pageIndices);
              copiedPages.forEach(page => compatDoc.addPage(page));
            }
            
            pdfBytes = await compatDoc.save({
              useObjectStreams: false,
              addDefaultPage: false
            });
            
            console.log('Compatibility mode save successful');
          } catch (error3) {
            console.error('All save methods failed:', {
              normal: error.message,
              minimal: error2.message,
              compatibility: error3.message
            });
            throw new Error(`PDF finalization failed: ${error3.message}`);
          }
        }
      }

      console.log('PDF finalization successful:', {
        bytesLength: pdfBytes.length,
        pageCount: this.getPageCount()
      });

      return new Uint8Array(pdfBytes);
    } catch (error) {
      console.error('Error finalizing PDF:', error);
      throw error;
    }
  }

  getPageCount() {
    return this.finalDoc ? this.finalDoc.getPageCount() : 0;
  }

  getBookmarkInfo() {
    return this.pageOffsets.map(offset => ({
      title: offset.title,
      startPage: offset.startPage + 1,
      pageCount: offset.pageCount
    }));
  }

  getDocumentBookmarks() {
    return this.documentBookmarks;
  }
}

// Utility functions remain the same
export const downloadPDF = (pdfBytes, filename) => {
  try {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return false;
  }
};

export const generateDocumentUrl = async (document) => {
  try {
    if (document.file_url && typeof document.file_url === 'string' && document.file_url.trim()) {
      console.log('Using existing file_url:', document.file_url);
      return document.file_url;
    }

    if (document.file_path && document.bucket_name) {
      const { supabase } = await import('../lib/supabase');
      
      console.log('Generating signed URL for path:', document.file_path);

      const { data, error } = supabase.storage
        .from(document.bucket_name)
        .createSignedUrl(document.file_path, 3600);

      if (error) {
        console.error('Error generating signed URL:', error);
        const publicData = supabase.storage
          .from(document.bucket_name)
          .getPublicUrl(document.file_path);
        return publicData.data?.publicUrl || null;
      }

      return data?.signedUrl || null;
    }

    console.warn('Document missing both file_url and file_path/bucket_name:', document);
    return null;
  } catch (error) {
    console.error('Error in generateDocumentUrl:', error);
    return null;
  }
};

export const validatePdfFile = async (file) => {
  try {
    if (file.type !== 'application/pdf') {
      return { isValid: false, error: 'File must be a PDF' };
    }

    if (file.size > 50 * 1024 * 1024) {
      return { isValid: false, error: 'PDF file is too large (max 50MB)' };
    }

    const arrayBuffer = await file.arrayBuffer();
    await PDFDocument.load(arrayBuffer);

    return { isValid: true };
  } catch (error) {
    console.error('PDF validation error:', error);
    return { 
      isValid: false, 
      error: 'Invalid or corrupted PDF file' 
    };
  }
};

export default PDFMerger;