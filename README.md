# EcoPulse

EcoPulse is a modern full-stack platform for sharing, discovering, and engaging with innovative ideas. Users can submit ideas, vote, comment, pay for premium ideas, and manage their watchlists. The platform supports multiple authentication methods and provides detailed tracking for ideas and user activity.

## Database Schema

The database schema is designed using [DBML](https://dbdiagram.io/) and covers all core models including Users, Ideas, Votes, Comments, Payments, Accounts, Sessions, Feedbacks, Categories, and Watchlists.

You can view the interactive diagram here: [EcoPulse DB Diagram](https://dbdiagram.io/d/Eco-Pulse-69cba5ac78c6c4bc7aac01e5)

### Models Overview

- **User**: Stores user information, roles, status, and relations to ideas, votes, comments, payments, watchlists, sessions, and accounts.
- **Idea**: Represents submitted ideas with problem, solution, price, status, votes, comments, and related feedback.
- **Vote**: Tracks votes (upvote/downvote) per user per idea.
- **Comment**: Supports nested comments for ideas.
- **Payment**: Stores payments made by users for premium ideas.
- **WatchList**: Users can add ideas to watchlists.
- **Feedback**: Optional feedback related to an idea.
- **Account & Session**: For authentication and session management.
- **Category**: Categories to organize ideas.
- **Verification**: For email or other verification processes.

### Quick DB Access

- The schema is maintained in [DBML format](https://dbdiagram.io/docs) for easy updates.
- Enum types are used for roles, user status, idea status, payment status, and payment gateway.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/rafiqmia65/eco-pulse-server.git
   cd eco-pulse-server
   ```

````

2. Install dependencies:

   ```bash
   pnpm install
   ```
3. Set environment variables in `.env` (example):

   ```env
   DATABASE_URL=your_database_url
   BETTER_AUTH_SECRET=your_secret
   BETTER_AUTH_URL=http://localhost:5000
   PORT=5000
   ```
4. Run Prisma migrations:

   ```bash
   pnpm prisma migrate dev
   ```
5. Start the server:

   ```bash
   pnpm dev
   ```

---

This setup ensures that the database is in sync with the schema diagram, and all relationships between models are properly maintained.
````
