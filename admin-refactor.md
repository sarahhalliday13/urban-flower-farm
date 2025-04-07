✅ Maintain current **data structure**, **Firebase logic**, and **frontend bindings**.

---

## 🔐 Firebase Usage Guidelines

- Use service helpers only:
  - `getAllPlants`, `getPlant`, `addPlant`, `updatePlant`, `deletePlant`, `getOrders`
- Do **not** use `getDatabaseRef()` or raw `onValue()` listeners unless absolutely necessary
- All read/write operations must be abstracted through service files

---

## 🧭 Environment & Branching Rules

- ✅ All dev work happens on the `development` branch or its feature branches
- 🚫 Never push to `main`
- ✅ Final build merges go into `working-build` (used for production deployment)
- 🚫 Firebase emulators are no longer used
- ✅ Always connect to **live Firebase instance**

---

## ✅ Phase Progress Checklist

### `/admin/inventory`
- [x] Firebase reads/writes switched to service helpers
- [x] `ModularInventoryManager` component implemented
- [x] Subcomponents created: `InventoryTableRow`, `EditableStatusCell`, `InventoryHeader`, etc.
- [x] Live data integration tested
- [x] UI refactor complete: sorting, filtering, editing, tab switching
- [x] `App.js` safely updated to mount new modular component
- [x] `inventory/index.js` barrel export created for cleaner imports
- [x] UI verified across major screen sizes
- [x] Real-time Firebase syncing confirmed

### `/admin/orders`
- [ ] Create `ModularOrdersManager` component
- [ ] Break out reusable components (OrderRow, OrderNotes, StatusDropdown)
- [ ] Review/update context and fetch logic
- [ ] Modularize layout and sidebar filters
- [ ] Add loading/error states and sort behavior
- [ ] Confirm all order updates sync with Firebase + Inventory

### `/admin/editaddplant`
- [ ] Create subcomponents for form sections (BasicInfo, MediaUpload, VisibilityToggles, etc.)
- [ ] Ensure image upload and toggle logic uses latest Firebase helpers
- [ ] Wire up existing data prefill/edit experience
- [ ] Validate form inputs and submission
- [ ] Add toast feedback + inline form validation

---

## 🛡️ Next Up
- [ ] Verify button + navigation interactivity across `/admin` routes
- [ ] Phase 2: Refactor `/admin/orders`
- [ ] Phase 3: Refactor `/admin/editaddplant`
- [ ] Final QA: UI/UX testing and browser compatibility
- [ ] Add PR review checklist per admin section

---

> 🔁 This plan is meant to support structured progress, maintain frontend stability, and enable rapid rollback if needed. Always test against live Firebase with real data.
