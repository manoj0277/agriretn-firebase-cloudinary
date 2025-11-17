## Goal

* Use Firebase Auth for login/signup and store app data online in Firestore.

* Keep the existing Express backend, adding Firebase token verification for protected endpoints.

## Frontend Setup

1. Create Firebase client init

* Add `src/lib/firebase.ts` to initialize `firebase/app`, export `auth` and `db` (Firestore) using `import.meta.env.VITE_FIREBASE_*`.

1. Wire AuthContext to Firebase

* Update `context/AuthContext.tsx` to use `onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`.

* On signup, create a Firestore `users/{uid}` document with profile fields and `role`.

* On login, read `users/{uid}` and merge into context state.

1. Update AuthScreen

* Modify `screens/AuthScreen.tsx` to call new context methods and remove in-memory fallbacks.

1. Route protection

* Add a simple `RequireAuth` wrapper to guard authenticated screens and read `role` from the user doc for role-based views.

## Data Storage (Firestore)

1. Collections

* Create Firestore collections: `items`, `bookings`, `reviews`, `posts`, `tickets`, `notifications`, `chats`, `damageReports`.

1. Data access layer

* Add `src/services/firestore.ts` with typed CRUD helpers for the above collections.

* Incrementally migrate UI screens to call these helpers instead of hitting in-memory data or mock APIs.

1. Offline/real-time

* Use `onSnapshot` for real-time updates where needed (e.g., chats, bookings).

## Backend Integration (Token Verify)

1. Verify Firebase ID tokens

* Add middleware to `backend/src/index.ts` that verifies `Authorization: Bearer <idToken>` using Firebase Admin SDK.

* Protect admin/moderation endpoints; allow public reads where appropriate.

1. Gradual migration

* Keep existing routes; for writes, pass through with verified user identity until Firestore migration completes.

## Env & Config

* Ensure `.env.local` contains valid `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

* Use `import.meta.env` in Vite code; no secrets committed to source.

## Files To Add/Modify

* Add: `src/lib/firebase.ts`, `src/services/firestore.ts`.

* Modify: `context/AuthContext.tsx`, `screens/AuthScreen.tsx`, selected `screens/*` to use Firestore helpers, `backend/src/index.ts` to add token verification middleware.

## Verification

* Frontend: sign up, login, logout; confirm `users` doc created and `role` read; protect routes.

* Firestore: create item, booking, review; confirm documents appear and update in UI.

* Backend: call protected admin endpoints with ID token; receive 401 when missing/invalid, 200 when valid.

## Rollout Strategy

* Phase 1: Firebase init + AuthContext + AuthScreen + `users` collection.

* Phase 2: Token verification middleware on backend.

* Phase 3: Migrate key screens to Firestore (items/bookings), then remaining modules.

## Notes

* Align with Vite frontend at repo root; if `frontend/src` is used in your run script, mirror changes there or consolidate to one app.

* Keep security: use Firestore rules to restrict writes to authenticated users, and admin-only operations via custom claims or role checks in user docs.

