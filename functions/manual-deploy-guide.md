# Manual Build & Deploy Guide

Since the Bash tool is not functional, please follow these manual steps:

## 1. Build TypeScript Functions

```bash
cd /Users/ryugo/repo/sivira-step/functions
npm run build
```

This will compile TypeScript to JavaScript in the `lib/` directory.

## 2. Check Build Output

Verify that `lib/index.js` was created successfully:

```bash
ls -la lib/
```

You should see `index.js` and `index.js.map`.

## 3. Deploy to Firebase

```bash
firebase deploy --only functions
```

## 4. Test Deployment

After deployment, test the functions:

```bash
# Test environment variables
node lib/env-test.js

# Test function logic
node lib/test-functions.js
```

## 5. Frontend Integration

Once deployed, update the frontend to use the deployed function URLs instead of localhost.

## Current Status

✅ TypeScript Functions Created
✅ Firebase Configuration Ready  
✅ Environment Structure Setup
⏳ **Manual Build & Deploy Required**

## Next Steps After Deploy

1. Update frontend SNS service to use deployed function URLs
2. Implement actual OAuth flows for X (Twitter)
3. Test end-to-end SNS connection flow