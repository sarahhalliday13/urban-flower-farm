Post-Deploy Email System Checklist

File: /docs/EMAIL_SYSTEM_CHECKLIST.md

✅ Deployment Verification Steps (Invoices + Order Confirmations)

Whenever Firebase Functions are deployed, follow this checklist to ensure email functionality remains stable:

1. Check Basic Deployment
 Confirm sendOrderEmail function deployed successfully (no errors in Firebase Console)
 Confirm React app build (npm run build) completed and deployed (if frontend email flow was changed)
2. Run Automated Tests
Invoice Email Test:

cd functions
npm run test-invoice
 Verify successful response (✅ Test invoice email sent successfully.)
 Check Gmail inbox for Invoice Email
Subject should be: Invoice for Order - ORD-TEST-<timestamp>
Only one email (no duplicates)
Invoice HTML format should render properly (logo, item list, total, payment instructions)
Optional Stress Test:

cd functions
npm run test-invoice-stress
 Confirm 5 invoice emails are sent successfully without errors
 Verify no duplicate emails for any single order
 Confirm all email subjects are unique (different order IDs)
3. Sanity Check Real Frontend Behavior
 Log in to /admin/orders
 Pick a real existing order
 Use the "Email Invoice" button
 Verify:
No duplicate emails sent
Correct invoice template is used
No console errors in browser dev tools
4. Firebase Logs Review
In Firebase Console > Functions > Logs:

 Search for sendOrderEmail
 Confirm logs show:
Email type: INVOICE (for invoice emails)
Email type: ORDER CONFIRMATION (for new orders)
Proper status codes from SendGrid (typically 202)
No uncaught errors
🧹 Quick Troubleshooting if Errors Found

Problem	Likely Cause	Quick Fix
Multiple emails sent	isInvoiceEmail flag missing or ignored	Check if flag is passed from frontend and honored in function
Wrong subject line	Subject logic broken	Review sendOrderEmail.js subject setup
Invoice using wrong template	Template function mismatch	Ensure generateInvoiceEmailTemplate is called correctly
No email received	SendGrid API key missing or expired	Check Firebase function config
Function deploy fails	Node version or SDK mismatch	Update firebase-functions and firebase-admin packages
📚 Related Commands

Purpose	Command
Deploy Firebase Function	firebase deploy --only functions:sendOrderEmail
Deploy Hosting	firebase deploy --only hosting
Test single invoice email	npm run test-invoice
Stress test invoice emails	npm run test-invoice-stress
View Firebase logs	firebase functions:log
📝 Notes

Production Reminder: Invoices should only send to customer, not admin.
Testing Accounts: Use sarah.halliday+testinvoice@gmail.com for non-production invoice testing.
Versioning: Update this checklist if new email types are introduced.
✨ End of Checklist