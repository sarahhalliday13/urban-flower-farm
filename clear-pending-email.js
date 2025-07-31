// Run this in the browser console on the staging site to clear the pending email
const orderIdToRemove = 'ORD-2025-1018-3384';

// Clear from manualEmails
let manualEmails = JSON.parse(localStorage.getItem('manualEmails') || '[]');
manualEmails = manualEmails.filter(email => email.orderId !== orderIdToRemove);
localStorage.setItem('manualEmails', JSON.stringify(manualEmails));

// Clear from pendingOrderEmails
let pendingEmails = JSON.parse(localStorage.getItem('pendingOrderEmails') || '[]');
pendingEmails = pendingEmails.filter(email => email.orderId !== orderIdToRemove);
localStorage.setItem('pendingOrderEmails', JSON.stringify(pendingEmails));

console.log('Pending email cleared. Refresh the page to see the changes.'); 