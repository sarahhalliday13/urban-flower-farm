# 🚀 Safe Deployment Guide for Urban Flower Farm

## ⚠️ IMPORTANT: Never use `firebase deploy` directly!

Always use the provided scripts to prevent accidental production deployments.

## Deployment Options

### 1. Deploy to Staging (Safe, Default)
```bash
./deploy.sh staging
# or just
./deploy.sh
```

### 2. Deploy Maintenance Page to Production
```bash
./deploy.sh maintenance
```

### 3. Deploy Full App to Production (Requires Double Confirmation)
```bash
./deploy.sh production
```

### 4. Deploy Firebase Functions Only
```bash
./deploy.sh functions
```

### 5. Using NPM Scripts (Alternative)
```bash
npm run deploy:staging      # Safe staging deployment
npm run deploy:maintenance  # Deploy maintenance page
npm run deploy:functions    # Functions only
```

## Production Safeguards

The production deployment has multiple safeguards:
1. **Warning messages** about overwriting maintenance page
2. **First confirmation** - type "yes"
3. **Second confirmation** - type "PRODUCTION"
4. Only then will it deploy

## Current Environment URLs

- **Production**: https://buttonsflowerfarm.ca (currently showing maintenance page)
- **Staging**: https://urban-flower-farm-staging.web.app (for testing)

## Maintenance Page Location

The maintenance page is stored in: `/maintenance-build/index.html`

## What NOT to Do

❌ `firebase deploy` - This deploys to BOTH environments!  
❌ `firebase deploy --only hosting` - Still deploys to both!  
✅ Use the scripts above instead

## Emergency: Restore Maintenance Page

If you accidentally deploy to production:
```bash
./deploy.sh maintenance
```

This will quickly restore the maintenance page.