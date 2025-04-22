const sgMail = require('@sendgrid/mail');

// Load your API key (from env or runtime config)
const apiKey = process.env.SENDGRID_API_KEY || require('./.runtimeconfig.json').sendgrid.api_key;
sgMail.setApiKey(apiKey);

// Fake test invoice order
const order = {
  id: `ORD-TEST-${Date.now()}`,
  date: new Date().toISOString(),
  total: 42.50,
  items: [
    { name: 'Dahlia Bloom', price: 10.00, quantity: 2 },
    { name: 'Foxglove', price: 11.25, quantity: 2 }
  ],
  customer: {
    name: 'Test Invoice Customer',
    email: 'sarah.halliday+testinvoice@gmail.com',
    phone: '604-123-4567'
  }
};

// Since the function isn't exported, we'll include a simplified version here
function generateInvoiceEmailTemplate(order) {
  // Format items for display in the email
  const itemsList = order.items.map(item => {
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice for Order - ${order.id}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; padding: 20px; background-color: #f5f5f5; }
        .header img { max-width: 200px; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 12px; color: #777; padding: 20px; background-color: #f5f5f5; }
        .invoice-details { margin-bottom: 20px; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .invoice-table th { background-color: #f5f5f5; text-align: left; padding: 10px; }
        .invoice-total { font-weight: bold; text-align: right; }
        .button { display: inline-block; padding: 10px 20px; background-color: #2c5530; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://firebasestorage.googleapis.com/v0/b/buttonsflowerfarm-8a54d.firebasestorage.app/o/logo%2Fbuff_floral_lg.png?alt=media&token=3dfddfc2-6579-4541-acc3-6e3a02aea0b5" alt="Buttons Urban Flower Farm">
          <h1>Invoice</h1>
        </div>
        
        <div class="content">
          <p>Dear ${order.customer.name || 'Customer'},</p>
          <p>Please find your invoice for order #${order.id} below.</p>
          
          <div class="invoice-details">
            <p><strong>Order #:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${order.customer.name || 'Not provided'}</p>
            <p><strong>Email:</strong> ${order.customer.email || 'Not provided'}</p>
          </div>
          
          <h2>Order Summary</h2>
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="invoice-total">Total</td>
                <td style="text-align: right; font-weight: bold;">$${parseFloat(order.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <h2>Payment Information</h2>
          <p>Please complete your payment using one of the following methods:</p>
          <ul>
            <li><strong>Cash:</strong> Available for in-person pickup</li>
            <li><strong>E-Transfer:</strong> Send to buttonsflowerfarm@gmail.com</li>
          </ul>
          <p>Please include your order number (${order.id}) in the payment notes.</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Buttons Urban Flower Farm</p>
          <p>Email: buttonsflowerfarm@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const msg = {
  to: order.customer.email,
  from: 'Buttonsflowerfarm@gmail.com',
  subject: `Invoice for Order - ${order.id}`,
  html: generateInvoiceEmailTemplate(order)
};

console.log('🚀 Sending test invoice email with subject:', msg.subject);

sgMail
  .send(msg)
  .then(([response]) => {
    console.log('✅ Test invoice email sent!');
    console.log('Status Code:', response.statusCode);
    console.log('Message ID:', response.headers['x-message-id']);
  })
  .catch((error) => {
    console.error('❌ Failed to send test invoice email:', error.message);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
  }); 