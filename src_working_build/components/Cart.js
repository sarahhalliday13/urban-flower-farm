import { sendOrderConfirmationEmails } from '../services/emailService';

class Cart extends Component {
  state = {
    expanded: false,
    checkoutStep: 0,
    checkoutComplete: false,
    formData: {
      name: '',
      email: '',
      phone: '',
      pickupDate: '',
      pickupLocation: '',
      notes: ''
    },
    orderStatus: {
      loading: false,
      success: false,
      error: false,
      message: ''
    }
  };

  componentDidMount() {
    const savedCustomerData = localStorage.getItem('customerData');
    if (savedCustomerData) {
      try {
        const { name, email, phone } = JSON.parse(savedCustomerData);
        this.setState(prevState => ({
          formData: {
            ...prevState.formData,
            name: name || '',
            email: email || '',
            phone: phone || ''
          }
        }));
      } catch (error) {
        console.error('Error parsing saved customer data:', error);
      }
    }
  }

  handleCheckout = async (e) => {
    e.preventDefault();
    
    const { name, email, phone, pickupDate, pickupLocation } = this.state.formData;
    if (!name || !email || !phone || !pickupDate || !pickupLocation) {
      this.setState({
        orderStatus: {
          loading: false,
          success: false,
          error: true,
          message: 'Please fill out all required fields.'
        }
      });
      return;
    }
    
    const customerData = { name, email, phone };
    localStorage.setItem('customerData', JSON.stringify(customerData));
    
    this.setState({ orderStatus: { loading: true, success: false, error: false, message: '' } });

    const { cart } = this.props;
    const { formData } = this.state;
    
    const order = {
      customer: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      },
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      pickupDetails: {
        date: formData.pickupDate,
        location: formData.pickupLocation
      },
      notes: formData.notes,
      orderTotal: this.calculateTotal()
    };

    try {
      const result = await sendOrderConfirmationEmails(order);
      
      if (result.success) {
        this.setState({
          checkoutStep: 2,
          checkoutComplete: true,
          orderStatus: {
            loading: false,
            success: true,
            error: false,
            message: result.message
          }
        });
        
        this.props.clearCart();
      } else {
        this.setState({
          orderStatus: {
            loading: false,
            success: false,
            error: true,
            message: result.message || 'Failed to place your order. Please try again.'
          }
        });
      }
    } catch (error) {
      console.error('Order submission error:', error);
      this.setState({
        orderStatus: {
          loading: false,
          success: false,
          error: true,
          message: 'An unexpected error occurred. Please try again later.'
        }
      });
    }
  };

  resetCheckout = () => {
    this.setState({
      checkoutStep: 0,
      checkoutComplete: false,
      orderStatus: {
        loading: false,
        success: false,
        error: false,
        message: ''
      }
    });
  };

  renderCheckoutForm() {
    const { formData, orderStatus } = this.state;
    
    return (
      <div className="checkout-form">
        <h3>Checkout</h3>
        
        {orderStatus.error && (
          <div className="checkout-error">
            <p>{orderStatus.message}</p>
          </div>
        )}
        
        <form onSubmit={this.handleCheckout}>
          <div className="form-group">
            <label htmlFor="name">Name <span className="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={this.handleFormChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email <span className="required">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={this.handleFormChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone <span className="required">*</span></label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={this.handleFormChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="pickupDate">Pickup Date <span className="required">*</span></label>
            <input
              type="date"
              id="pickupDate"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={this.handleFormChange}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="pickupLocation">Pickup Location <span className="required">*</span></label>
            <select
              id="pickupLocation"
              name="pickupLocation"
              value={formData.pickupLocation}
              onChange={this.handleFormChange}
              required
            >
              <option value="">Select a location</option>
              <option value="Farm Stand - 123 Flower Lane">Farm Stand - 123 Flower Lane</option>
              <option value="Downtown Farmers Market">Downtown Farmers Market</option>
              <option value="East Side Farmers Market">East Side Farmers Market</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Special Instructions</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={this.handleFormChange}
              rows="3"
            ></textarea>
          </div>
          
          <div className="checkout-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => this.setState({ checkoutStep: 0 })}
            >
              Back to Cart
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={orderStatus.loading}
            >
              {orderStatus.loading ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  renderOrderConfirmation() {
    const { orderStatus } = this.state;
    
    return (
      <div className="order-confirmation">
        <div className="confirmation-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <h3>Thank You For Your Order!</h3>
        <p>
          {orderStatus.message || 'Your order has been received and will be processed shortly.'}
        </p>
        <p>
          You will receive a confirmation email with your order details.
        </p>
        <p className="spam-notice">
          <strong>Please check your spam folder if you don't see the email.</strong>
        </p>
        <button
          className="btn-primary"
          onClick={this.resetCheckout}
        >
          Continue Shopping
        </button>
      </div>
    );
  }
} 