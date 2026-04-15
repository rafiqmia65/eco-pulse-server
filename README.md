# 🌿 EcoPulse Server (Clean Architecture Backend)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6+-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7+-purple.svg)](https://www.prisma.io/)
[![Express](https://img.shields.io/badge/Express-5+-black.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

EcoPulse is a **scalable idea-sharing backend system** built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.  
It follows a **modular Clean Architecture pattern** with strict role-based access control, payments, and full idea lifecycle management.

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
│ ├── env.ts
│ └── stripe.config.ts
│
├── middlewares/
│ ├── checkAuth.ts
│ ├── optionalAuth.ts
│ ├── validateRequest.ts
│ ├── globalErrorHandler.ts
│ └── notFound.ts
│
├── modules/
│ ├── auth/
│ ├── user/
│ ├── idea/
│ ├── admin/
│ ├── category/
│ ├── vote/
│ ├── comment/
│ ├── payment/
│ └── watchlist/
│
├── routes/
│ └── indexRoutes.ts
│
├── shared/
│ ├── catchAsync.ts
│ └── sendResponse.ts
│
└── utils/
├── jwt.ts
├── cookie.ts
├── token.ts
└── QueryBuilder.ts

prisma/
├── schema.prisma
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

## 🔐 Authentication

- JWT-based authentication
- Role-based access (ADMIN / MEMBER)
- Secure login / register / logout

## 💡 Idea System

- Create / update / delete ideas
- Idea lifecycle:

```

DRAFT → REVIEW → APPROVED → REJECTED

```

- Trending & latest ideas
- Access control for premium ideas

## 👍 Voting System

- Upvote / downvote toggle
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
- Payment history tracking
- Secure webhook handling

## 🧑‍💼 Admin Panel

- Manage users
- Approve/reject ideas
- View platform statistics
- Payment monitoring

## 📊 Analytics

- Trending ideas
- Engagement stats
- User activity tracking

---

# 🛠 Tech Stack

### Backend

- Node.js 18+
- Express.js 5
- TypeScript
- Prisma ORM
- PostgreSQL

### Security & Auth

- JWT Authentication
- bcrypt password hashing
- Role-based authorization

### Payments

- Stripe API
- Webhook verification

---

# 📡 API ROUTES

## 🔐 Auth

```

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET /api/v1/auth/me
POST /api/v1/auth/change-password

```

---

## 👤 Users

```

PATCH /api/v1/users/update-profile
GET /api/v1/users/stats

# Admin Only

GET /api/v1/users
GET /api/v1/users/:id
PATCH /api/v1/users/make-admin/:id
PATCH /api/v1/users/block/:id
PATCH /api/v1/users/unblock/:id

```

---

## 💡 Ideas

```

GET /api/v1/ideas
POST /api/v1/ideas
PATCH /api/v1/ideas/:id
DELETE /api/v1/ideas/:id

GET /api/v1/ideas/my-ideas
GET /api/v1/ideas/my-idea/:id
PATCH /api/v1/ideas/:id/submit

GET /api/v1/ideas/access/:id
GET /api/v1/ideas/latest
GET /api/v1/ideas/trending

```

---

## 🧑‍💼 Admin

```

GET /api/v1/admin/ideas
GET /api/v1/admin/ideas/:id
PATCH /api/v1/admin/ideas/approve/:id
PATCH /api/v1/admin/ideas/reject/:id
GET /api/v1/admin/stats
GET /api/v1/admin/payments

```

---

## 💬 Comments

```

POST /api/v1/comments/:ideaId
PATCH /api/v1/comments/:commentId
DELETE /api/v1/comments/:commentId
PATCH /api/v1/comments/restore/:commentId
GET /api/v1/comments/:ideaId

```

---

## 👍 Votes

```

POST /api/v1/votes/:ideaId
GET /api/v1/votes/my-voted-ideas

```

---

## 📌 Watchlist

```

POST /api/v1/watchlist/toggle/:id
GET /api/v1/watchlist

```

---

## 💳 Payments

```

POST /api/v1/payments/idea/:ideaId
GET /api/v1/payments/my-purchases-ideas
GET /api/v1/payments/my-purchases-ideas/:ideaId
GET /api/v1/payments/history
POST /api/v1/payments/webhook

```

---

## 📂 Categories

```

POST /api/v1/categories
GET /api/v1/categories
PATCH /api/v1/categories/:id
DELETE /api/v1/categories/:id

GET /api/v1/categories/admin
PATCH /api/v1/categories/admin/recover/:id

```

---

# 🔐 Security Layer

- JWT Authentication
- Role-Based Access Control (RBAC)
- bcrypt password hashing
- Zod validation
- Stripe webhook verification
- Protected routes middleware

---

# 🚀 Deployment (Vercel)

### Environment Variables

```

DATABASE_URL
BETTER_AUTH_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FRONTEND_URL

```

⚠️ Do NOT use `PORT` in Vercel deployment

---

# ⚡ System Workflow

## Idea Lifecycle

```

DRAFT → REVIEW → APPROVED → REJECTED

```

## Payment Flow

```

User selects idea
→ Stripe payment
→ Webhook verification
→ Unlock premium content

```

---

# 🤝 Contributing

```

git checkout -b feature-name
git commit -m "feat: add feature"
git push origin feature-name

```

---

# 📄 License

ISC

---

# 🔗 Links

- Frontend: https://github.com/rafiqmia65/eco-pulse-client
- Database Schema: https://dbdiagram.io/d/Eco-Pulse
