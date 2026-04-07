# Meal Jet Backend

Backend API for the Meal Jet food delivery platform, built with Node.js, Express, TypeScript, MongoDB, Redis, and Socket.IO.

## Tech Stack

- Node.js + Express 5
- TypeScript
- MongoDB (Mongoose)
- Redis (ioredis)
- Socket.IO
- Zod validation
- Cloudinary (media uploads)
- Paystack (payments)
- Resend (email)

## Features

- JWT-based authentication and authorization
- Vendor and menu management
- Menu category management
- Order management
- Payment integration (Paystack)
- Real-time events with Socket.IO
- Global error handling and API rate limiting
- Structured logging

## Project Structure

```text
src/
  app.ts                      # Express app setup and route registration
  server.ts                   # Server bootstrap, DB/Redis connection, Socket.IO
  modules/
    auth/
    vendor/
    menu-category/
    menus/
    orders/
    payments/
    users/
    admin/
    delivery/
  shared/
    config/
    middleware/
    constants/
    schemas/
    types/
    utils/
```

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance
- Redis instance (recommended; app can still start if Redis is unavailable)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the backend root.

```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/meal-jet
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=no-reply@example.com

BANK_DETAILS_ENCRYPTION_KEY=32_character_encryption_key_here

PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

Required at startup:

- MONGODB_URI
- REDIS_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- RESEND_API_KEY
- EMAIL_FROM
- PAYSTACK_SECRET_KEY
- PAYSTACK_PUBLIC_KEY

## Available Scripts

```bash
npm run dev            # Start development server with watch mode
npm run build          # Compile TypeScript to dist/
npm run start          # Run production build (dist/server.js)
npm run test           # Run tests with Vitest
npm run test:coverage  # Run tests with coverage
npm run lint           # Lint source files
npm run format         # Format source files with Prettier
```

## Running the Server

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm run start
```

Health check endpoint:

```text
GET /health
```

## API Base Routes

- /api/auth
- /api/vendor
- /api/menu
- /api/menu-category
- /api/orders
- /api/payments

## Realtime Events (Socket.IO)

Current server-side room events:

- join:order
- join:restaurant

## Notes

- CORS is configured to allow `CLIENT_URL` with credentials enabled.
- Global rate limit is enabled.
- Redis connection failure is logged, and the app continues running.
