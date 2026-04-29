# StudyMEDIC Work Hub — Deployment Guide

Step-by-step guide to get this live on Vercel with Firebase.
Estimated time: 30–45 minutes.

---

## What you'll need

- A Google account (for Firebase)
- A GitHub account (for Vercel deployment)
- Node.js installed on your computer (https://nodejs.org — install LTS version)

---

## Step 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it: `studymedic-workhub`
4. Disable Google Analytics (not needed) → **Create project**
5. Wait ~30 seconds for it to provision

---

## Step 2 — Enable Firestore

1. In Firebase Console → left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select region: **`asia-south1`** (Mumbai) — closest to India/Qatar
5. Click **"Enable"**

---

## Step 3 — Enable Firebase Storage

1. Left sidebar → **Build → Storage**
2. Click **"Get started"**
3. Choose **"Start in production mode"**
4. Same region as Firestore → **"Done"**

---

## Step 4 — Deploy Security Rules

1. Left sidebar → **Firestore → Rules** tab
2. Replace the existing rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

4. Left sidebar → **Storage → Rules** tab
5. Replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

6. Click **"Publish"**

---

## Step 5 — Get Firebase Config

1. Firebase Console → **Project Overview** (home icon)
2. Click **"</> Web"** icon to add a web app
3. App nickname: `workhub-web` → **Register app**
4. Copy the `firebaseConfig` object — you'll need these values:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## Step 6 — Configure the Project Locally

```bash
# Navigate to the project folder
cd studymedic-workhub

# Install dependencies
npm install

# Create your local environment file
cp .env.example .env.local
```

Open `.env.local` and fill in your Firebase values:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=studymedic-workhub.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=studymedic-workhub
REACT_APP_FIREBASE_STORAGE_BUCKET=studymedic-workhub.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

---

## Step 7 — Add Your Team to Firestore (Seed)

### Option A — Use the seed script (recommended)

1. Firebase Console → **Project Settings** (gear icon) → **Service accounts**
2. Click **"Generate new private key"** → download the JSON file
3. Place it at `scripts/serviceAccountKey.json`
4. Edit `scripts/seed.js` — update the `USERS` array with your actual team names and roles
5. Run:

```bash
cd scripts
npm install firebase-admin uuid
node seed.js
```

This creates all users and 3 sample tasks automatically.

### Option B — Add manually via Firestore Console

1. Firebase Console → Firestore → **Start collection** → Collection ID: `users`
2. Add one document per team member. Use **Auto-ID** as the document ID.

Required fields for each user:
```
id:        (paste the same auto-generated document ID here)
name:      "Meera P."           (string)
role:      "creative_head"      (string)
team:      "lead_1"             (string)
active:    true                 (boolean)
createdAt: (timestamp — now)
```

Role codes → team codes:
```
admin, pm_head, creative_head, assistant_manager, avp  →  lead_1
content_lead, design_lead, video_lead, seo_lead, social_media_lead  →  lead_2
pm_member  →  performance_marketing
content_member  →  content
design_member   →  design
video_member    →  video
seo_member      →  seo
social_media_member  →  social_media
```

---

## Step 8 — Test Locally

```bash
npm start
```

Open http://localhost:3000 — you should see the "Who are you?" screen with your team listed.

Test the full workflow:
- Select a PM member → create a task
- Select the Content Lead → assign it
- Select the Content Member → submit for review
- Select the Content Lead → approve → watch it auto-route to Design
- Check notifications appear for the right people

---

## Step 9 — Push to GitHub

```bash
# In the studymedic-workhub folder
git init
git add .
git commit -m "Initial StudyMEDIC Work Hub"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/studymedic-workhub.git
git push -u origin main
```

---

## Step 10 — Deploy to Vercel

1. Go to https://vercel.com → **Sign up / Log in** (use GitHub)
2. Click **"New Project"**
3. Import your `studymedic-workhub` GitHub repo
4. Framework preset: **Create React App** (auto-detected)
5. **Before deploying** — click **"Environment Variables"** and add all 6:

| Name | Value |
|------|-------|
| `REACT_APP_FIREBASE_API_KEY` | your api key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | your auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | your project id |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | your storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | your sender id |
| `REACT_APP_FIREBASE_APP_ID` | your app id |

6. Click **"Deploy"**
7. Wait ~2 minutes → Vercel gives you a URL like `studymedic-workhub.vercel.app`

---

## Step 11 — Share the URL

Send the Vercel URL to your team. When anyone opens it:
1. They see the "Who are you?" screen
2. They tap their name
3. They're in — no password, no login

The URL works on any device — desktop, tablet, phone.

---

## Custom Domain (Optional)

If StudyMEDIC wants `workhub.studymedic.com`:

1. Vercel → your project → **Settings → Domains**
2. Add `workhub.studymedic.com`
3. Vercel gives you a CNAME record
4. Add that CNAME to StudyMEDIC's DNS (via Hostinger or wherever the domain is managed)
5. Takes 10–30 minutes to propagate

---

## Ongoing Maintenance

### Adding a new team member
1. Open the app → select Admin → User Management → "+ Add User"
2. Enter name and role → done. They appear on the select screen immediately.

### Updating the app
```bash
# Make your changes locally, then:
git add .
git commit -m "Description of changes"
git push
# Vercel auto-deploys within ~2 minutes
```

### Viewing data
- Firebase Console → Firestore → browse `users`, `tasks`, `documents`, `notifications` collections directly

### Backing up data
- Firebase Console → Firestore → **Import/Export** → export to Google Cloud Storage

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank screen after deploy | Check Vercel environment variables are all set correctly |
| "Who are you?" shows no users | Run the seed script, or add users manually in Firestore |
| Files won't upload | Check Storage rules are published (Step 4) |
| Tasks not appearing | Check Firestore rules are published (Step 4) |
| Build fails on Vercel | Run `npm run build` locally first to catch errors |
| CORS error | Make sure `authDomain` in env vars matches your Firebase project |

---

## Need help?
Contact your developer with:
- The error message from the browser console (F12 → Console tab)
- The Vercel deployment logs (Vercel dashboard → your project → Deployments → click the latest)
