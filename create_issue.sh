#!/bin/bash
TOKEN="$1"
TITLE="[Phase 2] Admin Refactor – Component Cleanup & UI Restructure"
BODY_FILE="issue_body.md"
BODY=$(cat $BODY_FILE)
JSON_DATA="{\"title\":\"$TITLE\",\"body\":\"$BODY\"}"
curl -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" -d "$JSON_DATA" "https://api.github.com/repos/sarahhalliday13/urban-flower-farm/issues"
