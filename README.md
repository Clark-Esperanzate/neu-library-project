# NEU Library Visitor Management System

🌐 **Live Website:** [https://neu-library-1591c.web.app/index.html](https://neu-library-1591c.web.app/index.html)

A digital logbook web application to track and analyze library visits by students, faculty, and staff at **New Era University**.

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
    ├── register-page.js      ← Registration form logic + password strength
    ├── visitor-page.js       ← Check-in form, terminal, welcome modal
    ├── admin-dashboard.js    ← Charts, filters, user management, activity feed
    └── pdf-report.js         ← PDF report generation (jsPDF)
```

---

## 🚀 Features

- **Institutional Email Enforcement** — Only `@neu.edu.ph` emails are accepted
- **Google Sign-In** — Sign in with your NEU Google account (requires Firebase setup)
- **Password + ID Login** — Sign in using school ID number or institutional email
- **Student / Faculty / Staff Check-in** — Purpose of visit + college selection
- **Visitor Terminal Display** — Live terminal showing visitor info on the left panel
- **Welcome Slip** — Printable check-in slip shown after successful check-in
- **Admin Dashboard** — Charts by day, college, purpose, visitor type, and hour
- **Advanced Filters** — Filter statistics by purpose, college, and visitor type
- **Date Filters** — Today / This Week / This Month / Custom Range
- **Role-Based Access Control (RBAC)** — Accounts can hold both Visitor and Admin roles simultaneously with a Switch button
- **User Management** — Block/unblock users, grant/revoke admin roles, delete accounts
- **Visitor Search** — Search logs by name, email, ID, college, or purpose
- **Live Activity Feed** — Real-time feed of recent check-ins, auto-refreshes every 10 seconds
- **PDF Report Download** — Downloadable reports with statistics by period
- **Firebase Firestore** — Role and profile changes persist across devices and sessions
- **Cross-device Sync** — Google account users are synced via Firestore

---

## 🎨 Color Palette

| Color  | Hex       | Usage                      |
|--------|-----------|----------------------------|
| Blue   | `#0047AB` | Primary (header, sidebar)  |
| Yellow | `#FFD700` | Accents, highlights, CTA   |
| White  | `#FFFFFF` | Backgrounds, card surfaces |

---

## 🔐 Default Login Credentials

| Role    | Email                           | Password    |
|---------|---------------------------------|-------------|
| Admin   | admin@neu.edu.ph                | admin123    |
| Admin   | clark.esperanzate@neu.edu.ph    | Taskaru777  |

> These accounts are seeded automatically on first load. All other accounts must be registered through the Register page or Google Sign-In.

---

## 🪪 School ID Format

School IDs must follow the format: **`YY-NNNNN-NNN`**
Example: `**-*****-***`

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
- Role changes are synced to **Firestore immediately** and persist across devices

---

## 📱 User Types

| Type    | Description              |
|---------|--------------------------|
| Student | Undergraduate / Graduate |
| Faculty | Teachers / Professors    |
| Staff   | Employees / Admin staff  |

User type is set during registration and is used for filtering in the admin dashboard.

---

## 🔄 Data Storage

| Data          | Storage                    | Cross-device |
|---------------|----------------------------|--------------|
| User profiles | localStorage + Firestore   | ✅ via Google Sign-In |
| Visit logs    | localStorage               | ❌ browser only |
| Sessions      | sessionStorage             | ❌ tab only |
| Role changes  | localStorage + Firestore   | ✅ synced immediately |

> Visit logs are currently stored in localStorage only. Users who sign in via Google will have their **profile and roles** synced across devices, but **visit history** is per-browser. Full cross-device visit sync would require storing visits in Firestore as well.

---