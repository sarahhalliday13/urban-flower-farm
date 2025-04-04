#!/bin/bash
# setup-local.sh
# Sets up the local environment for development with Firebase emulators
# WITHOUT affecting production code or leaking secrets

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up local development environment...${NC}"

# Create a local config directory if it doesn't exist
LOCAL_CONFIG_DIR=".local-config"
mkdir -p $LOCAL_CONFIG_DIR

# Step 1: Create a local .env file for SendGrid API Key
if [ ! -f "$LOCAL_CONFIG_DIR/sendgrid.key" ]; then
  echo -e "${YELLOW}SendGrid API key not found. Please enter your SendGrid API key:${NC}"
  read -s SENDGRID_API_KEY
  echo $SENDGRID_API_KEY > "$LOCAL_CONFIG_DIR/sendgrid.key"
  echo -e "${GREEN}SendGrid API key saved to $LOCAL_CONFIG_DIR/sendgrid.key${NC}"
else
  SENDGRID_API_KEY=$(cat "$LOCAL_CONFIG_DIR/sendgrid.key")
  echo -e "${GREEN}Using existing SendGrid API key from $LOCAL_CONFIG_DIR/sendgrid.key${NC}"
fi

# Step 2: Backup and create custom firebase.json for local development
if [ ! -f "$LOCAL_CONFIG_DIR/firebase.json.backup" ]; then
  cp firebase.json "$LOCAL_CONFIG_DIR/firebase.json.backup"
  echo -e "${GREEN}Backed up original firebase.json${NC}"
fi

# Create local firebase.json with fixed ports
cat > firebase.json << EOL
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "port": 5003
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ],
  "emulators": {
    "functions": {
      "port": 5002
    },
    "ui": {
      "enabled": true,
      "port": 4003
    },
    "hub": {
      "port": 4100
    },
    "logging": {
      "port": 4600
    },
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8085
    },
    "database": {
      "port": 9000
    },
    "pubsub": {
      "port": 8086
    },
    "storage": {
      "port": 9199
    }
  }
}
EOL
echo -e "${GREEN}Created local Firebase configuration with fixed ports${NC}"

# Step 3: Update the functions/.env with the SendGrid API key
if [ -f "functions/.env" ]; then
  # Backup original .env if it doesn't exist
  if [ ! -f "$LOCAL_CONFIG_DIR/functions.env.backup" ]; then
    cp functions/.env "$LOCAL_CONFIG_DIR/functions.env.backup"
    echo -e "${GREEN}Backed up original functions/.env${NC}"
  fi
  
  # Update .env with SendGrid API key
  sed -i.bak "s/SENDGRID_API_KEY=.*/SENDGRID_API_KEY=$SENDGRID_API_KEY/" functions/.env
  sed -i.bak "s/REACT_APP_SENDGRID_API_KEY=.*/REACT_APP_SENDGRID_API_KEY=$SENDGRID_API_KEY/" functions/.env
  rm functions/.env.bak
  echo -e "${GREEN}Updated functions/.env with SendGrid API key${NC}"
else
  echo -e "${RED}Error: functions/.env not found. Please create it first.${NC}"
  exit 1
fi

# Step 4: Set up Firebase config for the emulator
echo -e "${YELLOW}Setting up Firebase config for the emulator...${NC}"
cd functions

# Create or update .runtimeconfig.json
cat > .runtimeconfig.json << EOL
{
  "sendgrid": {
    "api_key": "$SENDGRID_API_KEY"
  }
}
EOL
echo -e "${GREEN}Created .runtimeconfig.json for Firebase emulator${NC}"

cd ..

# Step 5: Add local-only files to .gitignore (if not already there)
if ! grep -q "$LOCAL_CONFIG_DIR" .gitignore; then
  echo "" >> .gitignore
  echo "# Local dev configuration - NEVER COMMIT THESE" >> .gitignore
  echo "$LOCAL_CONFIG_DIR/" >> .gitignore
  echo "functions/.runtimeconfig.json" >> .gitignore
  echo -e "${GREEN}Updated .gitignore to exclude local configuration files${NC}"
fi

echo -e "${GREEN}Local development environment set up successfully!${NC}"
echo -e "${YELLOW}To start the emulator, run:${NC}"
echo -e "  cd functions && npm run serve"
echo -e "${YELLOW}To restore production settings before committing, run:${NC}"
echo -e "  ./restore-prod.sh"

# Create restore script
cat > restore-prod.sh << 'EOL'
#!/bin/bash
# restore-prod.sh
# Restores production configuration before committing

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restoring production configuration...${NC}"

LOCAL_CONFIG_DIR=".local-config"

# Restore firebase.json
if [ -f "$LOCAL_CONFIG_DIR/firebase.json.backup" ]; then
  cp "$LOCAL_CONFIG_DIR/firebase.json.backup" firebase.json
  echo -e "${GREEN}Restored original firebase.json${NC}"
else
  echo -e "${RED}No firebase.json backup found!${NC}"
fi

# Restore functions/.env
if [ -f "$LOCAL_CONFIG_DIR/functions.env.backup" ]; then
  cp "$LOCAL_CONFIG_DIR/functions.env.backup" functions/.env
  echo -e "${GREEN}Restored original functions/.env${NC}"
else
  echo -e "${RED}No functions/.env backup found!${NC}"
fi

# Remove runtime config
if [ -f "functions/.runtimeconfig.json" ]; then
  rm functions/.runtimeconfig.json
  echo -e "${GREEN}Removed functions/.runtimeconfig.json${NC}"
fi

echo -e "${GREEN}Production configuration restored.${NC}"
echo -e "${YELLOW}You can now safely commit your changes.${NC}"
EOL

chmod +x restore-prod.sh
echo -e "${GREEN}Created restore-prod.sh script${NC}" 