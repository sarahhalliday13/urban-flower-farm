const nodemailer = require("nodemailer");
require("dotenv").config();

async function testEmail() {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "buttonsflowerfarm@telus.net",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    // Send test email
    const info = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: "buttonsflowerfarm@telus.net", // Send to self for testing
      subject: "Test Email - SMTP Migration",
      text: "This is a test email sent via Gmail SMTP after migrating from SendGrid.",
      html: `
        <h1>Test Email - SMTP Migration</h1>
        <p>This is a test email sent via Gmail SMTP after migrating from SendGrid.</p>
        <p>If you're seeing this, the email system is working correctly!</p>
        <hr>
        <p><em>Sent: ${new Date().toLocaleString()}</em></p>
      `,
    });

    console.log("✅ Test email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("Invalid login")) {
      console.log("\nTIP: For Gmail, you need to:");
      console.log("1. Enable 2-Step Verification");
      console.log("2. Generate an App Password:");
      console.log("   - Go to Google Account settings");
      console.log("   - Search for 'App Passwords'");
      console.log("   - Select app: 'Mail'");
      console.log("   - Select device: 'Other (Custom name)'");
      console.log("   - Enter: 'Buttons Flower Farm'");
      console.log("3. Use the generated App Password in your .env file");
    }
  }
}

testEmail(); 