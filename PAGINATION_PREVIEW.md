# Mobile Pagination Design

## Visual Appearance

The new mobile pagination for plant details looks like this:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  [Plant Image]                                  │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  ◀  │       2 / 15       │  ▶  │        │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Plant Name                                     │
│  Scientific Name                                │
│                                                 │
│  [Product Details...]                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Features

1. **Compact Design**: Takes minimal vertical space
2. **Current Position**: Shows "2 / 15" (current plant / total plants)
3. **Round Navigation Buttons**: Simple "◀" and "▶" buttons
4. **Swipe Support**: Users can swipe left/right to navigate between plants
5. **Mobile-Only**: Only appears on smaller screens, desktop uses the standard navigation

## Code Implementation

The pagination component is implemented as:

```jsx
// Mobile pagination component
const MobilePagination = () => (
  <div className="mobile-pagination">
    <button 
      className={`mobile-page-btn prev ${!hasPrevious ? 'disabled' : ''}`}
      onClick={() => handleNavigation('prev')}
      disabled={!hasPrevious}
      aria-label="Previous plant"
    >
      &lt;
    </button>
    
    <div className="pagination-info">
      <span className="current-page">{currentIndex + 1}</span>
      <span className="page-separator">/</span>
      <span className="total-pages">{plantIds.length}</span>
    </div>
    
    <button 
      className={`mobile-page-btn next ${!hasNext ? 'disabled' : ''}`}
      onClick={() => handleNavigation('next')}
      disabled={!hasNext}
      aria-label="Next plant"
    >
      &gt;
    </button>
  </div>
)
```

## CSS Styling

The pagination has these key styles:

```css
.mobile-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: #f9f9f9;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mobile-page-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 50%;
  font-size: 18px;
  color: #2c5530;
  cursor: pointer;
  transition: all 0.2s;
}

.current-page {
  font-weight: bold;
  color: #2c5530;
  font-size: 16px;
}
```

## Touch/Swipe Navigation

Users can swipe left/right on mobile to navigate between plants:

```jsx
// Handle touch events for swiping
const handleTouchStart = (e) => {
  touchStartX.current = e.touches[0].clientX;
};

const handleTouchMove = (e) => {
  touchEndX.current = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  if (!touchStartX.current || !touchEndX.current) return;
  
  const diffX = touchStartX.current - touchEndX.current;
  const threshold = 50; // Minimum distance to detect swipe
  
  if (Math.abs(diffX) > threshold) {
    if (diffX > 0 && hasNext) {
      // Swiped left - go to next
      handleNavigation('next');
    } else if (diffX < 0 && hasPrevious) {
      // Swiped right - go to previous
      handleNavigation('prev');
    }
  }
  
  // Reset values
  touchStartX.current = null;
  touchEndX.current = null;
};
```

## Responsive Behavior

- Only shows on mobile screens (< 768px)
- Gets smaller on very small screens (< 576px)
- Desktop continues to use the original navigation buttons

To view this in action, you would:
1. Run the development server with `npm start` (after installation completes)
2. Navigate to a plant details page
3. Use developer tools to view in mobile mode
4. Try the pagination buttons or swipe gestures 