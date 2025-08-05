# Testing Documentation

This directory contains test-related documentation and guidelines for the Urban Flower Farm project.

## Directory Structure

- `manual/` - Manual test cases and procedures
- `guides/` - Testing guides and best practices
- `fixes/` - Documentation of test-related fixes and improvements

## Test Organization

1. **Component Tests**
   - Live in `__tests__` folder beside the component
   - Follow structure:
     - `describe('functionality', ...)`
     - `describe('accessibility', ...)`
     - `describe('snapshot', ...)` (optional)

2. **Integration Tests**
   - Located in `/src/__tests__/`
   - Test full page/screen functionality
   - Test component interactions

3. **Test Utilities**
   - Located in `/src/__tests__/testUtils.js`
   - Shared mock data and helper functions
   - Used across all test files

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test

# Run tests in watch mode
npm test -- --watch
```

## Test Guidelines

1. **Component Tests**
   - Test component in isolation
   - Mock external dependencies
   - Test user interactions
   - Verify accessibility

2. **Integration Tests**
   - Test component interactions
   - Test data flow
   - Test routing/navigation
   - Test error scenarios

3. **Manual Tests**
   - Follow procedures in `manual/` directory
   - Document test results
   - Update test cases as needed 