#!/bin/bash

# Deployment script with production safeguards
# Usage: ./deploy.sh [staging|production|both]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to staging
TARGET=${1:-staging}

echo -e "${GREEN}🚀 Urban Flower Farm Deployment Script${NC}"
echo "----------------------------------------"

# Function to deploy to staging
deploy_staging() {
    echo -e "${YELLOW}📦 Building project...${NC}"
    npm run build
    
    echo -e "${GREEN}🚀 Deploying to STAGING...${NC}"
    firebase deploy --only hosting:staging
    
    echo -e "${GREEN}✅ Staging deployment complete!${NC}"
    echo "URL: https://urban-flower-farm-staging.web.app"
}

# Function to deploy maintenance page
deploy_maintenance() {
    echo -e "${YELLOW}🔧 Deploying maintenance page to production${NC}"
    
    if [ ! -f "maintenance-build/index.html" ]; then
        echo -e "${RED}❌ Maintenance page not found at maintenance-build/index.html${NC}"
        exit 1
    fi
    
    # Copy maintenance page to build directory temporarily
    cp maintenance-build/index.html build/index.html
    firebase deploy --only hosting:live
    
    echo -e "${GREEN}✅ Maintenance page deployed!${NC}"
    echo "🔗 https://buttonsflowerfarm.ca"
}

# Function to deploy to production
deploy_production() {
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
    echo -e "${RED}This will OVERWRITE the maintenance page and make the shop LIVE!${NC}"
    echo ""
    echo "Current production site: https://buttonsflowerfarm.ca"
    echo ""
    read -p "Are you SURE you want to deploy to production? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Production deployment cancelled.${NC}"
        exit 0
    fi
    
    # Double confirmation for production
    echo ""
    echo -e "${RED}⚠️  FINAL CONFIRMATION REQUIRED${NC}"
    echo -e "${RED}This will make the full e-commerce site live to customers!${NC}"
    read -p "Please type the word 'PRODUCTION' to confirm: " final_confirm
    
    if [ "$final_confirm" != "PRODUCTION" ]; then
        echo -e "${YELLOW}Production deployment cancelled.${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}📦 Building project...${NC}"
    npm run build
    
    echo -e "${RED}🚀 Deploying to PRODUCTION...${NC}"
    firebase deploy --only hosting:live
    
    echo -e "${GREEN}✅ Production deployment complete!${NC}"
    echo "🔗 https://buttonsflowerfarm.ca"
}

# Main logic
case $TARGET in
    staging)
        deploy_staging
        ;;
    maintenance)
        deploy_maintenance
        ;;
    production|prod|live)
        deploy_production
        ;;
    both)
        deploy_staging
        echo ""
        echo "----------------------------------------"
        echo ""
        deploy_production
        ;;
    functions)
        echo -e "${GREEN}🔧 Deploying Firebase Functions${NC}"
        firebase deploy --only functions
        echo -e "${GREEN}✅ Functions deployment complete!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid target: $TARGET${NC}"
        echo ""
        echo "Usage: ./deploy.sh [option]"
        echo ""
        echo "Options:"
        echo "  staging      - Deploy to staging environment (safe, default)"
        echo "  maintenance  - Deploy maintenance page to production"
        echo "  production   - Deploy full app to production (requires confirmation)"
        echo "  functions    - Deploy Firebase Functions only"
        echo "  both         - Deploy to staging then production"
        echo ""
        echo "Examples:"
        echo "  ./deploy.sh staging"
        echo "  ./deploy.sh maintenance"
        echo ""
        echo -e "${YELLOW}⚠️  Never use 'firebase deploy' directly - use this script!${NC}"
        exit 1
        ;;
esac