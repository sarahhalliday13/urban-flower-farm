// Customer data management service

export const saveCustomerData = (customerData) => {
  try {
    const existingData = getCustomerData();
    const updatedData = {
      ...existingData,
      ...customerData,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('customerData', JSON.stringify(updatedData));
    return true;
  } catch (error) {
    console.error('Error saving customer data:', error);
    return false;
  }
};

export const getCustomerData = () => {
  try {
    const data = localStorage.getItem('customerData');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting customer data:', error);
    return null;
  }
};

export const clearCustomerData = () => {
  try {
    localStorage.removeItem('customerData');
    return true;
  } catch (error) {
    console.error('Error clearing customer data:', error);
    return false;
  }
}; 