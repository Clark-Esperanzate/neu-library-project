# NEU Library Visitor Management System

A digital logbook web application to track and analyze library usage by students and faculty at **New Era University**.

---

## 📁 Project Structure

```
neu-library/
├── index.html              ← Login page (entry point)
├── register.html           ← New user registration
├── visitor-checkin.html    ← Visitor check-in form + terminal display
├── admin-dashboard.html    ← Admin statistics, logs, user management
│
├── styles/
│   ├── global.css          ← Shared base styles, header, buttons, forms
│   ├── login.css           ← Login & register page styles
│   ├── visitor.css         ← Check-in page & terminal styles
│   └── admin.css           ← Admin dashboard layout & components
│
└── scripts/
    ├── data-store.js       ← localStorage database (users + visits)
    ├── auth.js             ← Authentication, session, validation
    ├── login-page.js       ← Login form logic
    ├── register-page.js    ← Registration form logic
    ├── visitor-page.js     ← Check-in + welcome modal logic
    ├── admin-dashboard.js  ← Charts, filters, user management
    └── pdf-report.js       ← PDF report generation (jsPDF)
```

---

## 🚀 Features

- **Institutional Email Enforcement** — Only `@neu.edu.ph` emails allowed
- **Student & Faculty Check-in** — Purpose of visit + college selection
- **Welcome Terminal Display** — Shows visitor info after check-in
- **Admin Dashboard** — Charts by day, college, and purpose
- **Date Filters** — Today / This Week / This Month / Custom Range
- **User Management** — Block/unblock users
- **Visitor Search** — Search logs by name, email, or college
- **PDF Report Download** — Downloadable reports with statistics

---

## 🎨 Color Palette

| Color  | Hex       | Usage                     |
|--------|-----------|---------------------------|
| Blue   | `#0047AB` | Primary (header, buttons) |
| Yellow | `#FFD700` | Accents, highlights       |
| White  | `#FFFFFF` | Backgrounds, text         |

---

## 🔐 Demo Login Credentials

| Role    | Email / ID         | Password   |
|---------|--------------------|------------|
| Admin   | admin@neu.edu.ph   | admin123   |
| Visitor | juan@neu.edu.ph    | visitor123 |
| Visitor | 2021-00001 (ID)    | visitor123 |

---

## 📦 Publishing to GitHub Pages

Follow these steps to host your project for free on GitHub Pages.

### Step 1 – Create a GitHub Account
Go to https://github.com and sign up (or log in).

### Step 2 – Create a New Repository
1. Click the **"+"** icon in the top right → **New repository**
2. Name it: `neu-library-vms` (or any name you prefer)
3. Set visibility to **Public**
4. Do **NOT** check "Add a README" (we already have one)
5. Click **Create repository**

### Step 3 – Upload Your Files
#### Option A – Using GitHub Website (Easiest)
1. On your new empty repository page, click **"uploading an existing file"**
2. Drag and drop ALL your project files and folders:
   - `index.html`
   - `register.html`
   - `visitor-checkin.html`
   - `admin-dashboard.html`
   - `styles/` folder (all 4 CSS files)
   - `scripts/` folder (all 7 JS files)
   - `README.md`
3. Click **Commit changes**

#### Option B – Using Git CLI
```bash
# 1. Install Git: https://git-scm.com/downloads

# 2. Open a terminal in your project folder
cd neu-library

# 3. Initialize git
git init

# 4. Add all files
git add .

# 5. Commit
git commit -m "Initial commit - NEU Library VMS"

# 6. Connect to GitHub (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/neu-library-vms.git

# 7. Push
git branch -M main
git push -u origin main
```

### Step 4 – Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select: **Deploy from a branch**
5. Under **Branch**, choose: **main** and **/ (root)**
6. Click **Save**

### Step 5 – Access Your Live Website
After 1–2 minutes, your site will be live at:
```
https://YOUR_USERNAME.github.io/neu-library-vms/
```

---

## ⚠️ Important Notes

- **Data Storage**: This app uses `localStorage` — data is stored in the browser. It does NOT use a real server or database. For production use, connect to Firebase Firestore.
- **No Backend Required**: The entire app runs in the browser — HTML, CSS, and JavaScript only.
- **PDF Library**: Uses jsPDF loaded from CDN — internet connection required for PDF downloads.
- **Charts**: Uses Chart.js loaded from CDN — internet connection required for charts to display.

---

## 🔮 Future Enhancements (Production)

If you want to upgrade to a real backend:

1. **Firebase Firestore** — Free NoSQL database from Google
   - Replace `data-store.js` with Firebase SDK calls
   - Security rules: Only admins read all logs; users create their own visits

2. **Firebase Authentication** — Google Sign-In with domain restriction
   - Use `hd: 'neu.edu.ph'` in Google OAuth to restrict to NEU accounts

3. **Firebase Hosting** — Free hosting with custom domain support
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

---

## 📋 Suggested Firestore Schema

```javascript
// Collection: users
{
  uid: "string",
  schoolId: "2021-00001",
  firstName: "Juan",
  middleInitial: "D.",
  lastName: "dela Cruz",
  email: "juan@neu.edu.ph",
  college: "College of Computer Studies",
  program: "BS Computer Science",
  role: "visitor",          // "visitor" | "admin"
  isBlocked: false,
  registeredAt: Timestamp
}

// Collection: visits
{
  id: "string",
  userId: "string",
  email: "juan@neu.edu.ph",
  name: "Juan D. dela Cruz",
  schoolId: "2021-00001",
  college: "College of Computer Studies",
  purpose: "Research / Thesis",
  notes: "Working on capstone",
  timestamp: Timestamp
}
```

---

## 📝 Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      allow read: if request.auth.token.email.matches('.*@neu.edu.ph');
      allow write: if request.auth.uid == userId
                   || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Visits collection
    match /visits/{visitId} {
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth.token.email.matches('.*@neu.edu.ph')
                    && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

*NEU Library Visitor Management System — Developed for New Era University Library*
