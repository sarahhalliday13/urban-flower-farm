import React, { useState } from 'react';
import { sendOrderConfirmationEmails, sendContactFormEmail } from '../services/emailService';

const EmailTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState('order');

  // Generate a test order
  const generateTestOrder = () => {
    const orderId = `test-${Date.now()}`;
    return {
      id: orderId,
      date: new Date().toISOString(),
      customer: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com', // Change this to your email to receive the test
        phone: '555-123-4567',
        notes: 'THIS IS A TEST ORDER - PLEASE IGNORE'
      },
      items: [
        {
          id: 'test-item-1',
          name: 'Test Plant',
          price: 9.99,
          quantity: 2
        }
      ],
      total: 19.98,
      status: 'pending',
      notes: 'This is a test order created for email functionality testing',
      pickupRequest: 'Saturday between 10am-12pm'
    };
  };

  // Generate test contact form data
  const generateContactForm = () => {
    return {
      name: 'Test Contact',
      email: 'test@example.com', // Change this to your email to receive the test
      subject: 'Test Contact Form',
      message: 'This is a test message from the email functionality test component.',
      phone: '555-123-4567'
    };
  };

  const handleTestEmail = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      if (testType === 'order') {
        // Test order confirmation email
        const testOrder = generateTestOrder();
        console.log('Sending test order email:', testOrder);
        
        const result = await sendOrderConfirmationEmails(testOrder);
        setTestResult({
          success: result.success,
          message: result.message,
          data: result,
          type: 'Order Confirmation Email'
        });
      } else {
        // Test contact form email
        const contactData = generateContactForm();
        console.log('Sending test contact form email:', contactData);
        
        const result = await sendContactFormEmail(contactData);
        setTestResult({
          success: result.success,
          message: result.message,
          data: result,
          type: 'Contact Form Email'
        });
      }
    } catch (error) {
      console.error('Error in email test:', error);
      setTestResult({
        success: false,
        message: error.message,
        error: error,
        type: testType === 'order' ? 'Order Confirmation Email' : 'Contact Form Email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '40px auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Email Functionality Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '20px' }}>
          <input 
            type="radio" 
            name="testType"
            value="order"
            checked={testType === 'order'}
            onChange={() => setTestType('order')}
          />
          Test Order Confirmation Email
        </label>
        
        <label>
          <input 
            type="radio" 
            name="testType"
            value="contact"
            checked={testType === 'contact'}
            onChange={() => setTestType('contact')}
          />
          Test Contact Form Email
        </label>
      </div>
      
      <button 
        onClick={handleTestEmail}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {loading ? 'Sending Test Email...' : 'Send Test Email'}
      </button>
      
      {testResult && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: testResult.success ? '#e7f7e7' : '#ffeded',
          border: `1px solid ${testResult.success ? '#c3e6c3' : '#f5c6c6'}`,
          borderRadius: '4px'
        }}>
          <h3 style={{ 
            color: testResult.success ? '#2e7d32' : '#c62828',
            marginTop: '0'
          }}>
            {testResult.success ? 'Success' : 'Error'}: {testResult.type}
          </h3>
          <p><strong>Message:</strong> {testResult.message}</p>
          
          {testResult.data && (
            <div>
              <h4>Response Details:</h4>
              <pre style={{ 
                backgroundColor: '#f5f5f5',
                padding: '10px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '13px'
              }}>
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
          
          {testResult.error && (
            <div>
              <h4>Error Details:</h4>
              <pre style={{ 
                backgroundColor: '#f5f5f5',
                padding: '10px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '13px',
                color: '#c62828'
              }}>
                {testResult.error.toString()}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <h3>API Information</h3>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        <p><strong>API URL:</strong> {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? 'http://localhost:5002/buttonsflowerfarm-8a54d/us-central1' 
          : 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net'}</p>
        
        <h4>Troubleshooting</h4>
        <ul>
          <li>Ensure Firebase emulator is running: <code>cd functions && npm run serve</code></li>
          <li>Check for CORS issues in browser console</li>
          <li>Verify SendGrid API key is properly configured</li>
          <li>Check Firebase Functions logs for detailed error information</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTest; 