// const sgMail = require('@sendgrid/mail');

const BUTTONS_EMAIL = 'buttonsflowerfarm@gmail.com';

export const sendOrderConfirmationEmails = async (order) => {
  // Check explicitly for production mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: Simulating email send');
    console.log('Customer email template:', generateCustomerEmailTemplate(order));
    console.log('Business email template:', generateButtonsEmailTemplate(order));
    return true;
  }

  // In production, use the Netlify function
  try {
    const response = await fetch('/.netlify/functions/send-order-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      throw new Error('Failed to send emails');
    }

    return true;
  } catch (error) {
    console.error('Error sending order confirmation emails:', error);
    return false;
  }
};

const generateCustomerEmailTemplate = (order) => {
  const itemsList = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">Thank You for Your Order!</h2>
      <p>Dear ${order.customer.firstName},</p>
      <p>We've received your order and are excited to prepare it for you. Here are your order details:</p>
      
      <h3>Order Information</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      
      <h3>Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px;"><strong>$${parseFloat(order.total).toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      ${order.notes ? `
        <h3>Order Notes</h3>
        <p>${order.notes}</p>
      ` : ''}

      <h3>Payment Information</h3>
      <p>Please complete your payment using one of the following methods:</p>
      <ul>
        <li><strong>Cash:</strong> Available for in-person pickup</li>
        <li><strong>E-Transfer:</strong> Send to ${BUTTONS_EMAIL}</li>
      </ul>
      <p>Please include your order number (${order.id}) in the payment notes.</p>

      <p>We will confirm your pickup date and time by text message to <strong>${order.customer.phone}</strong>.</p>

      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>The Buttons Flower Farm Team</p>
    </div>
  `;
};

const generateButtonsEmailTemplate = (order) => {
  const itemsList = order.items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${parseFloat(item.price).toFixed(2)}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">New Order Received!</h2>
      
      <h3>Order Information</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${order.customer.firstName} ${order.customer.lastName}</p>
      <p><strong>Email:</strong> ${order.customer.email}</p>
      <p><strong>Phone:</strong> ${order.customer.phone}</p>
      
      <h3>Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px;"><strong>$${parseFloat(order.total).toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      ${order.notes ? `
        <h3>Customer Notes</h3>
        <p>${order.notes}</p>
      ` : ''}
    </div>
  `;
}; 