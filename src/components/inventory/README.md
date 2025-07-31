# Inventory Management Components

This directory contains modular components for the inventory management system, refactored from the original monolithic `InventoryManager.js` component.

## Component Structure

### Main Component
- `ModularInventoryManager.js`: The main container component that orchestrates all inventory management functionality.

### UI Components
- `InventoryHeader.js`: The header section with filters and action buttons.
- `InventoryTable.js`: The table component displaying the inventory data.
- `InventoryTableHeader.js`: The header row for the inventory table with sorting functionality.
- `InventoryTableRow.js`: Individual row component for each plant in the inventory.
- `InventoryFilterControls.js`: Filter and search controls for inventory data.

### Reusable Cell Components
- `EditableStockCell.js`: Cell component for editing stock quantity.
- `EditableStatusCell.js`: Cell component for editing product status.
- `EditableDateCell.js`: Cell component for editing restock dates.
- `EditableToggleCell.js`: Cell component for boolean toggles (featured, hidden).

### Utility
- `index.js`: Exports all components for easier imports.

## Data Flow

The ModularInventoryManager component:
1. Fetches plant data from Firebase via AdminContext
2. Maintains state for editing, filtering, and sorting
3. Passes data and handlers down to child components
4. Handles real-time updates via Firebase subscriptions

## Usage

To use the inventory management system:

```jsx
import { ModularInventoryManager } from './components/inventory';

// Then in your component:
<ModularInventoryManager />
```

## Features

- Real-time inventory updates
- Inline editing of inventory data
- Filtering by status
- Sorting by any column
- Search functionality
- Status count summaries
- Unknown status detection and fixing

## Code Conventions

- Components use functional style with React hooks
- State management via useCallback, useState, and useMemo
- Side effects managed with useEffect and cleanup functions
- Props destructuring for clarity
- Component composition for maintainability

## Notes for Future Development

- Plant form editing functionality could be further modularized
- Add unit tests for each component
- Consider using React Context for state that needs to be shared across deeply nested components 