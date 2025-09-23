const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

/**
 * Generates a gift certificate code
 * @param {string} orderId - The order ID for reference
 * @return {string} The generated certificate code
 */
function generateCertificateCode(orderId) {
  const date = new Date();
  const dateStr = date.getFullYear().toString() + 
                  (date.getMonth() + 1).toString().padStart(2, '0') + 
                  date.getDate().toString().padStart(2, '0');
  
  // Extract last 4 digits of order ID or use random number
  const orderSuffix = orderId ? orderId.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
  
  return `GC-${dateStr}-${orderSuffix}`;
}

/**
 * Creates the HTML template for the gift certificate PDF
 * @param {Object} certificateData - The certificate data
 * @return {string} The HTML template
 */
function createCertificateHTML(certificateData) {
  const {
    certificateCode,
    amount,
    recipientName,
    senderName,
    giftMessage,
    orderId,
    dateCreated
  } = certificateData;

  const formatDate = (dateString) => {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return new Date().toLocaleDateString();
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gift Certificate - ${certificateCode}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f9fafb;
          padding: 0.5rem;
          margin: 0;
        }
        
        .certificate {
          width: 750px;
          height: 750px;
          background: white;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
        }
        
        .border-outer {
          position: absolute;
          inset: 1rem;
          border: 4px double #d1d5db;
        }
        
        .border-inner {
          position: absolute;
          inset: 1rem;
          border: 1px solid #e5e7eb;
        }
        
        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 1.5rem;
          padding-bottom: 0.75rem;
        }
        
        .logo {
          height: 95px;
          width: auto;
          margin-bottom: 1rem;
        }
        
        .title {
          font-size: 2.25rem;
          color: #1f2937;
          letter-spacing: 0.1em;
          font-weight: bold;
        }
        
        .amount-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .worth-text {
          font-size: 1.125rem;
          color: #6b7280;
          margin-bottom: 1rem;
        }
        
        .amount {
          font-size: 3.75rem;
          color: #059669;
          font-weight: bold;
        }
        
        .recipient-section {
          padding: 0 4rem;
          margin-bottom: 2rem;
        }
        
        .recipient-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        
        .field-container {
          border-bottom: 2px solid #d1d5db;
          padding-bottom: 0.5rem;
        }
        
        .field-label {
          display: block;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
          text-align: left;
        }
        
        .field-value {
          font-size: 1.25rem;
          color: #1f2937;
          min-height: 1.5rem;
        }
        
        .message-section {
          padding: 0 4rem;
          margin-bottom: 2rem;
        }
        
        .message-container {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid #059669;
        }
        
        .message-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        
        .message-text {
          font-size: 1rem;
          color: #1f2937;
          font-style: italic;
          line-height: 1.5;
        }
        
        .footer {
          position: absolute;
          bottom: 3rem;
          left: 4rem;
          right: 4rem;
        }
        
        .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          margin-bottom: 1rem;
        }
        
        .signature-field {
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 0.5rem;
          min-height: 2rem;
        }
        
        .signature-label {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }
        
        .date-value {
          color: #1f2937;
          font-size: 1rem;
        }
        
        .certificate-info {
          margin-top: 2rem;
          text-align: center;
        }
        
        .validity-text {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        
        .certificate-code {
          font-size: 0.75rem;
          color: #6b7280;
          font-family: monospace;
        }
        
        .corner {
          position: absolute;
          width: 2rem;
          height: 2rem;
        }
        
        .corner-tl {
          top: 1rem;
          left: 1rem;
          border-left: 2px solid #d1d5db;
          border-top: 2px solid #d1d5db;
        }
        
        .corner-tr {
          top: 1rem;
          right: 1rem;
          border-right: 2px solid #d1d5db;
          border-top: 2px solid #d1d5db;
        }
        
        .corner-bl {
          bottom: 1rem;
          left: 1rem;
          border-left: 2px solid #d1d5db;
          border-bottom: 2px solid #d1d5db;
        }
        
        .corner-br {
          bottom: 1rem;
          right: 1rem;
          border-right: 2px solid #d1d5db;
          border-bottom: 2px solid #d1d5db;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="border-outer">
          <div class="border-inner">
            
            <!-- Header -->
            <div class="header">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5"
                alt="Buttons Urban Flower Farm" 
                class="logo"
              />
              <h1 class="title">GIFT CERTIFICATE</h1>
            </div>

            <!-- Amount Section -->
            <div class="amount-section">
              <p class="worth-text">This certificate is worth</p>
              <div class="amount">$${parseFloat(amount).toFixed(2)}</div>
            </div>

            <!-- Recipient Section -->
            <div class="recipient-section">
              <div class="recipient-grid">
                <div class="field-container">
                  <label class="field-label">TO:</label>
                  <div class="field-value">${recipientName || ''}</div>
                </div>
                <div class="field-container">
                  <label class="field-label">FROM:</label>
                  <div class="field-value">${senderName || ''}</div>
                </div>
              </div>
            </div>

            ${giftMessage ? `
            <!-- Message Section -->
            <div class="message-section">
              <div class="message-container">
                <div class="message-label">Gift Message:</div>
                <div class="message-text">${giftMessage}</div>
              </div>
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
              <div class="signature-grid">
                <div class="signature-field">
                  <p class="signature-label">AUTHORIZED SIGNATURE</p>
                </div>
                <div class="signature-field">
                  <p class="signature-label">DATE</p>
                  <p class="date-value">${formatDate(dateCreated)}</p>
                </div>
              </div>
              
              <div class="certificate-info">
                <p class="validity-text">
                  This certificate is valid for merchandise or services. Not redeemable for cash.
                </p>
                <div class="certificate-code">
                  Certificate Code: ${certificateCode}
                  ${orderId ? ` | Order: ${orderId}` : ''}
                </div>
              </div>
            </div>

            <!-- Decorative corners -->
            <div class="corner corner-tl"></div>
            <div class="corner corner-tr"></div>
            <div class="corner corner-bl"></div>
            <div class="corner corner-br"></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates a PDF gift certificate
 * @param {Object} certificateData - The certificate data
 * @return {Promise<Buffer>} The PDF buffer
 */
async function generateCertificatePDF(certificateData) {
  let browser = null;
  
  try {
    console.log('🎯 Starting PDF generation for certificate:', certificateData.certificateCode);
    
    // Launch browser with serverless-compatible Chrome
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1200,
      deviceScaleFactor: 2
    });
    
    // Generate HTML content
    const htmlContent = createCertificateHTML(certificateData);
    
    // Set content and wait for images to load
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });
    
    // Wait a bit more for fonts and images to fully load
    await page.waitForTimeout(2000);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });
    
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generateCertificateCode,
  generateCertificatePDF,
  createCertificateHTML
};