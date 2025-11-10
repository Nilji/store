# Firestore Security Rules Setup Guide

## Error: "Missing or insufficient permissions"

This error occurs because Firestore security rules need to be configured to allow admin access.

## Step-by-Step Setup

### 1. Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **app-a8eca**
3. Click on **Firestore Database** in the left menu
4. If not already enabled, click **Create database**
5. Choose **Start in test mode** (we'll update rules next)
6. Select your preferred location
7. Click **Enable**

### 2. Set Up Security Rules

1. In Firestore Database, click on the **Rules** tab
2. Replace the default rules with the rules from `firestore.rules` file
3. Make sure the admin emails in the rules match your `ADMIN_EMAILS` in `main.js` and `admin.js`
4. Click **Publish**

### 3. Security Rules Explained

The rules allow:
- ✅ Users to read/write their own user document
- ✅ Admins (from the email list) to read/write all user documents
- ✅ Admins to delete user documents
- ✅ Admins to list all users
- ❌ Regular users cannot access other users' data
- ❌ Unauthenticated users cannot access anything

### 4. Update Admin Emails in Rules

**Important:** Whenever you add/remove admin emails in `main.js` or `admin.js`, you must also update them in Firestore security rules!

To update:
1. Go to Firebase Console → Firestore Database → Rules
2. Find the `isAdmin()` function
3. Update the email list to match your `ADMIN_EMAILS` array
4. Click **Publish**

### 5. Test the Rules

After publishing the rules:
1. Sign in with an admin email (rijanjoshi66@gmail.com or xrta605@gmail.com)
2. Go to the admin dashboard
3. You should now be able to see all users without permission errors

## Current Admin Emails in Rules

- admin@nexza.com
- developer@nexza.com
- rijanjoshi66@gmail.com
- xrta605@gmail.com

## Troubleshooting

### Still getting permission errors?

1. **Check Firestore is enabled**: Make sure Firestore Database is created and enabled
2. **Check rules are published**: Rules must be published, not just saved
3. **Check admin emails match**: Emails in rules must exactly match emails in code (case-sensitive in some cases)
4. **Check user is signed in**: User must be authenticated
5. **Check user email**: The email used to sign in must be in the admin list
6. **Wait a few seconds**: Rules can take a few seconds to propagate

### Rules not updating?

1. Make sure you clicked **Publish** (not just Save)
2. Clear browser cache and reload
3. Wait 1-2 minutes for rules to propagate
4. Check Firebase Console for any error messages

## Alternative: Test Mode (Not Recommended for Production)

If you want to test quickly without setting up rules:

1. Go to Firestore Database → Rules
2. Use these rules temporarily:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ WARNING:** These rules allow anyone to read/write your database. Only use for testing and remove before going to production!

## Need Help?

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Check Firebase Console → Firestore Database → Usage tab for any errors
3. Verify your Firebase project ID matches in all files

