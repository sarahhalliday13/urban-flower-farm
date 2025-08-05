# Branch and Deployment Guidelines

## Branch Structure

- `development` - Feature development branch (staging environment)
- `working-build` - Production branch

## Critical Rules

1. **Development Work**
   - All development must be done on `development` branch
   - Work must be performed in staging environment
   - No direct work on production branch

2. **Deployment Process**
   - All deployments must go through Firebase Hosting
   - No direct deployments to production unless explicitly directed
   - Follow deployment checklist in PROJECT_SUMMARY.md

3. **Version Control**
   - No commits to GitHub unless explicitly directed
   - No pushing to production unless explicitly authorized
   - Keep local branch in sync with remote

## Deployment Workflow

1. Make changes on `development`
2. Run `npm run build` to generate frontend build
3. Deploy functions (if needed): `firebase deploy --only functions`
4. Deploy site: `firebase deploy`
5. Confirm success on Firebase Console

## Important Notes

- Always verify current branch before making changes
- Do not merge to `working-build` without authorization
- Monitor Firebase console for logs, errors, and usage
- Security and stability are priority #1 