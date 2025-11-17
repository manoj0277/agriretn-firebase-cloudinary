## Product Goals

* Build a fully functional marketplace where farmers rent equipment/services from suppliers, supervised by admins.

* Implement robust authentication, role-based access, booking lifecycle, messaging, notifications, ratings, support tickets, analytics.

* Use Firebase Authentication, Firestore, Cloud Functions, and Storage. Ingest external data from online sources into the catalog.

## User Roles & Permissions

* Farmer: browse/search, create bookings, chat, manage payments, review suppliers/items, manage profile, create support tickets.

* Supplier: manage listings, accept/fulfill bookings, communicate, update statuses, manage schedule/blocked dates, view ratings, manage profile.

* Admin: approve suppliers, manage users/items/bookings/support, broadcast notifications, view analytics, moderate community.

## Core Features

* Auth: email/password (optional phone link), password reset, email verification.

* Supplier approval: pending → approved by admin.

* Items & machines: CRUD, categories, purposes, pricing, images, availability.

* Booking: creation, status transitions, OTP optional, pricing break-down, payment record.

* Messaging: real-time 1:1 chat tied to bookings or general.

* Notifications: in-app + push via FCM.

* Ratings/Reviews: post-completion for items or users.

* Tracking: item current location, status timeline.

* Support: tickets and threaded replies.

* Community: forum posts and replies.

* Admin analytics: dashboards of users/bookings/revenue/ratings.

* External data ingestion: fetch listings/prices from online sources, normalize into items.

## Detailed User Journeys

* Farmer: signup/login → browse/search → item detail → book → chat/track → pay → rate → view history → manage account → support.

* Supplier: signup/login (pending) → admin approval → create items → receive booking requests → accept/fulfill → update statuses → get paid → view reviews.

* Admin: login → dashboard → approve suppliers → manage users/items/bookings/support → analytics → policy updates.

## Screens

* Auth: Login, Signup with role switch.

* Home: Farmer Home, Supplier Home, Admin Dashboard.

* Items: List by category, Item Detail.

* Booking: Booking Form, Booking Success, Booking History.

* Messaging: Conversations, Chat.

* Tracking: live map/status timeline.

* Ratings: Rate Item, Rate User.

* Payments: Payment form, Payment History.

* Community: Posts, Replies.

* Support: Tickets list, Ticket detail/thread.

* Account: My Account (profile, password, photos, blocked dates).

* Settings/Policy: Preferences, Language, Theme, Policy pages.

* AI/Assist: Assistant, Voice input, optional Scan.

## Firestore Data Model (Collections)

* `users/{userId}`: name, email, phone, role, status, profilePicture, location, avgRating, blockedDates\[], createdAt.

* `items/{itemId}`: ownerId, name, category, purposes\[{name, price}], images\[], location, available, status, description, model, year, quantityAvailable, seasonalPrices\[], avgRating, source{ name, url, sourceId, fetchedAt }, createdAt.

* `bookings/{bookingId}`: farmerId, supplierId?, itemId?, itemCategory, date, startTime, estimatedDuration, location, status, workPurpose, quantity, operatorRequired, priceBreakdown, paymentMethod, paymentIds, otpCode?, timestamps{ created, confirmed, arrived, inProcess, completed }.

* `reviews/{reviewId}`: itemId? or ratedUserId?, bookingId, reviewerId, rating, comment, createdAt.

* `conversations/{chatId}`: participants\[userIds], lastMessageAt.

* `messages/{messageId}`: chatId, senderId, receiverId, text, timestamp, read.

* `communityPosts/{postId}`: authorId, title, content, timestamp.

* `communityReplies/{replyId}`: postId, authorId, content, timestamp.

* `supportTickets/{ticketId}`: userId?, name, email, message, status, timestamp.

* `supportReplies/{replyId}`: ticketId, authorId, text, timestamp.

* `notifications/{notificationId}`: userId? (0=broadcast), message, type, read, timestamp.

* `supplierApprovals/{requestId}`: userId, status, approvedBy?, approvedAt?.

## Storage Structure

* `users/{userId}/profile/profile.jpg`

* `users/{userId}/documents/aadhar.jpg`

* `items/{itemId}/images/{imageName}.jpg`

* `community/{postId}/images/{imageName}.jpg`

* Cloud Functions create thumbnails and validate MIME/size.

## Security Rules (Outline)

* Auth required for most reads/writes; public read allowed for approved items (limited fields).

* Users: self-read/write; admin can manage all; role/status changes via functions only.

* Items: suppliers manage their own; admins manage all.

* Bookings: farmer creates/reads their own; supplier updates assigned; admin manages all.

* Reviews: allowed only for completed bookings participants.

* Messages: only participants can read/write.

* Support: user-only on their tickets; admin all.

* Storage: path-based ownership; signed URLs for restricted downloads.

## Cloud Functions (API)

* `onUserCreate`: init profile, default role Farmer, welcome notification.

* `requestSupplierApproval`: create approval request.

* `approveSupplier`: set status approved, notify.

* `createItem`: validate inputs, set status pending or approved.

* `createBooking`: check availability, pricing, create booking, notify supplier.

* `updateBookingStatus`: guard transitions, notify participants, payment triggers.

* `completeBooking`: set completed, enable reviews.

* `createReview`: update avgRating.

* `sendNotification`: FCM + Firestore doc.

* `ingestExternalData`: scheduled fetch from online APIs/feeds, normalize to `items`, dedupe by `sourceId`.

* `imageProcessing`: resize, thumbnail.

* `cleanup`: archive old notifications/messages, expire stale bookings.

## External Data Ingestion

* Sources: public equipment listings/price feeds or provided APIs.

* Scheduler: run every 6–12 hours.

* Pipeline: fetch → transform → map to categories/purposes → dedupe → write `items` as sourced entries → admin auto-approval rules or manual review.

## Notifications & Messaging

* FCM web push; email fallback via provider (optional).

* In-app bell and unread counts; real-time chat updates.

## Payments (Phased)

* Phase 1: record payment intent/method (Cash/UPI/Card/Wallet) and status.

* Phase 2: integrate Stripe/Razorpay via functions; store transaction IDs and receipts.

## Maps & Tracking

* Store `currentLocation` on items or per-booking; supplier app updates; render Leaflet map; optional routing/ETA.

* Geohash index for proximity queries.

## Frontend Architecture

* React + TypeScript + Vite; Tailwind or utility CSS.

* Contexts: Auth, Booking, Item, Review, Community, Chat, Notification, Settings, Language, Support, AiAssistant.

* Components: Header, BottomNav, Button, Input, ItemCard, MachineCard, NotificationBell, StarRating, Toast.

* Navigation: role-aware Home; protected routes; stack-like navigation for screens.

## Data Access & State

* Firestore hooks per collection/domain with pagination; optimistic UI where safe.

* Caching: memoization, local storage for non-sensitive preferences.

* Error states: loading, empty, retry with exponential backoff.

## i18n & Theming

* Language context with translation files; extendable.

* Light/dark theme; accessible color contrast.

## Accessibility

* Keyboard navigation across all interactive elements.

* ARIA labels, focus management, semantic HTML.

## Performance & Offline

* Index Firestore queries; paginate lists.

* Lazy-load heavy views/images; generate thumbnails.

* Optional offline caching for read-only screens.

## Testing Strategy

* Unit: components, hooks, functions logic.

* Integration: booking creation, chat, notifications.

* E2E: signup/login flows; supplier approval; booking lifecycle; payments record; reviews; support.

## DevOps & Deployment

* Environments: dev/staging/prod with separate Firebase projects.

* Hosting: Firebase Hosting for web; Functions for backend.

* CI/CD: build, lint, test, deploy gates; previews for PRs.

* Monitoring: Firebase Analytics; error reporting via Crashlytics/Stackdriver; function logs/alerts.

## Environment Variables

* `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

* Optional external APIs for ingestion and email provider keys.

## Milestones

* Phase 1: Auth, Users, Supplier Approval, Items CRUD, Home views, Security Rules.

* Phase 2: Booking engine, Chat, Notifications, Payments recording, Ratings.

* Phase 3: Tracking, Community, Support Tickets, Admin Analytics.

* Phase 4: External Data Ingestion, AI Assistant/Voice, Image Scan.

* Phase 5: Hardening: performance, accessibility, localization, tests, CI/CD.

## Acceptance Criteria

* Role-based flows work end-to-end with Firebase.

* Supplier approval gates and rules enforced.

* Items searchable and bookable; bookings follow valid status transitions.

* Messaging and notifications in real-time; push works.

* Payments recorded; history consistent.

* Reviews affect avgRatings; visible in Item/User profiles.

* Support and community features functional with moderation.

* External data ingestion populates catalog with source metadata.

* Security rules prevent unauthorized access; storage paths enforced.

* Accessibility, performance, and localization standards met.

