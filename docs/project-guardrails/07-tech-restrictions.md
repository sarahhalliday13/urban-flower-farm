# Technology Restrictions and Dependencies

## TypeScript Status

### Removal Information
- Removed: March 2025
- Reason: Build issues
- Current Status: Complete
- Production Bundle: `main.438649a8.chunk.js`

### TypeScript Restrictions
- No `.ts` files allowed
- No `.tsx` files allowed
- No TypeScript configurations
- No TypeScript dependencies

## Core Dependencies

### Required Versions
```json
{
  "react": "16.14.0",
  "firebase": "11.4.0",
  "node": ">=18.17.0",
  "npm": ">=9.0.0"
}
```

### Version Requirements
- Must maintain specified versions
- No unauthorized upgrades
- Test thoroughly if versions must change
- Document any version changes

## Build System

### Current Configuration
- Using standard React build system
- Firebase deployment integration
- No TypeScript compilation
- Standard JavaScript processing

### Build Requirements
- Maintain current build process
- No additional build steps
- Keep build time optimized
- Preserve build artifacts

## Development Environment

### IDE Configuration
- JavaScript-focused setup
- No TypeScript plugins required
- Standard React tooling
- Firebase development tools

### Development Tools
- Firebase CLI
- React Developer Tools
- Standard JavaScript tooling
- No TypeScript-specific tools

## Important Notes

1. **TypeScript**
   - Do not reintroduce TypeScript
   - Remove any TypeScript files found
   - Convert any TypeScript code to JavaScript
   - Remove TypeScript configurations

2. **Dependencies**
   - Maintain specified versions
   - Test thoroughly before updates
   - Document any changes
   - Keep package.json clean

3. **Build Process**
   - Maintain current process
   - No additional complexity
   - Keep build times fast
   - Monitor build output

4. **Development**
   - Use JavaScript best practices
   - Follow existing patterns
   - Maintain code quality
   - Document thoroughly 