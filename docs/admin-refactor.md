# Admin Pages Refactor – Developer Guide

This refactor includes three key admin views:
- `/admin/orders`
- `/admin/inventory`
- `/admin/editaddplant`

**Do not begin refactoring all pages at once. Please follow this sequence:**

1. Start with `/admin/orders` – it’s the most complex, and its functionality is tied to inventory  
2. Once Orders is complete and verified, move to `/admin/inventory`  
3. Refactor `/admin/editaddplant` last (it feeds into both Orders and Inventory, and benefits from their updates)

➤ Refer to `admin-refactor.md` for complete specs and business logic  
➤ Do not modify customer-facing views or logic  
➤ Login must redirect to `/admin/dashboard` and remain protected  
➤ Preserve existing integrations with checkout, invoice generation, and frontend plant data

---

## `/admin/orders` Refactor – Developer Task List

### Core Feature Preservation
- [ ] Preserve order number format `ORD-YYYY-XXXX` (starts at 1017 for 2025)
- [ ] Ensure checkout still updates inventory and reflects in dashboard
- [ ] Maintain printable invoice layout and content (business/customer info, item table, payment instructions)

### Feature Enhancements
- [ ] Add Notes field (customer comments) to order detail view
- [ ] Enable editing of existing orders (pricing, quantity, add/remove flowers)
- [ ] Add manual **dollar-value** discount field (no percentage discounts)
- [ ] Add payment method field (Cash, E-transfer, Prepaid)
- [ ] Add payment timing field (e.g. Paid on Pickup)
- [ ] Add preliminary invoice support (generate, edit, finalize)

### UI/Code Improvements
- [ ] Refactor filters + search into a separate component
- [ ] Extract status + invoice logic into helper/service layer
- [ ] Replace render block with a compact, modular row component
- [ ] Reduce padding/whitespace for better readability on mobile/tablet

### Validation
- [ ] Ensure all edits correctly update totals and recreate invoices
- [ ] Validate consistent behavior between staging and production

---

