// test-sendgrid.js
const sgMail = require('@sendgrid/mail');
const config = require('./.runtimeconfig.json');

const apiKey = config.sendgrid.api_key;
console.log('SendGrid API key loaded:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);

sgMail.setApiKey(apiKey);

const msg = {
  to: 'sarah.halliday@gmail.com', // Replace with your actual email if different
  from: 'Buttonsflowerfarm@gmail.com',
  subject: 'Test SendGrid Email from Local Script',
  html: '<strong>If you see this, it works 🎉</strong><p>Timestamp: ' + new Date().toISOString() + '</p>',
};

console.log('Attempting to send test email to:', msg.to);

sgMail
  .send(msg)
  .then((response) => {
    console.log('✅ Test email sent!');
    console.log('Status Code:', response[0].statusCode);
    console.log('Message ID:', response[0].headers['x-message-id']);
  })
  .catch((error) => {
    console.error('❌ Failed to send test email:', error.message);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
  }); 