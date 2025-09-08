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

# Function to deploy to production
deploy_production() {
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
    echo -e "${RED}This will make changes live to all customers.${NC}"
    echo ""
    read -p "Are you SURE you want to deploy to production? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Production deployment cancelled.${NC}"
        exit 0
    fi
    
    # Double confirmation for production
    echo ""
    echo -e "${RED}⚠️  FINAL CONFIRMATION REQUIRED${NC}"
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
    echo "URL: https://buttonsflowerfarm-8a54d.web.app"
}

# Main logic
case $TARGET in
    staging)
        deploy_staging
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
    *)
        echo -e "${RED}Invalid target: $TARGET${NC}"
        echo "Usage: ./deploy.sh [staging|production|both]"
        echo "  staging    - Deploy to staging (default)"
        echo "  production - Deploy to production (requires confirmation)"
        echo "  both       - Deploy to staging then production"
        exit 1
        ;;
esac