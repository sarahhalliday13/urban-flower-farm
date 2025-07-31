# Firebase Token Setup for GitHub Actions

To complete the CI/CD setup, you need to create a Firebase service account and add it to GitHub as a secret:

## Step 1: Generate Firebase Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/project/buttonsflowerfarm-8a54d/settings/serviceaccounts/adminsdk)
2. Click on "Project settings" (gear icon)
3. Go to "Service accounts" tab
4. Click "Generate new private key" button
5. Save the JSON file (don't share this with anyone)

## Step 2: Add the Secret to GitHub

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Name: `FIREBASE_SERVICE_ACCOUNT`
6. Value: Copy and paste the entire contents of the JSON file
7. Click "Add secret"

## Using the CI/CD Workflow

Now that the CI/CD is set up, here's how to use it effectively:

### For Regular Development

1. Make changes to your code locally
2. Commit changes to the development branch
3. Push to GitHub: `git push origin development`
4. The workflow will automatically build and deploy to staging
5. Check the Actions tab on GitHub to monitor deployment progress

### To Revert Changes

Option 1: Create a revert commit
```bash
git revert [commit-hash]
git push origin development
```

Option 2: Manually redeploy a previous version
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to "Hosting" section
3. Find your staging site
4. Click "View release history"
5. Find the version you want to restore
6. Click the three dots menu → "Rollback"

### Testing Your Changes

After the automatic deployment completes:
1. Visit https://urban-flower-farm-staging.web.app
2. Verify your changes work as expected
3. If everything looks good, you can then deploy to production manually:
   ```bash
   firebase deploy --only hosting:production
   ``` 