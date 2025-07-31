const nodemailer = require("nodemailer");
require("dotenv").config();

const testOrder = {
  id: "ORD-2025-0423-8801",
  date: new Date().toISOString(),
  customer: {
    firstName: "Sarah",
    lastName: "Halliday",
    email: "buttonsflowerfarm@telus.net",
    phone: "6043516605",
    pickupRequest: "Friday afternoon between 2-4pm if possible",
    notes: "Would love some extra greenery if available!"
  },
  items: [
    {
      name: "Spring Mixed Bouquet",
      quantity: 2,
      price: 45.00
    },
    {
      name: "Seasonal Wreath",
      quantity: 1,
      price: 65.00
    }
  ],
  total: 155.00
};

async function testOrderEmail() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "buttonsflowerfarm@telus.net",
      pass: process.env.GMAIL_PASSWORD
    }
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    const customerEmailHtml = generateCustomerEmailTemplate(testOrder);
    const buttonsEmailHtml = generateButtonsEmailTemplate(testOrder);

    const customerInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: testOrder.customer.email,
      subject: `Order Confirmation - ${testOrder.id}`,
      html: customerEmailHtml
    });

    console.log("✅ Customer confirmation email sent:", customerInfo.messageId);

    const buttonsInfo = await transporter.sendMail({
      from: "buttonsflowerfarm@telus.net",
      to: "buttonsflowerfarm@telus.net",
      subject: `New Order Received - ${testOrder.id}`,
      html: buttonsEmailHtml
    });

    console.log("✅ Buttons notification email sent:", buttonsInfo.messageId);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function generateCustomerEmailTemplate(order) {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #4a7c59;">Thank You for Your Order!</h2>
      <p>Dear ${order.customer.firstName},</p>
      <p>We've received your order and are excited to prepare it for you. Here are your order details:</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Order Information</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      </div>
      
      <h3 style="color: #4a7c59;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(order.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${order.customer.notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #4a7c59; margin-top: 0;">Your Notes</h3>
          <p>${order.customer.notes}</p>
        </div>
      ` : ''}

      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Payment Information</h3>
        <p>Please complete your payment using one of the following methods:</p>
        <ul>
          <li><strong>Cash:</strong> Available for in-person pickup</li>
          <li><strong>E-Transfer:</strong> Send to buttonsflowerfarm@telus.net</li>
        </ul>
        <p>Please include your order number (${order.id}) in the payment notes.</p>
      </div>

      <p>We will confirm your pickup date and time by text message to <strong>${order.customer.phone}</strong>.</p>

      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>The Buttons Flower Farm Team</p>
    </div>
  `;
}

function generateButtonsEmailTemplate(order) {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #4a7c59;">New Order Received!</h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Order Information</h3>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #4a7c59; margin-top: 0;">Customer Information</h3>
        <p><strong>Name:</strong> ${order.customer.firstName} ${order.customer.lastName}</p>
        <p><strong>Email:</strong> ${order.customer.email}</p>
        <p><strong>Phone:</strong> ${order.customer.phone}</p>
      </div>
      
      <h3 style="color: #4a7c59;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(order.total).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${order.customer.notes ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #4a7c59; margin-top: 0;">Customer Notes</h3>
          <p>${order.customer.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
}

testOrderEmail(); 