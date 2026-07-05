## About

AtCoder Anytime is a web application that tracks rating changes from virtual contest participations on AtCoder.
Users can register their AtCoder handle, participate in past contests virtually, and see their rating history as if they had participated officially.

- **Hosting / Auth / Firestore**: Firebase
- **Backend processing**: Firebase Cloud Functions
- **Frontend**: React + TypeScript (Create React App)

## Project structure

```
atcoder-anytime/
├── src/                        # React frontend
│   ├── actions/                # Redux actions (login, fetchProfile, fetchUsers, etc.)
│   ├── anytime-ui/             # Shared UI components (git submodule)
│   ├── api/                    # External API calls (AtCoder API, Firestore)
│   ├── components/             # React page components
│   │   ├── PageWrapper.tsx     # App shell with navigation
│   │   ├── StartPage.tsx       # Top / login page
│   │   ├── ContestsPage.tsx    # Contest list with virtual/official ranks
│   │   ├── RankingPage.tsx     # User rating ranking
│   │   ├── ProfilePage.tsx     # User profile and rating graph
│   │   ├── UpdateProfilePage.tsx
│   │   └── Contact.tsx
│   ├── hooks/                  # Redux state selectors as React hooks
│   ├── reducers/               # Redux reducers
│   ├── types/                  # Frontend-specific TypeScript types
│   └── utils/                  # Utility functions (rating colors, certificate, Twitter message)
├── shared/                     # Shared TypeScript types compiled separately
│   └── src/types/              # ContestRecord, UserProfile, Submission
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       ├── updateRating.ts     # Fetches and calculates virtual contest ratings
│       ├── updateUserProfile.ts
│       └── getExternal.ts      # Proxies AtCoder API calls
└── public/                     # Static assets
```

## How to setup

### Prerequisites

- Node.js
- Firebase CLI: `npm i -g firebase-tools`

### 1. Clone the repository

Clone with submodules to also fetch `src/anytime-ui`:

```
$ git clone --recurse-submodules https://github.com/sono8stream/atcoder-anytime.git
```

If you already cloned without submodules:

```
$ git submodule update --init
```

### 2. Firebase setup

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/)
2. Enable **Authentication** (Google sign-in), **Firestore**, **Cloud Functions**, and **Hosting**
3. Register a web app (and a separate one for develop if needed) and copy each Firebase config

### 3. Create `firebase-config.json`

Copy the template and fill in your Firebase project settings (available in Firebase Console → Project settings → Your apps):

```
$ cp firebase-config.json.example firebase-config.json
```

```json
{
  "develop": {
    "apiKey": "...",
    "authDomain": "...",
    "projectId": "...",
    "storageBucket": "...",
    "messagingSenderId": "...",
    "appId": "..."
  },
  "production": {
    "apiKey": "...",
    "authDomain": "...",
    "projectId": "...",
    "storageBucket": "...",
    "messagingSenderId": "...",
    "appId": "..."
  }
}
```

This file is gitignored and must not be committed.

### 4. Create `.env`

Create `.env` in the project root with the following variables:

```
REACT_APP_GA_TRACKING_ID_DEVELOP=G-XXXXXXXXXX
REACT_APP_GA_TRACKING_ID_PRODUCTION=G-XXXXXXXXXX
ATCODER_USERNAME=your_atcoder_username
ATCODER_PASSWORD=your_atcoder_password
```

`ATCODER_USERNAME` / `ATCODER_PASSWORD` are used by Cloud Functions to log in to AtCoder and fetch contest data.

### 5. Build shared types

The `shared/` package contains types used by both the frontend and Cloud Functions. Build it first:

```
$ cd shared
$ npm install
$ npm run build
$ cd ..
```

### 6. Install frontend dependencies and start

```
$ npm install
$ npm run start:develop
```

Open http://localhost:3000

### 7. (Optional) Firebase Functions setup

```
$ firebase login
$ firebase init
$ cd functions
$ npm install
```

To run Functions locally:

```
$ npm run serve
```

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run start:develop` | Start dev server with develop environment |
| `npm run start:production` | Start dev server with production environment |
| `npm run build:develop` | Build for develop environment |
| `npm run build:production` | Build for production environment |
| `npm run deploy` | Build for production and deploy to Firebase Hosting |

## How to update dependencies

```
$ npx npm-check-updates -u
$ npm install
```
