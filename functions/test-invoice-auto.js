const fetch = require('node-fetch');

const functionUrl = 'https://us-central1-buttonsflowerfarm-8a54d.cloudfunctions.net/sendOrderEmail';

const testOrder = {
  id: `ORD-TEST-${Date.now()}`,
  date: new Date().toISOString(),
  total: 25.00,
  items: [
    { name: 'Zinnia', price: 5.00, quantity: 3 },
    { name: 'Marigold', price: 5.00, quantity: 2 }
  ],
  customer: {
    firstName: 'Testy',
    lastName: 'McInvoice',
    email: 'sarah.halliday+testinvoice@gmail.com',
    phone: '604-000-0000'
  },
  isInvoiceEmail: true,    // ✅ Tells sendOrderEmail.js to use the Invoice template
  isTestInvoice: true      // ✅ Tells sendOrderEmail.js to SKIP saving to database
};

async function sendTestInvoice() {
  try {
    console.log('🚀 Sending test invoice POST request...');
    console.log('Test order payload:', JSON.stringify(testOrder, null, 2)); // Debugging output

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testOrder)
    });

    const result = await response.json();
    console.log('✅ Response:', result);

    if (result.success) {
      console.log('🎉 Test invoice email sent successfully.');
    } else {
      console.error('❌ Test invoice failed:', result.error || result);
    }
  } catch (error) {
    console.error('❌ Error during test invoice send:', error);
  }
}

sendTestInvoice();
