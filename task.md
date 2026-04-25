# Smart Broadcasting System — Task Tracker

## Server Setup
- [x] Initialize Node.js project, install dependencies
- [x] Create server entry point (server.js) with Express + Socket.io
- [x] MongoDB connection config
- [x] OpenAI client config (placeholder key + graceful fallback)
- [x] User model + Broadcast model + Notification model
- [x] Auth middleware (JWT)
- [x] Auth routes (register/login)
- [x] Intelligence service (OpenAI entity extraction + regex fallback)
- [x] Matching service (dynamic query builder)
- [x] Notification service (Socket.io dispatch + DB storage)
- [x] Broadcast routes
- [x] User routes (profile, location update, notifications)
- [x] Socket handler (connection management)
- [x] Campus landmarks data
- [x] Seed script for test users

## Client Setup
- [x] Initialize React (Vite) project
- [x] Design system (index.css — dark theme, glassmorphism)
- [x] Auth context + Socket context
- [x] Login page
- [x] Register page
- [x] Admin Dashboard (compose + send broadcasts, view stats)
- [x] Student Home (notification feed)
- [x] API layer (Axios)
- [x] Navbar component

## Integration & Polish
- [x] End-to-end test: admin login → send broadcast → 3 users matched
- [x] AI entity extraction verified (Year:1, Dept:AIDS, Interest:dance, Location:Auditorium)
- [ ] Test student notification view (login as student)
- [ ] Wire up real OpenAI key (when available)
