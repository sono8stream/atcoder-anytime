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
3. Register a web app and copy the Firebase config

### 3. Create `src/firebase/index.ts`

Create the file with your Firebase config:

```TypeScript
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

const firebaseConfig = {
  // Paste your Firebase config here
};

firebase.initializeApp(firebaseConfig);

export default firebase;
```

### 4. Build shared types

The `shared/` package contains types used by both the frontend and Cloud Functions. Build it first:

```
$ cd shared
$ npm install
$ npm run build
$ cd ..
```

### 5. Install frontend dependencies and start

```
$ npm install
$ npm run start:develop
```

Open http://localhost:3000

### 6. (Optional) Firebase Functions setup

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
