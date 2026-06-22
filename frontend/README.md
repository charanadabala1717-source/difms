# DIFMS Frontend

Next.js dashboard application for the DIFMS SaaS invoicing platform.

## What This App Does

The frontend provides the browser UI for:

- Login
- Forgot password and reset password
- Forced temporary password change after invitation
- Dashboard overview
- Customers
- Quotes
- Invoices
- Company settings
- Users and roles

The app connects to the Express backend through REST API calls from `app/difm/lib/api.ts`.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- lucide-react icons
- Recharts

## Folder Structure

```text
frontend/
  app/
    page.tsx                         Login entry page
    difm/
      login.tsx                      Login form
      lib/api.ts                     API helper and auth session storage
    change-password/page.tsx         Temporary password change page
    forgot-password/page.tsx         Forgot password page
    reset-password/page.tsx          Reset password page
    dashboards/
      layout.tsx                     Dashboard shell and navigation
      overview/page.tsx              Metrics overview
      customers/page.tsx             Customer records
      quotes/page.tsx                Quote creation and management
      invoices/page.tsx              Invoice list and PDF actions
      settings/page.tsx              Company settings, users, roles
  public/
    images/
```

## Environment Variables

Create `frontend/.env.local`.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

For production:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain/api
```

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Build production app
npm run start    # Run production build
npm run lint     # Run ESLint
```

## Authentication Flow

- Login stores JWT token and user data in `localStorage`.
- API requests automatically send:
  - `Authorization: Bearer <token>`
  - `x-organization-id: <active organization id>`
- If `mustChangePassword` is true, the user is redirected to `/change-password`.
- Dashboard layout re-checks `/auth/me` to protect dashboard pages.

## Role Behavior

- Owner/Admin: can access settings and manage users.
- Staff: can work with operational modules.
- Viewer: read-only UI. Write actions are hidden.

## Main Pages

- `/` - Login
- `/forgot-password`
- `/reset-password?token=...`
- `/change-password`
- `/dashboards/overview`
- `/dashboards/customers`
- `/dashboards/quotes`
- `/dashboards/invoices`
- `/dashboards/settings`

## Deployment

Deploy the `frontend` folder as a Next.js app on Vercel.

Set these Vercel environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain/api
```

After deployment, make sure the backend `CLIENT_URL` points to the frontend production URL.
