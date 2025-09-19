import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { GiftCertificate } from './GiftCertificate';

function GiftCertificateView() {
  const { orderId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // Get parameters from URL or use defaults
  const amount = parseFloat(queryParams.get('amount')) || 25;
  const purchaser = queryParams.get('from') || '';
  
  return (
    <GiftCertificate 
      initialAmount={amount}
      orderNumber={orderId}
      purchaserName={purchaser}
    />
  );
}

export default GiftCertificateView;