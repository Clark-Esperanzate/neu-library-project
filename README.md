# NEU Library Visitor Management System

🌐 **Live Website:** [https://neu-library-1591c.web.app/index.html](https://neu-library-1591c.web.app/index.html)

---

## 📖 About This Project

The **NEU Library Visitor Management System** is a web-based digital logbook developed for the **New Era University Library**. It replaces the traditional paper-based sign-in process with a modern, streamlined check-in system that students, faculty, and staff can access using their institutional Google accounts.

The system allows visitors to log their library visits by selecting their purpose, college, and any additional notes — all in under a minute. Once checked in, a printable welcome slip is generated confirming their visit details. After a short countdown, the system automatically signs them out so the next visitor can use the same station.

On the administrative side, the library staff can monitor real-time and historical visit data through a full-featured dashboard. This includes charts broken down by day, college, and purpose of visit, as well as searchable visitor logs, user account management, and downloadable PDF reports. All data is stored in Firebase Firestore, making it accessible from any device without needing to install anything.

---

## 📁 Project Structure

```
neu-library/
├── index.html                ← Login page (entry point)
├── register.html             ← New user registration
├── visitor-checkin.html      ← Visitor check-in form + terminal display
├── admin-dashboard.html      ← Admin statistics, logs, user management
├── complete-profile.html     ← Profile completion for first-time Google sign-in
├── firebase.json             ← Firebase Hosting configuration
├── .firebaserc               ← Firebase project ID binding
│
├── styles/
│   ├── global.css            ← Shared base styles, header, buttons, forms
│   ├── login.css             ← Login & register page styles
│   ├── visitor.css           ← Check-in page & terminal styles
│   └── admin.css             ← Admin dashboard layout & components
│
└── scripts/
    ├── data-store.js         ← localStorage data layer (users + visits)
    ├── auth.js               ← Authentication, session, RBAC, validation
    ├── firebase-config.js    ← Firebase project config (edit this first)
    ├── firebase-auth.js      ← Firebase Google Sign-In + Firestore sync
    ├── login-page.js         ← Login form logic
    ├── register-page.js      ← Registration form logic
    ├── visitor-page.js       ← Check-in form, terminal, welcome modal
    ├── admin-dashboard.js    ← Charts, filters, user management, activity feed
    └── pdf-report.js         ← PDF report generation (jsPDF)
```

---

## 🚀 Features

- **Google Sign-In Only** — Institutional `@neu.edu.ph` Google accounts exclusively
- **Auto Sign-Out After Check-In** — 7-second countdown then redirects to login for next visitor
- **Visitor Terminal Display** — Live terminal showing visitor info after sign-in
- **Welcome Slip** — Printable check-in confirmation slip with visit details
- **Admin Dashboard** — Charts by day, college, purpose, and visitor type
- **Advanced Filters** — Filter dashboard statistics by purpose, college, and visitor type
- **Date Filters** — Today / This Week / This Month / Custom Range
- **Full Search** — Search visitor logs and user management by any field including date and time
- **Role-Based Access Control** — Accounts can hold both Visitor and Admin roles simultaneously
- **User Management** — Block/unblock users, grant/revoke admin roles
- **Live Activity Feed** — Auto-refreshes every 10 seconds
- **PDF Report Download** — Downloadable reports with full visit statistics
- **Cross-Device Sync** — Visits and user data synced via Firebase Firestore

---

## 🎨 Color Palette

| Color  | Hex       | Usage                      |
|--------|-----------|----------------------------|
| Blue   | `#0047AB` | Primary (header, sidebar)  |
| Yellow | `#FFD700` | Accents, highlights, CTA   |
| White  | `#FFFFFF` | Backgrounds, card surfaces |

---

## 🔐 Default Admin Accounts

| Role    | Email                           |
|---------|---------------------------------|
| Admin   | jcesperanza@neu.edu.ph          |
| Admin   | clark.esperanzate@neu.edu.ph    |

> Login is Google Sign-In only. These accounts are seeded automatically on first load and must sign in using their NEU Google account.

---

## 🪪 School ID Format

School IDs must follow the format: **`YY-NNNNN-NNN`**
Example: `24-*****-***`

The registration form auto-formats the ID as you type.

---

## 👤 User Roles

| Role    | Access                                                                 |
|---------|------------------------------------------------------------------------|
| Visitor | Check-in form, visit history, welcome slip                             |
| Admin   | Full dashboard, visitor logs, user management, reports, activity feed  |

- A single account can hold **both** roles simultaneously
- Accounts with both roles see a **Switch to Admin / Switch to Visitor** button
- Admin can grant or revoke admin role from any user in User Management
- Role changes sync to Firestore immediately and persist across devices

---

## 📱 User Types

| Type    | Description              |
|---------|--------------------------|
| Student | Undergraduate / Graduate |
| Faculty | Teachers / Professors    |
| Staff   | Employees / Admin staff  |

---

## 🔄 Data Storage

| Data          | Storage                  | Cross-device          |
|---------------|--------------------------|-----------------------|
| User profiles | localStorage + Firestore | ✅ via Google Sign-In |
| Visit logs    | localStorage + Firestore | ✅ synced on dashboard load |
| Sessions      | sessionStorage           | ❌ tab only           |
| Role changes  | localStorage + Firestore | ✅ synced immediately |

---

## 🔥 Firebase Setup

### Step 1 — Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → Name it → Click **Create**

### Step 2 — Enable Google Sign-In
1. Firebase Console → **Authentication** → **Get Started**
2. Click **Sign-in method** → **Google** → Toggle **Enable** → Save

### Step 3 — Create Firestore Database
1. Firebase Console → **Firestore Database** → **Create Database**
2. Choose **Start in test mode** → Select region `asia-southeast1` → **Enable**

### Step 4 — Register Web App & Get Config
1. Project Overview → Click **`</>`** (Web) icon → Register app
2. Copy the `firebaseConfig` object

### Step 5 — Paste Config into Project
Open `scripts/firebase-config.js` and replace the placeholder values with your real config.

### Step 6 — Update `.firebaserc`
Replace `YOUR_PROJECT_ID` with your actual Firebase project ID.

### Step 7 — Add Authorized Domain
Firebase Console → **Authentication** → **Settings** → **Authorized domains** → Add your hosting domain.

---

## 🚢 Deploying to Firebase Hosting

```bash
# Install Node.js from nodejs.org first, then:
npm install -g firebase-tools
firebase login
cd path/to/neu-library
firebase deploy
```

Your site will be live at: `https://your-project-id.web.app`

To redeploy after any changes:
```bash
firebase deploy
```

---

## 🔒 Firestore Security Rules

Apply these in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

*NEU Library Visitor Management System — Developed for New Era University Library*
