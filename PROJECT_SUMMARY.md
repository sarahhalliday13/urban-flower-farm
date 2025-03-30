# Button's Flower Farm - Project Summary

## Project Overview
- React-based e-commerce site for a flower farm
- Uses Firebase for backend (database, authentication)
- Deployed on Netlify
- Currently on branch `working-build` for production, with `development` for new features

## Deployment Setup
- **Continuous Deployment**: Git pushes to the `working-build` branch automatically trigger Netlify deployments
- **Build Command**: `node firebase-cors-build.js` (specified in netlify.toml)
- **Publish Directory**: `build`
- **Branch**: `working-build` (production branch)

## ⚠️ IMPORTANT: STRICTLY FOLLOW THESE GUIDELINES
**DO NOT MAKE UNAUTHORIZED CHANGES TO:**
1. **Page layouts** - The shop, product layouts, and site structure are FINAL
2. **Styling** - CSS modifications require explicit permission
3. **Component structure** - Do not refactor working components
4. **Adding libraries** - No new dependencies without approval

**ALWAYS ASK BEFORE:**
- Changing any visual elements
- "Improving" or "modernizing" the UI
- Refactoring working code
- Adding new packages

Every unauthorized change causes unpredictable bugs and breaks established functionality. If you're unsure, ASK FIRST. Any developer making unauthorized layout or style changes will be removed from the project.

## ✅ TypeScript Removal - COMPLETED
In March 2025, TypeScript was completely removed from the project as it was causing severe build issues. This removal:
- Eliminated build failures due to type errors
- Improved development workflow
- Fixed Netlify deployment problems
- Resolved IDE performance issues

The TypeScript-free version is now in production with `main.438649a8.chunk.js` as the primary JavaScript bundle.

## Recent Deployment Issues & Solutions

### 1. Firebase Connectivity Issues
**Problem:** Firebase requests were failing with:
- Content Security Policy (CSP) violations blocking connections
- CORS errors preventing data fetching
- Connection timeouts

**Solution:** 
- Created `firebase-fix-for-app.js` to inject permissive CSP headers
- Added CORS proxying for failed Firebase requests
- Updated WebSocket handling for realtime database connections
- Implemented fetch interception pattern for Firebase URLs

**Implementation:**
- `firebase-fix-for-app.js`: The core fix script
- `firebase-cors-build.js`: Custom build script
- `inject-firebase-fix.js`: Script to inject fix into built HTML
- Modified `netlify.toml` to use our build script

### 2. Development Workflow
**Best Practice:** For development and testing:
- Build the project with `node firebase-cors-build.js`
- Test locally with `npx serve -s build`
- Deploy with Netlify CLI using `npx netlify deploy --prod` if needed

### 3. Netlify Deployment Configuration
**Solution:**
- Streamlined `netlify.toml` configuration
- Set environment variables in netlify.toml:
  ```
  DISABLE_TYPESCRIPT = "true"
  SKIP_TYPESCRIPT_CHECK = "true"
  TSC_COMPILE_ON_ERROR = "true"
  SKIP_PREFLIGHT_CHECK = "true"
  ```
- Used direct build command: `node firebase-cors-build.js`

## Branch Structure
- `working-build`: Current production branch (deployed to Netlify)
- `development`: Development branch (copy of working-build for new features)
- `no-typescript-dev`: Branch created during TypeScript removal (now merged to working-build)

## Deployment Workflow
1. Make changes on `development` branch
2. Test thoroughly locally with `node firebase-cors-build.js` and `npx serve -s build`
3. When ready, merge to `working-build`
4. Push `working-build` to GitHub
5. Netlify automatically detects the push and deploys the changes
6. If needed, deploy directly with `npx netlify deploy --prod`

## Key Files
- `firebase-fix-for-app.js`: Core fix for Firebase CORS/CSP issues
- `firebase-cors-build.js`: Build script incorporating the fix
- `inject-firebase-fix.js`: Script to inject fix into build
- `netlify.toml`: Deployment configuration (controls automatic deployments)

## Dependencies
- React 16.14.0
- Firebase 11.4.0
- Node >=18.17.0
- NPM >=9.0.0

## Notes
- The Firebase fix is sensitive to changes in `netlify.toml`
- Always use the `working-build` branch for production deployments
- Keep an eye on Firebase console for authentication/database changes
- Netlify deployment logs are essential for debugging build issues
- TypeScript has been completely removed - DO NOT add any .ts or .tsx files 