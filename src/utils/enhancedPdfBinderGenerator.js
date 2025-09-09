// Simple Enhanced PDF Binder Generator - Focus on TOC formatting
// File: src/utils/enhancedPdfBinderGenerator.js

import { PDFDocument, rgb, PageSizes, StandardFonts } from 'pdf-lib';

export async function generateEnhancedPDFBinder({ project, documents, structure, logos }) {
  console.log('Starting ENHANCED PDF binder generation with improved TOC...');
  
  try {
    const pdfDoc = await PDFDocument.create();
    
    // Load fonts
    const fonts = {
      helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
      helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
    };

    const pageWidth = PageSizes.Letter[0];
    const pageHeight = PageSizes.Letter[1];
    const margin = 50;

    function measureText(text, font, size) {
      return font.widthOfTextAtSize(text, size);
    }

    function formatPropertyAddress(project) {
      const parts = [];
      if (project.property_address) parts.push(project.property_address);
      if (project.property_city) parts.push(project.property_city);
      if (project.property_state) {
        let statePart = project.property_state;
        if (project.property_zip) statePart += ` ${project.property_zip}`;
        parts.push(statePart);
      }
      return parts.join(', ');
    }

    async function loadImageFromUrl(url) {
      try {
        console.log('Attempting to load image from:', url);
        const response = await fetch(url);
        if (!response.ok) {
          console.error('Image fetch failed with status:', response.status);
          throw new Error(`Image fetch failed: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const mimeType = response.headers.get('content-type');
        console.log('Image loaded, content-type:', mimeType, 'size:', arrayBuffer.byteLength);
        
        if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) {
          const image = await pdfDoc.embedJpg(arrayBuffer);
          console.log('JPG image embedded successfully');
          return image;
        } else if (mimeType?.includes('png')) {
          const image = await pdfDoc.embedPng(arrayBuffer);
          console.log('PNG image embedded successfully');
          return image;
        }
        
        console.error('Unsupported image format:', mimeType);
        throw new Error('Unsupported image format');
      } catch (error) {
        console.error('Error loading image from', url, ':', error);
        return null;
      }
    }

    // Debug and validate project data
    console.log('Checking project fields:');
    console.log('- title:', project?.title);
    console.log('- property_address:', project?.property_address);
    console.log('- cover_photo_url:', project?.cover_photo_url);
    console.log('- property_photo_url:', project?.property_photo_url);
    console.log('- property_description:', project?.property_description);
    console.log('- purchase_price:', project?.purchase_price);
    console.log('- closing_date:', project?.closing_date);

    // Generate Cover Page
    console.log('Generating enhanced cover page...');
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    // Title with better fallback
    const title = project?.title || project?.name || 'Closing Binder';
    console.log('Using title:', title);
    const titleWidth = measureText(title, fonts.timesBold, 24);
    coverPage.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: yPosition,
      size: 24,
      font: fonts.timesBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= 40;

    // Property Address
    if (project?.property_address) {
      const address = formatPropertyAddress(project);
      const addressWidth = measureText(address, fonts.helvetica, 16);
      coverPage.drawText(address, {
        x: (pageWidth - addressWidth) / 2,
        y: yPosition,
        size: 16,
        font: fonts.helvetica,
        color: rgb(0.2, 0.2, 0.2)
      });
      yPosition -= 60;
    }

    // Main Property Photo
    if (project?.main_photo_url || project?.cover_photo_url) {
      const photoUrl = project.main_photo_url || project.cover_photo_url;
      const mainPhoto = await loadImageFromUrl(photoUrl);
      if (mainPhoto) {
        const maxPhotoWidth = 300;
        const maxPhotoHeight = 200;
        const photoDims = mainPhoto.scale(
          Math.min(maxPhotoWidth / mainPhoto.width, maxPhotoHeight / mainPhoto.height)
        );
        
        coverPage.drawImage(mainPhoto, {
          x: (pageWidth - photoDims.width) / 2,
          y: yPosition - photoDims.height,
          width: photoDims.width,
          height: photoDims.height
        });
        yPosition -= photoDims.height + 40;
      }
    }

    // Company Logos
    if (logos && logos.length > 0) {
      const logoHeight = 60;
      const logoSpacing = 20;
      const totalLogosWidth = Math.min(logos.length, 3) * 80 + (Math.min(logos.length, 3) - 1) * logoSpacing;
      let logoX = (pageWidth - totalLogosWidth) / 2;

      for (let i = 0; i < Math.min(logos.length, 3); i++) {
        const logo = logos[i];
        const logoWidth = 80;
        
        if (logo.logo_url) {
          const logoImage = await loadImageFromUrl(logo.logo_url);
          if (logoImage) {
            const logoDims = logoImage.scale(
              Math.min(logoWidth / logoImage.width, logoHeight / logoImage.height)
            );
            
            coverPage.drawImage(logoImage, {
              x: logoX + (logoWidth - logoDims.width) / 2,
              y: yPosition - logoHeight + (logoHeight - logoDims.height) / 2,
              width: logoDims.width,
              height: logoDims.height
            });
          }
        }
        
        logoX += logoWidth + logoSpacing;
      }
      yPosition -= logoHeight + 20;
    }

    // Date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const dateWidth = measureText(currentDate, fonts.helvetica, 12);
    coverPage.drawText(currentDate, {
      x: (pageWidth - dateWidth) / 2,
      y: yPosition - 40,
      size: 12,
      font: fonts.helvetica,
      color: rgb(0.4, 0.4, 0.4)
    });

    // Generate ENHANCED Table of Contents
    console.log('Generating ENHANCED table of contents with better formatting...');
    const tocPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;

    // Header with logos (if available)
    if (logos && logos.length > 0) {
      const logoHeight = 30;
      const logoSpacing = 15;
      const totalLogosWidth = Math.min(logos.length, 3) * 60 + (Math.min(logos.length, 3) - 1) * logoSpacing;
      let logoX = (pageWidth - totalLogosWidth) / 2;

      for (let i = 0; i < Math.min(logos.length, 3); i++) {
        const logo = logos[i];
        if (logo.logo_url) {
          const logoImage = await loadImageFromUrl(logo.logo_url);
          if (logoImage) {
            const logoWidth = 60;
            const logoDims = logoImage.scale(
              Math.min(logoWidth / logoImage.width, logoHeight / logoImage.height)
            );
            
            tocPage.drawImage(logoImage, {
              x: logoX + (logoWidth - logoDims.width) / 2,
              y: yPosition - logoHeight + (logoHeight - logoDims.height) / 2,
              width: logoDims.width,
              height: logoDims.height
            });
          }
        }
        logoX += 60 + logoSpacing;
      }
      yPosition -= logoHeight + 30;
    }

    // TOC Title - ENHANCED FORMATTING
    const tocTitle = 'TABLE OF CONTENTS';
    const tocTitleWidth = measureText(tocTitle, fonts.timesBold, 22);
    tocPage.drawText(tocTitle, {
      x: (pageWidth - tocTitleWidth) / 2,
      y: yPosition,
      size: 22,
      font: fonts.timesBold,
      color: rgb(0, 0, 0)
    });
    yPosition -= 35;

    // Project information - BETTER FORMATTING with all project details
    if (project?.title) {
      const titleWidth = measureText(project.title, fonts.helveticaBold, 16);
      tocPage.drawText(project.title, {
        x: (pageWidth - titleWidth) / 2,
        y: yPosition,
        size: 16,
        font: fonts.helveticaBold,
        color: rgb(0.1, 0.1, 0.1)
      });
      yPosition -= 22;
    }

    if (project?.property_address || project?.city || project?.state) {
      const address = formatPropertyAddress(project);
      if (address.trim()) {
        const addressWidth = measureText(address, fonts.helvetica, 13);
        tocPage.drawText(address, {
          x: (pageWidth - addressWidth) / 2,
          y: yPosition,
          size: 13,
          font: fonts.helvetica,
          color: rgb(0.3, 0.3, 0.3)
        });
        yPosition -= 18;
      }
    }

    // Add purchase price and closing date to TOC as well
    if (project?.purchase_price) {
      const priceText = `Purchase Price: ${project.purchase_price.toLocaleString()}`;
      const priceWidth = measureText(priceText, fonts.helvetica, 11);
      tocPage.drawText(priceText, {
        x: (pageWidth - priceWidth) / 2,
        y: yPosition,
        size: 11,
        font: fonts.helvetica,
        color: rgb(0.4, 0.4, 0.4)
      });
      yPosition -= 16;
    }

    if (project?.closing_date) {
      const closingText = `Closing Date: ${new Date(project.closing_date).toLocaleDateString()}`;
      const closingWidth = measureText(closingText, fonts.helvetica, 11);
      tocPage.drawText(closingText, {
        x: (pageWidth - closingWidth) / 2,
        y: yPosition,
        size: 11,
        font: fonts.helvetica,
        color: rgb(0.4, 0.4, 0.4)
      });
      yPosition -= 16;
    }

    yPosition -= 20; // Extra space before document list

    // ENHANCED Document entries with better formatting and clickable links
    let pageNum = 3; // Cover + TOC = 2 pages, documents start on page 3
    let documentNumber = 1;

    // Process sections first
    const sections = structure.sections?.filter(s => s.section_type === 'section') || [];
    
    for (const section of sections) {
      // Section header with enhanced styling
      const sectionText = `${documentNumber}. ${section.section_name || 'Unnamed Section'}`;
      
      // Draw section header with line underneath
      tocPage.drawText(sectionText, {
        x: margin,
        y: yPosition,
        size: 14,
        font: fonts.helveticaBold,
        color: rgb(0, 0, 0)
      });
      
      // Add subtle line under section
      tocPage.drawLine({
        start: { x: margin, y: yPosition - 3 },
        end: { x: pageWidth - margin, y: yPosition - 3 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });
      
      yPosition -= 25;
      documentNumber++;

      // Process subsections
      const subsections = structure.sections?.filter(s => 
        s.parent_section_id === section.id && s.section_type === 'subsection'
      ) || [];
      
      let subCounter = 1;
      for (const subsection of subsections) {
        const subsectionText = `    ${documentNumber - 1}.${subCounter}. ${subsection.section_name || 'Unnamed Subsection'}`;
        
        tocPage.drawText(subsectionText, {
          x: margin + 20,
          y: yPosition,
          size: 12,
          font: fonts.helveticaBold,
          color: rgb(0.2, 0.2, 0.2)
        });
        yPosition -= 20;
        subCounter++;

        // Documents in subsection
        const subsectionDocs = documents.filter(d => d.section_id === subsection.id);
        let docCounter = 1;
        for (const doc of subsectionDocs) {
          const docText = `        ${documentNumber - 1}.${subCounter - 1}.${docCounter}. ${doc.display_name || doc.original_name || 'Unnamed Document'}`;
          const pageText = `Page ${pageNum}`;
          
          // Calculate positions for better alignment
          const textWidth = measureText(docText, fonts.helvetica, 11);
          const pageTextWidth = measureText(pageText, fonts.helvetica, 11);
          
          // Draw document title in BLUE (indicating it's a clickable link)
          tocPage.drawText(docText, {
            x: margin + 40,
            y: yPosition,
            size: 11,
            font: fonts.helvetica,
            color: rgb(0, 0.4, 0.8) // Blue color for links
          });

          // Draw page number
          tocPage.drawText(pageText, {
            x: pageWidth - margin - pageTextWidth,
            y: yPosition,
            size: 11,
            font: fonts.helvetica,
            color: rgb(0.4, 0.4, 0.4)
          });

          // Add dots between title and page number for professional look
          const dotsStart = margin + 40 + textWidth + 10;
          const dotsEnd = pageWidth - margin - pageTextWidth - 10;
          const dotSpacing = 8;
          const numDots = Math.floor((dotsEnd - dotsStart) / dotSpacing);
          
          for (let i = 0; i < numDots; i++) {
            tocPage.drawText('.', {
              x: dotsStart + (i * dotSpacing),
              y: yPosition,
              size: 11,
              font: fonts.helvetica,
              color: rgb(0.6, 0.6, 0.6)
            });
          }

          // CREATE CLICKABLE LINK that opens in new window
          if (doc.file_url) {
            const linkRect = [
              margin + 40,
              yPosition - 3,
              margin + 40 + textWidth,
              yPosition + 14
            ];

            // Create clickable annotation
            const annotation = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: linkRect,
              A: {
                Type: 'Action',
                S: 'URI',
                URI: doc.file_url
              },
              Border: [0, 0, 0], // No border
              H: 'I' // Highlight mode: invert when clicked
            });

            // Add annotation to the page
            const pageRef = tocPage.ref;
            const existingAnnots = tocPage.node.get(pdfDoc.context.obj('Annots'));
            if (existingAnnots) {
              existingAnnots.push(annotation);
            } else {
              tocPage.node.set(pdfDoc.context.obj('Annots'), pdfDoc.context.obj([annotation]));
            }
          }

          pageNum++;
          yPosition -= 18;
          docCounter++;
        }
      }

      // Documents directly in section
      const sectionDocs = documents.filter(d => d.section_id === section.id);
      let docCounter = 1;
      for (const doc of sectionDocs) {
        const docText = `    ${documentNumber - 1}.${docCounter}. ${doc.display_name || doc.original_name || 'Unnamed Document'}`;
        const pageText = `Page ${pageNum}`;
        
        const textWidth = measureText(docText, fonts.helvetica, 11);
        const pageTextWidth = measureText(pageText, fonts.helvetica, 11);
        
        // Draw document title in BLUE
        tocPage.drawText(docText, {
          x: margin + 20,
          y: yPosition,
          size: 11,
          font: fonts.helvetica,
          color: rgb(0, 0.4, 0.8)
        });

        // Draw page number
        tocPage.drawText(pageText, {
          x: pageWidth - margin - pageTextWidth,
          y: yPosition,
          size: 11,
          font: fonts.helvetica,
          color: rgb(0.4, 0.4, 0.4)
        });

        // Add dots
        const dotsStart = margin + 20 + textWidth + 10;
        const dotsEnd = pageWidth - margin - pageTextWidth - 10;
        const dotSpacing = 8;
        const numDots = Math.floor((dotsEnd - dotsStart) / dotSpacing);
        
        for (let i = 0; i < numDots; i++) {
          tocPage.drawText('.', {
            x: dotsStart + (i * dotSpacing),
            y: yPosition,
            size: 11,
            font: fonts.helvetica,
            color: rgb(0.6, 0.6, 0.6)
          });
        }

        // CREATE CLICKABLE LINK
        if (doc.file_url) {
          const linkRect = [
            margin + 20,
            yPosition - 3,
            margin + 20 + textWidth,
            yPosition + 14
          ];

          const annotation = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: linkRect,
            A: {
              Type: 'Action',
              S: 'URI',
              URI: doc.file_url
            },
            Border: [0, 0, 0],
            H: 'I'
          });

          const existingAnnots = tocPage.node.get(pdfDoc.context.obj('Annots'));
          if (existingAnnots) {
            existingAnnots.push(annotation);
          } else {
            tocPage.node.set(pdfDoc.context.obj('Annots'), pdfDoc.context.obj([annotation]));
          }
        }

        pageNum++;
        yPosition -= 18;
        docCounter++;
      }
      
      yPosition -= 10; // Extra space after each section
    }

    // Add unorganized documents
    const unorganizedDocs = documents.filter(d => !d.section_id);
    if (unorganizedDocs.length > 0) {
      // "Unorganized Documents" header
      const unorganizedText = 'Additional Documents';
      tocPage.drawText(unorganizedText, {
        x: margin,
        y: yPosition,
        size: 14,
        font: fonts.helveticaBold,
        color: rgb(0.5, 0.5, 0.5)
      });
      yPosition -= 25;

      for (const doc of unorganizedDocs) {
        const docText = `${documentNumber}. ${doc.display_name || doc.original_name || 'Unnamed Document'}`;
        const pageText = `Page ${pageNum}`;
        
        const textWidth = measureText(docText, fonts.helvetica, 11);
        const pageTextWidth = measureText(pageText, fonts.helvetica, 11);
        
        tocPage.drawText(docText, {
          x: margin,
          y: yPosition,
          size: 11,
          font: fonts.helvetica,
          color: rgb(0, 0.4, 0.8)
        });

        tocPage.drawText(pageText, {
          x: pageWidth - margin - pageTextWidth,
          y: yPosition,
          size: 11,
          font: fonts.helvetica,
          color: rgb(0.4, 0.4, 0.4)
        });

        // Add dots
        const dotsStart = margin + textWidth + 10;
        const dotsEnd = pageWidth - margin - pageTextWidth - 10;
        const dotSpacing = 8;
        const numDots = Math.floor((dotsEnd - dotsStart) / dotSpacing);
        
        for (let i = 0; i < numDots; i++) {
          tocPage.drawText('.', {
            x: dotsStart + (i * dotSpacing),
            y: yPosition,
            size: 11,
            font: fonts.helvetica,
            color: rgb(0.6, 0.6, 0.6)
          });
        }

        // CREATE CLICKABLE LINK
        if (doc.file_url) {
          const linkRect = [
            margin,
            yPosition - 3,
            margin + textWidth,
            yPosition + 14
          ];

          const annotation = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: linkRect,
            A: {
              Type: 'Action',
              S: 'URI',
              URI: doc.file_url
            },
            Border: [0, 0, 0],
            H: 'I'
          });

          const existingAnnots = tocPage.node.get(pdfDoc.context.obj('Annots'));
          if (existingAnnots) {
            existingAnnots.push(annotation);
          } else {
            tocPage.node.set(pdfDoc.context.obj('Annots'), pdfDoc.context.obj([annotation]));
          }
        }

        pageNum++;
        yPosition -= 18;
        documentNumber++;
      }
    }

    // Add generation timestamp at bottom
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const timestampText = `Generated on ${timestamp}`;
    const timestampWidth = measureText(timestampText, fonts.helvetica, 9);
    
    tocPage.drawText(timestampText, {
      x: (pageWidth - timestampWidth) / 2,
      y: 40,
      size: 9,
      font: fonts.helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });

    console.log('ENHANCED TOC generated with professional formatting and clickable links!');

    // Note: This version creates just the cover page and enhanced TOC
    // You can extend this to add the actual document pages if needed

    const pdfBytes = await pdfDoc.save();
    console.log('ENHANCED PDF binder generation completed successfully');
    
    return {
      success: true,
      data: pdfBytes
    };
  } catch (error) {
    console.error('Enhanced PDF generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}