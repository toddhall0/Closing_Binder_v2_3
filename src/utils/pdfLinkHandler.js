// ===============================
// FILE: src/utils/pdfLinkHandler.js
// Utility to create PDF links that open in custom windows
// ===============================

export const pdfLinkHandler = {
  /**
   * Create a special URL that forces opening in a new window with custom size
   * This uses a data URL with JavaScript that immediately opens the document
   * @param {string} documentUrl - The actual document URL
   * @param {string} documentName - Name of the document
   * @returns {string} - Special URL that opens in custom window
   */
  createCustomSizedLink(documentUrl, documentName = 'Document') {
    // Calculate window dimensions (2/3 screen width, 80% screen height)
    const windowScript = `
      // Calculate window dimensions
      const screenWidth = screen.availWidth;
      const screenHeight = screen.availHeight;
      const windowWidth = Math.floor(screenWidth * 0.67); // 2/3 width
      const windowHeight = Math.floor(screenHeight * 0.8); // 80% height
      
      // Center the window
      const left = Math.floor((screenWidth - windowWidth) / 2);
      const top = Math.floor((screenHeight - windowHeight) / 2);

      // Window features for custom sizing
      const features = [
        'width=' + windowWidth,
        'height=' + windowHeight,
        'left=' + left,
        'top=' + top,
        'scrollbars=yes',
        'resizable=yes',
        'status=yes',
        'location=yes',
        'toolbar=yes',
        'menubar=yes'
      ].join(',');

      // Open the document in custom window
      const docWindow = window.open('${documentUrl}', '_blank', features);
      
      if (docWindow) {
        docWindow.focus();
        // Close this helper window
        window.close();
      } else {
        // Fallback if popup blocked
        alert('Please allow popups to open documents in custom windows');
        window.location.href = '${documentUrl}';
      }
    `;

    // Create HTML page that executes the window opening script
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Opening ${documentName}...</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f5f5f5;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #000;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>Opening Document</h2>
            <p>Opening "${documentName}" in a new window...</p>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If the document doesn't open, please check your popup blocker settings.
            </p>
          </div>
          <script>
            // Execute after page loads
            window.onload = function() {
              try {
                ${windowScript}
              } catch (error) {
                console.error('Error opening document:', error);
                alert('Error opening document: ' + error.message);
                window.location.href = '${documentUrl}';
              }
            };
          </script>
        </body>
      </html>
    `;

    // Convert HTML to data URL
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    return dataUrl;
  },

  /**
   * Create a simple JavaScript URL that opens in new window
   * This is a more reliable approach for PDF links
   * @param {string} documentUrl - The actual document URL
   * @returns {string} - JavaScript URL
   */
  createJavaScriptLink(documentUrl) {
    const script = `
      const screenWidth = screen.availWidth;
      const screenHeight = screen.availHeight;
      const windowWidth = Math.floor(screenWidth * 0.67);
      const windowHeight = Math.floor(screenHeight * 0.8);
      const left = Math.floor((screenWidth - windowWidth) / 2);
      const top = Math.floor((screenHeight - windowHeight) / 2);
      const features = 'width=' + windowWidth + ',height=' + windowHeight + ',left=' + left + ',top=' + top + ',scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=yes,menubar=yes';
      const newWin = window.open('${documentUrl}', '_blank', features);
      if (newWin) newWin.focus();
      else alert('Please allow popups for document viewing');
    `;
    
    return `javascript:${encodeURIComponent(script)}`;
  }
};

export default pdfLinkHandler;