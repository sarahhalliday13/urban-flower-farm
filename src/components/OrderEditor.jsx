const handleSaveOrder = async () => {
  setSaving(true);
  try {
    const user = await ensureAuthenticated();
    const token = await user.getIdToken();
    
    console.log('🔄 Saving order changes...');
    const update = {
      items: currentItems,
      status: 'pending',
      totalPrice: calculateTotal(),
      lastModified: new Date().toISOString()
    };
    
    console.log('📤 Order update payload:', update);
    console.log('🔑 Using token (first 10 chars):', token.substring(0, 10) + '...');
    
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}?auth=${token}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(update)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    console.log('✅ Order saved successfully');
    setSaving(false);
    setSaveMessage('Changes saved successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  } catch (error) {
    console.error('❌ Error updating order:', error);
    setSaving(false);
    setSaveMessage('Failed to save order changes: ' + error.message);
  }
};

const handleFinalizeOrder = async () => {
  setFinalizing(true);
  try {
    const user = await ensureAuthenticated();
    const token = await user.getIdToken();
    
    console.log('🔄 Finalizing order...');
    const update = {
      status: 'completed',
      finalizedDate: new Date().toISOString(),
      items: currentItems
    };
    
    console.log('📤 Order finalize payload:', update);
    console.log('🔑 Using token (first 10 chars):', token.substring(0, 10) + '...');
    
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/finalize?auth=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(update)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    console.log('✅ Order finalized successfully');
    setFinalizing(false);
    setStatus('completed');
    setSaveMessage('Order finalized successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  } catch (error) {
    console.error('❌ Error finalizing order:', error);
    setFinalizing(false);
    setSaveMessage('Failed to finalize order: ' + error.message);
  }
}; 