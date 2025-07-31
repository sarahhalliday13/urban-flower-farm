# Admin Refactor – Orders Page (`/admin/orders`)

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
