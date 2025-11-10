# Firebase Console - What to Enable Guide

## 🎯 Quick Checklist

- [ ] **Firestore Database** - Enable this first!
- [ ] **Authentication** - Enable Email/Password sign-in
- [ ] **Security Rules** - Copy and paste the rules from `firestore.rules`

---

## Step 1: Enable Firestore Database

### Location in Firebase Console:
**Build → Firestore Database** (left sidebar)

### Steps:
1. Click on **"Firestore Database"** in the left menu
2. If you see **"Create database"** button, click it
3. Choose **"Start in test mode"** (we'll add proper rules next)
4. Select a **database location** (choose closest to your users)
   - Recommended: `us-central` or `asia-south1`
5. Click **"Enable"**
6. Wait for database to be created (takes 1-2 minutes)

### What you'll see:
- A blank database with no collections yet
- Tabs: Data, Rules, Indexes, Usage, Backups

---

## Step 2: Set Up Security Rules

### Location in Firebase Console:
**Firestore Database → Rules** tab

### Steps:
1. Click on the **"Rules"** tab in Firestore Database
2. You'll see default rules like:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2024, 12, 31);
       }
     }
   }
   ```
3. **Delete all** the default rules
4. **Copy the entire content** from `firestore.rules` file
5. **Paste** it into the Rules editor
6. Click **"Publish"** button (very important!)
7. Wait for confirmation: "Rules published successfully"

### What the rules do:
- ✅ Admins can read/write/delete all users
- ✅ Regular users can only read/write their own data
- ✅ Only authenticated users can access data

---

## Step 3: Enable Authentication (Email/Password)

### Location in Firebase Console:
**Build → Authentication** (left sidebar)

### Steps:
1. Click on **"Authentication"** in the left menu
2. If you see **"Get started"** button, click it
3. Click on the **"Sign-in method"** tab
4. Find **"Email/Password"** in the list
5. Click on **"Email/Password"**
6. **Enable** the first toggle (Email/Password)
7. Click **"Save"**

### What you'll see:
- Email/Password provider will show as "Enabled"
- Users can now sign up and sign in with email/password

---

## Step 4: Verify Everything is Enabled

### Check Firestore Database:
- ✅ Database is created
- ✅ Rules are published (check Rules tab)
- ✅ No error messages

### Check Authentication:
- ✅ Email/Password is enabled
- ✅ Sign-in method shows "Enabled"

---

## Common Issues & Solutions

### Issue 1: "Firestore Database" option not visible
**Solution:** 
- Make sure you're in the correct Firebase project (app-a8eca)
- Try refreshing the page
- Check if you have the correct permissions

### Issue 2: Rules won't publish
**Solution:**
- Check for syntax errors (missing brackets, quotes)
- Make sure you copied the entire rules file
- Try copying rules again from `firestore.rules`

### Issue 3: Still getting permission errors
**Solution:**
- Make sure rules are **published** (not just saved)
- Wait 1-2 minutes for rules to propagate
- Sign out and sign in again
- Clear browser cache
- Check that you're signed in with an admin email

### Issue 4: "Authentication not enabled" error
**Solution:**
- Go to Authentication → Sign-in method
- Enable Email/Password provider
- Make sure it's saved

---

## Visual Guide - What to Click

```
Firebase Console
├── 📁 Build
│   ├── 🔥 Firestore Database  ← CLICK HERE FIRST
│   │   ├── Data (tab)
│   │   ├── Rules (tab)  ← CLICK HERE SECOND (copy rules)
│   │   └── Indexes (tab)
│   │
│   └── 👤 Authentication  ← CLICK HERE THIRD
│       └── Sign-in method (tab)
│           └── Email/Password  ← ENABLE THIS
│
└── 📁 Other sections...
```

---

## After Enabling - Test Your Setup

1. **Sign in** to your app with an admin email:
   - rijanjoshi66@gmail.com
   - xrta605@gmail.com

2. **Click** "For Developer" button (top left)

3. **Check** if admin dashboard loads without errors

4. **Verify** you can see users in the admin dashboard

---

## Security Notes

⚠️ **Important:** 
- Never share your Firebase project credentials
- Keep your admin email list secure
- Regularly review Firestore security rules
- Don't use test mode rules in production

---

## Need Help?

If you're still having issues:
1. Check browser console for error messages
2. Verify Firebase project ID matches in all files
3. Make sure you're signed in with an admin email
4. Check Firestore Database → Usage tab for errors

---

## Quick Reference

### Firestore Rules Location:
**Firestore Database → Rules tab**

### Authentication Location:
**Authentication → Sign-in method → Email/Password**

### Admin Emails (must match in rules):
- admin@nexza.com
- developer@nexza.com
- rijanjoshi66@gmail.com
- xrta605@gmail.com

