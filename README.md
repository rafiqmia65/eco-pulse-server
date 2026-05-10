# 🌿 EcoPulse Server (AI-Powered Sustainability Platform)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6+-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7+-purple.svg)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-orange.svg)](https://deepmind.google/technologies/gemini/)
[![Redis](https://img.shields.io/badge/Redis-Caching-red.svg)](https://redis.io/)
[![Express](https://img.shields.io/badge/Express-5+-black.svg)](https://expressjs.com/)

EcoPulse is a **production-ready, AI-driven sustainability platform** built with Node.js, Express, TypeScript, and Prisma.  
It empowers users to share, discover, and monetize eco-innovations while leveraging cutting-edge AI for content generation, smart recommendations, and data analysis.

---

# 🏗 Clean Architecture Overview

EcoPulse follows strict **Clean Architecture principles** with 4 layers:

```
Presentation Layer → Application Layer → Domain Layer → Infrastructure Layer
```

### 📌 Responsibility Flow

- **Presentation Layer** → Routes, Controllers, Middlewares
- **Application Layer** → Services, Business Logic
- **Domain Layer** → Entities, Interfaces, Core Rules
- **Infrastructure Layer** → Prisma, DB, External APIs (Stripe, JWT, etc.)

---

# 📁 Project Structure (Production Ready)

```
src/
├── app.ts
├── server.ts
└── app/
    ├── config/
    │   ├── env.ts
    │   └── stripe.config.ts
    │
    ├── middlewares/
    │   ├── checkAuth.ts
    │   ├── optionalAuth.ts
    │   ├── validateRequest.ts
    │   ├── globalErrorHandler.ts
    │   └── notFound.ts
    │
    ├── modules/
    │   ├── ai/          # 🧠 AI-Powered Features
    │   ├── auth/        # 🔐 Better-Auth & JWT
    │   ├── user/        # 👤 User Profiles & Stats
    │   ├── idea/        # 💡 Idea Marketplace
    │   ├── admin/       # 🧑‍💼 Admin Dashboards
    │   ├── category/    # 📂 Categorization
    │   ├── vote/        # 👍 Engagement
    │   ├── comment/     # 💬 Social Interactions
    │   ├── payment/     # 💳 Stripe Integration
    │   └── watchlist/   # 📌 Personal Favorites
    │
    ├── routes/
    │   └── indexRoutes.ts
    │
    ├── shared/
    │   ├── catchAsync.ts
    │   └── sendResponse.ts
    │
    └── utils/
        ├── jwt.ts
        ├── cookie.ts
        ├── token.ts
        └── QueryBuilder.ts # ⚡ Advanced Query Engine

prisma/
├── schema/              # Modular Prisma Schema
└── migrations/
```

---

# ⚙️ Core Architecture Principles

### 1️⃣ Dependency Flow

```
Presentation → Application → Domain ← Infrastructure
```

### 2️⃣ Design Rules

- Each module = independent vertical slice
- Business logic never depends on Express or DB
- All external dependencies injected via services
- Strict separation of concerns

---

# ✨ Features

## 🧠 AI-Driven Intelligence (Gemini 2.5 Flash)

- **AI Content Generator**: Automatically generates catchy titles, eco-problems, solutions, and SEO-friendly slugs.
- **AI Smart Recommendations**: Suggests personalized eco-ideas based on user activity (watchlists, votes, and category interests).
- **AI Chat Assistant (EcoPulse AI)**: Context-aware assistant providing actionable sustainability insights.
- **AI Data Analyzer**: Performs sentiment analysis and impact scoring on eco-ideas.

## ⚡ Advanced Engineering & Performance

- **Distributed Rate Limiting**: Redis-backed rate limiting to protect API endpoints and AI usage quotas.
- **High-Performance Caching**: Redis integration for session management and distributed state.
- **Structured Logging**: Production-grade logging with **Pino** and **Pino-HTTP**.
- **Advanced Query Engine**: Custom `QueryBuilder` supporting filtering, search, pagination, and sorting.

## 🔐 Authentication

- JWT-based authentication
- Role-based access (ADMIN / MEMBER)
- Secure login / register / logout
- Social Login support (Ready for configuration)

## 💡 Idea System

- Create / update / delete ideas
- Idea lifecycle: `DRAFT → REVIEW → APPROVED → REJECTED`
- Trending & latest ideas
- Access control for premium ideas

## 👍 Voting System

- Upvote / downvote Net-Score system
- Real-time vote tracking

## 💬 Comment System

- Nested comments & replies
- Edit / delete / restore support

## 📌 Watchlist

- Add/remove favorite ideas
- Personal saved list

## 💳 Payment System

- Stripe integration
- Premium idea unlock system
- Secure webhook handling

## 🧑‍💼 Admin Panel

- Manage users (Promote/Block)
- Approve/reject ideas
- View platform-wide revenue and engagement stats
- Payment monitoring

---

# 🛠 Tech Stack

### Backend

- Node.js 18+ & Express.js 5
- TypeScript
- Prisma ORM & PostgreSQL
- **Google Generative AI (Gemini SDK)**
- **Redis (Caching & Rate Limiting)**
- **Pino (Structured Logging)**

### Security & Auth

- JWT Authentication & `better-auth`
- bcrypt password hashing
- Role-based authorization (RBAC)

### Payments

- Stripe API & Webhook verification

---

# 📡 API ROUTES

## 🧠 AI Features (`/api/v1/ai`)

```
POST /api/v1/ai/generate-content  # Content generation
GET  /api/v1/ai/recommendations     # Personalized suggestions
POST /api/v1/ai/chat              # Interactive AI assistant
GET  /api/v1/ai/analyze/:ideaId    # Impact & sentiment analysis
GET  /api/v1/ai/conversations     # User chat history
```

## 🔐 Auth (`/api/v1/auth`)

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/auth/me
POST /api/v1/auth/change-password
```

## 👤 Users (`/api/v1/users`)

```
PATCH /api/v1/users/update-profile
GET /api/v1/users/stats

# Admin Only
GET /api/v1/users
PATCH /api/v1/users/make-admin/:id
PATCH /api/v1/users/block/:id
PATCH /api/v1/users/unblock/:id
```

## 💡 Ideas (`/api/v1/ideas`)

```
GET /api/v1/ideas                  # All ideas (Filter/Search/Sort)
POST /api/v1/ideas                 # Create Idea
PATCH /api/v1/ideas/:id            # Update Idea
DELETE /api/v1/ideas/:id           # Delete Idea
GET /api/v1/ideas/my-ideas         # User's own ideas
GET /api/v1/ideas/access/:id       # Details (Handles Paid/Locked)
GET /api/v1/ideas/latest           # Homepage recent
GET /api/v1/ideas/trending         # Homepage trending
```

## 🧑‍💼 Admin (`/api/v1/admin`)

```
GET /api/v1/admin/ideas            # Moderation queue
PATCH /api/v1/admin/ideas/approve/:id
PATCH /api/v1/admin/ideas/reject/:id
GET /api/v1/admin/stats            # Dashboard analytics
GET /api/v1/admin/payments         # Revenue history
```

## 💬 Comments (`/api/v1/comments`)

```
POST /api/v1/comments/:ideaId
PATCH /api/v1/comments/:commentId
DELETE /api/v1/comments/:commentId
GET /api/v1/comments/:ideaId
```

---

# ⚙️ Environment Configuration

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your_secret
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# New Features
GEMINI_API_KEY=your_gemini_key
REDIS_URL=redis://...

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

# 🚀 Deployment (Vercel)

⚠️ Do NOT use `PORT` in Vercel deployment. Ensure all environment variables are added to the Vercel dashboard.

---

# ⚡ System Workflow

## Idea Lifecycle

`DRAFT → REVIEW → APPROVED → REJECTED`

## Payment Flow

`User selects idea → Stripe payment → Webhook verification → Unlock premium content`

---

# 🤝 Contributing

1. `git checkout -b feature-name`
2. `git commit -m "feat: add feature"`
3. `git push origin feature-name`

---

# 📄 License

ISC

# 🔗 Links

- **Frontend Repo**: [EcoPulse Client](https://github.com/rafiqmia65/eco-pulse-client)
- **Database Schema**: [Eco-Pulse Diagram](https://dbdiagram.io/d/Eco-Pulse)
- **Live API**: [Vercel Deployment](https://eco-pulse-server.vercel.app)
