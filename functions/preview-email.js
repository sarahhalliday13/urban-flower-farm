// Quick script to preview the customer email template
const { generateCustomerEmailTemplate } = require('./sendOrderEmail.js');
const fs = require('fs');

// Test order data
const testOrder = {
  id: 'ORD-2025-1234-5678',
  date: new Date().toISOString(),
  customer: {
    firstName: 'Sarah',
    lastName: 'Test',
    email: 'test@example.com',
    phone: '6043516650',
    notes: 'Please leave by the gate if not home'
  },
  items: [
    {
      name: 'Lavender - French',
      price: 12.50,
      quantity: 2,
      inventoryStatus: 'In Stock',
      invoiceNow: true
    },
    {
      name: 'Rose - Climbing',
      price: 25.00,
      quantity: 1,
      inventoryStatus: 'Pre-Order',
      invoiceNow: false
    }
  ],
  subtotal: 50.00,
  gst: 2.50,
  pst: 3.50,
  total: 56.00
};

// Generate the HTML
const html = generateCustomerEmailTemplate(testOrder);

// Save to file
fs.writeFileSync('email-preview.html', html);

console.log('✅ Email preview saved to: functions/email-preview.html');
console.log('Open this file in your browser to see the email template.');
