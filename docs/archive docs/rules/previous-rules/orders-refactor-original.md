# Admin Refactor – Orders Page (`/admin/orders`) - Original Version April 2025

> **Archived Note**: This document has been superseded by `/docs/ai-guidelines/04-admin-refactoring.md` and `/docs/ai-guidelines/05-order-system.md`. Maintained for historical context and reference.

## 🎯 Objective
Refactor the existing `/admin/orders` page to be modular, efficient, and maintainable. The goal is to improve performance, UI structure, and code readability **without touching customer flows or affecting checkout data integrity**.

---

## 🧩 Refactor Goals

- Modularize reusable pieces (rows, notes, status UI)
- Remove legacy props and unused logic
- Connect to Firebase using service helpers
- Maintain real-time reflection of customer order flow
- Improve UI clarity and performance

---

## 🔐 DO NOT TOUCH

- 🚫 Checkout logic  
- 🚫 Order creation pipeline  
- 🚫 Customer cart or payment functionality  
- 🚫 Inventory flow outside the context of order sync

Use ONLY:
```js
getOrders(), updateOrder(), deleteOrder(), fetchOrderNotes()
```

> **Historical Note**: This document was created as part of the initial orders page refactoring effort in April 2025. While the core requirements and restricted areas remain valid, please refer to the current AI guidelines for the most up-to-date implementation details. 