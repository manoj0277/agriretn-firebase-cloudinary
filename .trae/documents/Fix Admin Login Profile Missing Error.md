## Why You See This Error
- The app shows "Account profile missing" when the Firestore document `users/{uid}` does not exist after a successful Firebase Auth sign-in.
- It’s triggered in `context/AuthContext.tsx:137` inside `login()` if `getDoc(doc(db,'users',uid))` returns no data.

## Required Admin Record in Firestore
- Collection: `users`
- Document ID: the exact Firebase Authentication `uid` of the admin account (not the email)
- Fields and types:
  - `email` (string) — must match the auth email
  - `name` (string)
  - `role` (string) — set to `Admin`
  - `status` (string) — set to `approved`
  - `phone` (string, optional) — digits only
  - `id` (number, optional) — app can derive if missing

## Step-by-Step Fix
1. Open Firebase Authentication and confirm the admin email user exists; copy its `uid`.
2. In Firestore Database:
   - Create collection `users` if it doesn't exist.
   - Add document with the copied `uid` as the Document ID.
   - Add fields above; set `role: 'Admin'` and `status: 'approved'`.
3. Sign in in the app with the admin email/password; the app will read the `users/{uid}` doc and route to Admin view.

## Common Pitfalls
- Using email as the Document ID — must use `uid`.
- Putting the document under a different collection path or project.
- Typos in `role` or `status` values; they must be exact strings (`Admin`, `approved`).
- Rules blocking reads/writes. If rules are strict, temporarily allow read to `users` for authenticated users to test.

## Optional: Create via App Signup
- Sign up in the app using email/password with role `Farmer` or `Supplier` to auto-create `users/{uid}`.
- Then change that Firestore doc’s `role` to `Admin` and `status` to `approved`.

## Verify
- After creating the Firestore doc, refresh the app and sign in.
- If it still fails, check network and that the app is pointing at the same Firebase project (`lib/firebase.ts`).