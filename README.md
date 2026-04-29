# StudyMEDIC Work Hub

Internal work management platform — no login, no passwords.

---

## How it works

When anyone opens the app URL, they see a **"Who are you?"** screen showing all team members grouped by team. They tap their name and they're in. Their selection is saved in the browser's localStorage so they don't need to pick again on the same device.

To switch users: click your name in the sidebar → "Switch user".

---

## Features

- **Dashboard** — Shared Kanban board, everyone sees all tasks
- **Task workflow** — PM → Content → Design/Video → Creative Head pipeline with auto-routing
- **External works** — Flexible tasks assigned by leads/management
- **Rejection** — Sends task back with comments to the assignee
- **Documents** — File upload, folder organisation
- **Reports** — 4 analytics charts + overdue table
- **Admin** — Add/remove/deactivate users, change roles (Admin role only)

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React 18 + React Router v6 |
| Database | Firebase Firestore |
| File storage | Firebase Storage |
| Hosting | Vercel |
| Charts | Recharts |

---

## Setup (step by step)

### 1. Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create project → name it `studymedic-workhub`
3. Enable **Firestore Database** (production mode, choose a region)
4. Enable **Storage** (production mode)
5. **Do NOT enable Authentication** — it is not used

### 2. Get Firebase config

Firebase Console → Project Settings → Your Apps → Add Web App → Copy the config values.

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in all REACT_APP_FIREBASE_* values from step 2
```

### 4. Install and run

```bash
npm install
npm start
# Opens at http://localhost:3000
```

### 5. Deploy Firestore and Storage rules

```bash
npm install -g firebase-tools
firebase login
firebase init   # choose Firestore + Storage, link to your project
firebase deploy --only firestore:rules,storage
```

### 6. Add your team members

**Option A — Seed script (recommended for first setup)**

```bash
cd scripts
# Download serviceAccountKey.json from Firebase Console
# (Project Settings → Service Accounts → Generate new private key)
# Place it at scripts/serviceAccountKey.json

npm install firebase-admin uuid
node seed.js
```

Edit the `USERS` array in `seed.js` with your actual team names and roles before running.

**Option B — Admin panel (after first run)**

1. Manually add one Admin user directly in Firebase Console → Firestore → `users` collection:
   ```
   id: (any uuid)
   name: "Admin"
   role: "admin"
   team: "management"
   active: true
   ```
2. Open the app, select "Admin", go to User Management, add the rest.

### 7. Deploy to Vercel

1. Push to GitHub
2. Vercel → New Project → Import repo
3. Add all `REACT_APP_FIREBASE_*` variables in Vercel's Environment Variables
4. Deploy

---

## Role reference

| Role code | Label | Can create tasks |
|-----------|-------|-----------------|
| `admin` | Admin | All types |
| `pm_member` | Performance Marketing | PM flows |
| `content_lead` | Content Lead | External |
| `content_member` | Content Member | — |
| `design_lead` | Design Lead | External |
| `design_member` | Design Member | — |
| `video_lead` | Video Lead | External |
| `video_member` | Video Member | — |
| `creative_head` | Creative Head | External |
| `assistant_manager` | Assistant Manager | External |
| `avp` | AVP | External |

---

## Workflow reference

### PM flow — Content + Design
```
PM creates task
→ Content Lead assigns to Content Member (or takes it)
  → Content Member submits
    → Content Lead approves
      → Design Lead assigns to Design Member (or takes it)
        → Design Member submits
          → Design Lead approves
            → Creative Head reviews
              → Delivered back to PM
```

### PM flow — Content + Video
Same, Design stages replaced by Video stages.

### External flow
```
Lead / Creative Head / AM / AVP creates and assigns to anyone
→ Assignee submits
  → Original assigner approves or rejects
    → Delivered
```

### Rejection
At any review stage, rejecting sends the card back to the previous
in-progress stage with the rejection reason posted as a comment.

---

## Customisation

| What to change | Where |
|----------------|-------|
| Add a new role | `src/utils/constants.js` → ROLES, ROLE_LABELS, ROLE_TEAM_MAP |
| Add a workflow stage | `src/utils/constants.js` → STAGE_LABELS, STAGE_COLORS; `src/utils/workflow.js` |
| Add a document folder | `src/pages/DocumentsPage.js` → FOLDERS array |
| Change brand colors | `src/styles/global.css` → :root CSS variables |
| Change sidebar items | `src/components/layout/Layout.js` → nav items array |

---

## File structure

```
src/
├── components/
│   ├── layout/          Layout.js + Layout.css
│   └── tasks/           CreateTaskModal.js
├── context/
│   └── UserContext.js   User selection (replaces auth)
├── firebase/
│   └── config.js        Firebase init
├── pages/
│   ├── UserSelectPage   "Who are you?" screen
│   ├── DashboardPage    Kanban board
│   ├── TaskDetailPage   Full task view + actions
│   ├── DocumentsPage    File manager
│   ├── ReportsPage      Analytics
│   └── AdminPage        User management
├── styles/
│   └── global.css
└── utils/
    ├── constants.js     All roles, stages, colours
    └── workflow.js      Stage transition logic
```
