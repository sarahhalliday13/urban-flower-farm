/**
 * Test script for Firebase Functions email service
 * Run this after starting the Firebase emulator
 */

// Import required packages
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Configuration
const config = {
  // Replace with your actual email for testing
  testEmail: process.env.TEST_EMAIL || 'sarahhalliday@gmail.com',
  emulatorUrl: 'http://localhost:5002/buttonsflowerfarm-8a54d/us-central1', // Updated URL format for Firebase Functions
  verbose: true // Set to true for detailed logs
};

// Test order data
const testOrder = {
  id: `TEST-${Date.now()}`,
  date: new Date().toISOString(),
  total: 45.99,
  customer: {
    firstName: 'Test',
    lastName: 'Customer',
    email: config.testEmail,
    phone: '555-123-4567',
    notes: 'This is a test order with pickup notes'
  },
  items: [
    {
      id: 'plant1',
      name: 'Test Plant',
      price: 15.99,
      quantity: 2
    },
    {
      id: 'plant2',
      name: 'Another Test Plant',
      price: 14.01,
      quantity: 1
    }
  ]
};

// Test contact form data
const testContactForm = {
  name: 'Test Contact',
  email: config.testEmail,
  phone: '555-987-6543',
  subject: 'Test Contact Form',
  message: 'This is a test message from the contact form.\nTesting multiple lines.\nThird line of the message.'
};

// Test general email data
const testGeneralEmail = {
  to: config.testEmail,
  subject: 'Test General Email Function',
  text: 'This is a test email sent from the Firebase Functions emulator.',
  html: '<h1>Test Email</h1><p>This is a <strong>test email</strong> sent from the Firebase Functions emulator.</p>'
};

// Utility function to log
function log(message, type = 'info') {
  if (!config.verbose && type === 'debug') return;
  
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌ ERROR' : 
                type === 'success' ? '✅ SUCCESS' : 
                type === 'debug' ? '🔍 DEBUG' : 'ℹ️ INFO';
                
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

// Add a debugging helper function
async function logRequestDetails(url, method, body) {
  log(`Making ${method} request to ${url}`, 'debug');
  if (body) {
    log(`Request body: ${JSON.stringify(body).substring(0, 150)}...`, 'debug');
  }
}

// Function to test the health endpoint
async function testHealthEndpoint() {
  const url = `${config.emulatorUrl}/sendEmail`;
  log('Testing health endpoint...');
  log(`URL: ${url}`, 'debug');
  
  try {
    const response = await fetch(url);
    
    log(`Response status: ${response.status}`, 'debug');
    log(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers]))}`, 'debug');
    
    if (response.status === 200) {
      const text = await response.text();
      log(`Health check successful: ${text}`, 'success');
      return true;
    } else {
      log(`Health check failed with status ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Health check error: ${error.message}`, 'error');
    log('Make sure the Firebase emulator is running and the port is correct.', 'error');
    log(`Current emulator URL: ${config.emulatorUrl}`, 'debug');
    return false;
  }
}

// Function to test the general email endpoint
async function testGeneralEmailEndpoint() {
  log('Testing general email endpoint...');
  const url = `${config.emulatorUrl}/sendEmail`;
  try {
    await logRequestDetails(url, 'POST', testGeneralEmail);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testGeneralEmail),
    });
    
    log(`Response status: ${response.status}`, 'debug');
    log(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers]))}`);
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON response
      const text = await response.text();
      log(`Received non-JSON response: ${text.substring(0, 200)}...`, 'debug');
      data = { success: false, error: 'Unexpected response format' };
    }
    
    if (response.status === 200 && data.success) {
      log(`General email sent successfully to ${testGeneralEmail.to}`, 'success');
      return true;
    } else {
      log(`General email failed: ${data.error || 'Unknown error'}`, 'error');
      log(`Status: ${response.status}, Response: ${JSON.stringify(data, null, 2)}`, 'debug');
      return false;
    }
  } catch (error) {
    log(`General email error: ${error.message}`, 'error');
    log(`Error stack: ${error.stack}`, 'debug');
    return false;
  }
}

// Function to test the order email endpoint
async function testOrderEmailEndpoint() {
  log('Testing order email endpoint...');
  try {
    const response = await fetch(`${config.emulatorUrl}/sendOrderEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrder),
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON response
      const text = await response.text();
      log(`Received non-JSON response: ${text.substring(0, 100)}...`, 'debug');
      data = { success: false, error: 'Unexpected response format' };
    }
    
    if (response.status === 200 && data.success) {
      log(`Order confirmation email sent successfully for order ${testOrder.id}`, 'success');
      log(`Email sent to customer: ${testOrder.customer.email}`, 'debug');
      log(`Order saved: ${data.orderSaved}, Emails sent: ${data.emailsSent}`, 'debug');
      return true;
    } else {
      log(`Order email failed: ${data.error || 'Unknown error'}`, 'error');
      log(`Status: ${response.status}, Response: ${JSON.stringify(data, null, 2)}`, 'debug');
      return false;
    }
  } catch (error) {
    log(`Order email error: ${error.message}`, 'error');
    return false;
  }
}

// Function to test the contact form email endpoint
async function testContactEmailEndpoint() {
  log('Testing contact form email endpoint...');
  try {
    const response = await fetch(`${config.emulatorUrl}/sendContactEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testContactForm),
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON response
      const text = await response.text();
      log(`Received non-JSON response: ${text.substring(0, 100)}...`, 'debug');
      data = { success: false, error: 'Unexpected response format' };
    }
    
    if (response.status === 200 && data.success) {
      log(`Contact form email sent successfully for ${testContactForm.name}`, 'success');
      log(`From email: ${testContactForm.email}`, 'debug');
      return true;
    } else {
      log(`Contact form email failed: ${data.error || 'Unknown error'}`, 'error');
      log(`Status: ${response.status}, Response: ${JSON.stringify(data, null, 2)}`, 'debug');
      return false;
    }
  } catch (error) {
    log(`Contact form email error: ${error.message}`, 'error');
    return false;
  }
}

// Main function to run all tests
async function runTests() {
  log('Starting email function tests...');
  log(`Test email recipient: ${config.testEmail}`, 'debug');
  
  // Check if emulator is running first
  const healthCheck = await testHealthEndpoint();
  if (!healthCheck) {
    log('Health check failed. Aborting tests.', 'error');
    process.exit(1);
  }
  
  // Run all tests
  const tests = [
    { name: 'General Email', fn: testGeneralEmailEndpoint },
    { name: 'Order Email', fn: testOrderEmailEndpoint },
    { name: 'Contact Form Email', fn: testContactEmailEndpoint }
  ];
  
  const results = [];
  
  for (const test of tests) {
    log(`\n=== Running test: ${test.name} ===`);
    const success = await test.fn();
    results.push({ name: test.name, success });
  }
  
  // Print summary
  log('\n=== Test Results Summary ===');
  let allPassed = true;
  
  for (const result of results) {
    if (result.success) {
      log(`${result.name}: Passed`, 'success');
    } else {
      log(`${result.name}: Failed`, 'error');
      allPassed = false;
    }
  }
  
  if (allPassed) {
    log('\nAll tests passed! The email functions are working correctly.', 'success');
  } else {
    log('\nSome tests failed. Please check the logs above for details.', 'error');
  }
}

// Run all tests
runTests(); 