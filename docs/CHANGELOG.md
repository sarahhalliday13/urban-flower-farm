# Changelog
All notable changes to the Buttons Flower Farm website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Improved news component system with cross-platform synchronization
- Light green background for homepage news box for better visual distinction
- Shared localStorage system connecting admin updates with public views
- More comprehensive error handling for network issues

### Changed
- Optimized news loading by replacing Firebase queries with local data
- Left-aligned all text in news components for improved readability
- Simplified admin interface with emoji-based action buttons
- News box now resets visibility after 20 minutes

### Fixed
- Fixed alignment issues in Featured Flowers section
- Resolved issue with news updates not appearing on homepage
- Improved mobile responsiveness for news items

## [1.0.0] - 2023-11-15

### Added
- Complete plant catalog with 300+ plants and high-quality images
- Search functionality with real-time filtering of results
- Product sorting and filtering capabilities
- Shopping cart with persistent storage
- Checkout process with form validation
- Order management system for customers and administrators
- Admin dashboard for inventory and order management
- Plant details pages with comprehensive information
- Navigation system with responsive design
- FAQ section with accordion-style display

### Fixed
- Router nesting issues causing navigation problems
- Email validation in checkout form
- Inventory synchronization between admin and customer views

### Known Issues
- Payment gateway integration pending
- Mobile scrolling behavior needs refinement in some sections

## Release Projections

### [1.1.0] - Expected Q1 2024
- Payment gateway integration
- User accounts with order history
- Wishlist functionality
- Improved mobile experience

### [1.5.0] - Expected Q2 2024
- Subscription service for plant availability notifications
- Plant care guides and content section
- Customer reviews and ratings
- Enhanced search with plant characteristics filtering

### [2.0.0] - Expected Q4 2024
- Integrated blog with gardening tips
- Personalized recommendations based on purchase history
- Virtual garden planning tool
- Customer loyalty program

---

## How to Update This Changelog

1. Add changes to the [Unreleased] section during development
2. When releasing a new version:
   - Change the [Unreleased] heading to the new version number and release date
   - Add a new [Unreleased] section at the top
3. Group changes into Added, Changed, Deprecated, Removed, Fixed, and Security sections
4. Keep descriptions clear, concise, and user-focused
5. Update Release Projections as plans evolve 