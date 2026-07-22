# Firebase Setup Guide — Team Attendance Tracker

## Overview
This app uses **Firebase Firestore** as its database. All attendance records, requests, and settings are stored in your Firebase project — free forever for a 20-person team.

---

## Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Project name: `team-attendance` (or anything you like)
4. Disable Google Analytics (not needed) → click **Create project**
5. Wait ~30 seconds → click **Continue**

---

## Step 2 — Create Firestore Database

1. In the left sidebar, click **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (allows read/write for 30 days — we'll secure it later)
4. Choose location: **asia-south1 (Mumbai)** → click **Enable**

---

## Step 3 — Get Your Firebase Config

1. In the left sidebar, click the **gear icon ⚙️ → Project settings**
2. Scroll down to **"Your apps"** section
3. Click the **Web icon `</>`**
4. App nickname: `attendance-tracker` → click **Register app**
5. You'll see a config block like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "team-attendance-xxxxx.firebaseapp.com",
  projectId: "team-attendance-xxxxx",
  storageBucket: "team-attendance-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

6. **Copy this entire config block**

---

## Step 4 — Add Config to index.html

1. Open `index.html` in any text editor (Notepad, VS Code, etc.)
2. Find this section (around line 50):

```javascript
  // ─── PASTE YOUR FIREBASE CONFIG HERE ───
  const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_API_KEY",
    authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
    ...
  };
```

3. **Replace the entire firebaseConfig block** with your copied config
4. Save the file

---

## Step 5 — Set Firestore Security Rules

1. In Firebase console → **Firestore Database → Rules** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes (you can tighten this later)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

> **Note:** These rules allow anyone with your URL to read/write. For a private internal tool this is fine. If you want to add authentication later, you can tighten these rules.

---

## Step 6 — Upload index.html to GitHub

1. Go to **https://github.com/roshanraj-sys/attendance-tracker**
2. Click on `index.html`
3. Click the **pencil icon ✏️** (Edit file)
4. Select all → Delete → Paste your updated index.html content
5. Click **Commit changes**

GitHub Pages will update within 1–2 minutes.

---

## Step 7 — Add Your Team Members

The app comes with 20 default placeholder names. To replace them with your real team:

**Option A — Edit in Firestore directly:**
1. Go to Firebase console → Firestore Database
2. Find the `members` collection
3. Edit/delete/add documents — each document needs:
   - `name`: Full name (e.g., `"Priya Sharma"`)
   - `team`: Either `"VQC"` or `"Enrichment"`

**Option B — Edit in index.html before deploying:**
Find the `seedMembers()` function and update the `defaults` array with your team's real names.

---

## Step 8 — Change Admin Password

1. Go to Firebase console → Firestore Database
2. Find the `config` collection → `settings` document
3. If it doesn't exist yet, create it:
   - Collection: `config`
   - Document ID: `settings`
   - Field: `admin_password` (string) → your chosen password
4. If no config doc exists, the default password is `admin123` — change it immediately!

---

## Database Structure (auto-created)

| Collection | What's stored |
|-----------|--------------|
| `members` | Your team list (name + team) |
| `attendance` | Daily check-in records |
| `requests` | Leave and OT requests |
| `config` | Admin password and settings |

---

## Free Tier Limits (Firebase Spark plan)

| Resource | Free limit | Your usage (20 people) |
|----------|-----------|----------------------|
| Reads | 50,000/day | ~100/day ✅ |
| Writes | 20,000/day | ~30/day ✅ |
| Storage | 1 GB | ~1 MB ✅ |

You will **never hit the free tier limits** with a 20-person team.

---

## Live URLs

- **Dashboard:** https://roshanraj-sys.github.io/attendance-tracker
- **GitHub repo:** https://github.com/roshanraj-sys/attendance-tracker
- **Firebase console:** https://console.firebase.google.com

---

## Need help?

If something isn't working, check:
1. The yellow banner on the dashboard — it shows if Firebase isn't configured yet
2. Browser console (F12 → Console) for error messages
3. Firebase console → Firestore to see if data is being written
