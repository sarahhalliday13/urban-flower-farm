const nodemailer = require("nodemailer");
require("dotenv").config();

const testInvoice = {
  invoiceId: "INV-2025-0001",
  orderId: "ORD-2025-0001",
  customerName: "Test Customer",
  customerEmail: "buttonsflowerfarm@telus.net", // Send to Buttons for testing
  billingAddress: {
    street: "123 Garden Way",
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1"
  },
  orderDate: new Date().toISOString(),
  invoiceDate: new Date().toISOString(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  items: [
    {
      name: "Gaillardia Pulchella",
      quantity: 3,
      price: 12.99,
      total: 38.97,
      notes: "Beautiful blanket flower, drought tolerant",
      sku: "GAI-PUL-001"
    },
    {
      name: "Korean Mint",
      quantity: 2,
      price: 8.99,
      total: 17.98,
      notes: "Fragrant herb, attracts pollinators",
      sku: "KOR-MNT-001"
    },
    {
      name: "Penstemon Palmeri",
      quantity: 1,
      price: 15.99,
      total: 15.99,
      notes: "Pink flowers, tall spikes",
      sku: "PEN-PAL-001"
    }
  ],
  subtotal: 72.94,
  tax: 3.65,
  total: 76.59,
  paymentMethod: "Credit Card",
  paymentStatus: "Paid",
  paymentDate: new Date().toISOString(),
  paymentReference: "TXID-123456789",
  terms: "Payment due within 7 days of invoice date",
  notes: "Thank you for supporting local urban farming!"
};

async function testInvoiceEmail() {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "buttonsflowerfarm@telus.net",
      pass: process.env.GMAIL_PASSWORD,
    }
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    // Generate invoice HTML
    const invoiceHtml = generateInvoiceEmail(testInvoice);

    // Send invoice email
    const info = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: testInvoice.customerEmail,
      subject: `Invoice ${testInvoice.invoiceId} for Order ${testInvoice.orderId}`,
      html: invoiceHtml
    });

    console.log("✅ Invoice email sent:", info.messageId);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function generateInvoiceEmail(invoice) {
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();
  const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50;">Buttons Urban Farm</h1>
        <h2 style="color: #34495e;">INVOICE</h2>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <p><strong>Bill To:</strong></p>
          <p>${invoice.customerName}</p>
          <p>${invoice.billingAddress.street}</p>
          <p>${invoice.billingAddress.city}, ${invoice.billingAddress.province}</p>
          <p>${invoice.billingAddress.postalCode}</p>
        </div>
        <div style="text-align: right;">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceId}</p>
          <p><strong>Order Number:</strong> ${invoice.orderId}</p>
          <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</p>
          <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr style="background: #f8f9fa;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">SKU</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Quantity</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
        </tr>
        ${invoice.items.map(item => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
              ${item.name}<br>
              <small style="color: #6c757d;">${item.notes}</small>
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">
              ${item.sku}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">
              ${item.quantity}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">
              ${formatCurrency(item.price)}
            </td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">
              ${formatCurrency(item.total)}
            </td>
          </tr>
        `).join("")}
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <strong>Subtotal:</strong>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <strong>Tax:</strong>
            <span>${formatCurrency(invoice.tax)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; 
              padding-top: 10px; border-top: 2px solid #dee2e6;">
            <strong>Total:</strong>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px;">
        <div style="background: #e9ecef; padding: 20px; border-radius: 5px;">
          <h3 style="margin-top: 0;">Payment Information</h3>
          <p><strong>Status:</strong> ${invoice.paymentStatus}</p>
          <p><strong>Method:</strong> ${invoice.paymentMethod}</p>
          <p><strong>Date:</strong> ${formatDate(invoice.paymentDate)}</p>
          <p><strong>Reference:</strong> ${invoice.paymentReference}</p>
        </div>
      </div>

      <div style="margin-top: 30px;">
        <p><strong>Terms:</strong> ${invoice.terms}</p>
        <p><em>${invoice.notes}</em></p>
      </div>

      <div style="margin-top: 40px; text-align: center; color: #6c757d;">
        <p>Buttons Urban Farm</p>
        <p>Vancouver, BC</p>
        <p>buttonsflowerfarm@telus.net</p>
      </div>
    </div>
  `;
}

testInvoiceEmail(); 