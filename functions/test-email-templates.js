// Test script for email templates
const fs = require('fs');
const path = require('path');

// Import the template functions
const { generateCustomerEmailTemplate, generateButtonsEmailTemplate, generateInvoiceEmailTemplate } = require('./sendOrderEmail');

// Sample test order
const testOrder = {
  id: 'TEST-123',
  date: new Date().toISOString(),
  customer: {
    firstName: 'Test',
    lastName: 'Customer',
    email: 'buttonsflowerfarm@telus.net',
    phone: '555-0123',
    notes: 'Please include care instructions and notify me before delivery.'
  },
  items: [
    {
      id: 'plant1',
      name: 'Lavender Mist',
      price: 19.99,
      quantity: 2,
      status: 'inStock'
    },
    {
      id: 'plant2',
      name: 'Korean Mint',
      price: 15.99,
      quantity: 3,
      status: 'preOrder'
    }
  ],
  total: 87.95,
  status: 'Pending'
};

// Generate and save templates
const outputDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Generate customer email
const customerEmail = generateCustomerEmailTemplate(testOrder);
fs.writeFileSync(path.join(outputDir, 'customer-email.html'), customerEmail);

// Generate admin email
const adminEmail = generateButtonsEmailTemplate(testOrder);
fs.writeFileSync(path.join(outputDir, 'admin-email.html'), adminEmail);

// Generate invoice email
const invoiceEmail = generateInvoiceEmailTemplate(testOrder);
fs.writeFileSync(path.join(outputDir, 'invoice-email.html'), invoiceEmail);

console.log('✅ Email templates generated in test-output/');
console.log('Open these files in a browser to check the layout:');
console.log('- test-output/customer-email.html');
console.log('- test-output/admin-email.html');
console.log('- test-output/invoice-email.html'); 