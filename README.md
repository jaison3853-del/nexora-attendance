# NEXORA SM — Staff Attendance Management System

A premium, futuristic SaaS-style attendance management web application built with React, Firebase, and Tailwind CSS.

## ✨ Features

- **Dark glassmorphism UI** — premium SaaS aesthetic
- **Role-based access** — Admin and Staff roles
- **Real-time attendance** — Firestore live updates
- **GPS Location capture** — reverse geocoding via OpenStreetMap Nominatim
- **Live clock** — timestamped attendance marking
- **Analytics charts** — bar, pie, and line charts (Recharts)
- **CSV Export** — download attendance reports
- **Framer Motion animations** — smooth transitions
- **Mobile-first responsive** — works on all screen sizes

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in test mode (then apply rules below)
5. Go to **Project Settings → General → Your Apps** → Add Web App
6. Copy your Firebase config

### 3. Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Firestore Security Rules

In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`.

### 5. Run locally
```bash
npm run dev
```

---

## 📁 Folder Structure

```
src/
├── components/
│   ├── attendance/     # MarkAttendance, AttendanceTable
│   ├── layout/         # Sidebar, Navbar
│   └── ui/             # StatCard, StatusBadge, Modal, Loader, EmptyState
├── context/
│   └── AuthContext.jsx
├── firebase/
│   └── config.js
├── hooks/
│   ├── useClock.js
│   └── useGeoLocation.js
├── layouts/
│   └── AppLayout.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── StaffDashboard.jsx
│   ├── AdminDashboard.jsx
│   ├── AttendanceHistory.jsx
│   ├── ProfileSettings.jsx
│   └── NotFound.jsx
├── routes/
│   ├── ProtectedRoute.jsx
│   └── AdminRoute.jsx
├── services/
│   ├── authService.js
│   └── attendanceService.js
└── styles/
    └── globals.css
```

---

## 🗄️ Firestore Data Model

### `users` collection
| Field | Type | Description |
|-------|------|-------------|
| uid | string | Firebase Auth UID |
| name | string | Full name |
| email | string | Email address |
| role | string | `"staff"` or `"admin"` |
| createdAt | timestamp | Account creation time |

### `attendance` collection
| Field | Type | Description |
|-------|------|-------------|
| uid | string | User UID |
| name | string | User's name |
| status | string | `"present"`, `"absent"`, or `"late"` |
| date | string | `YYYY-MM-DD` format |
| time | string | `HH:mm:ss` format |
| timestamp | string | ISO timestamp |
| latitude | number | GPS latitude |
| longitude | number | GPS longitude |
| locationName | string | Human-readable location |
| createdAt | timestamp | Firestore server timestamp |

---

## 🌐 Deploy to Vercel

1. Push your project to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Repository
3. Add all environment variables from `.env`
4. Deploy!

**Build settings:**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

---

## 🔒 Security Notes

- One attendance per day is enforced both in app logic and Firestore rules
- Admin role required to view all staff records
- GPS location is optional — attendance can be marked without it
- Firebase Auth handles all authentication securely

---

## 🎨 Design System

- **Font:** Syne (display) + JetBrains Mono (code/timestamps)
- **Primary colors:** Cyan (`#22d3ee`) + Violet (`#8b5cf6`)
- **Background:** `#020408` (near-black void)
- **Cards:** Glassmorphism with `backdrop-blur`
- **Animations:** Framer Motion throughout

---

Built with ❤️ for NEXORA SM.
