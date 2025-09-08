# Deployment Guide

## 🚨 IMPORTANT: Production Safeguards

This project has multiple deployment targets. **Always use targeted deployments** to avoid accidentally deploying to production.

## Deployment Commands

### Safe Deployment (Recommended)

```bash
# Deploy to staging (default)
npm run deploy

# Deploy to staging explicitly
npm run deploy:staging

# Deploy to production (requires double confirmation)
npm run deploy:production
```

### Direct Firebase Commands (Use with caution)

```bash
# Staging only
firebase deploy --only hosting:staging

# Production only (REQUIRES CONFIRMATION)
firebase deploy --only hosting:live

# ⚠️ DANGER: Deploys to BOTH staging and production
firebase deploy  # DO NOT USE
```

## Deployment Workflow

1. **Development** → Always work on development branch
2. **Testing** → Deploy to staging: `npm run deploy:staging`
3. **Review** → Test on https://urban-flower-farm-staging.web.app
4. **Production** → When ready: `npm run deploy:production`

## Production Deployment Checklist

Before deploying to production:

- [ ] All features tested on staging
- [ ] No console errors on staging
- [ ] Order flow works correctly
- [ ] Inventory updates work
- [ ] Email confirmations send properly
- [ ] Mobile responsive design verified

## Emergency Rollback

If you need to restore the Under Construction page:

```bash
cp public/under-construction.html public/index.html
firebase deploy --only hosting:live
```

## Branch Strategy

- `development` - Active development
- `staging` - Staging deployments
- `main` - Production ready code only

## URLs

- **Staging**: https://urban-flower-farm-staging.web.app
- **Production**: https://buttonsflowerfarm-8a54d.web.app