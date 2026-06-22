# DIFMS Backend

Express.js API for the DIFMS multi-tenant invoicing SaaS platform.

## What This API Does

The backend handles:

- JWT authentication
- User registration/login
- Forgot/reset password
- Temporary password invitation flow
- Organization and membership access
- Customer management
- Quote creation and quote email flow
- Quote accept/reject flow
- Quote to invoice conversion
- Invoice management
- Stripe payment flow
- Payment and receipt records
- PDF generation
- SMTP email sending

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Nodemailer
- PDFKit
- Stripe

## Folder Structure

```text
backend/
  config/
    db.js
  controllers/
    authController.js
    customerController.js
    quoteController.js
    invoiceController.js
    paymentController.js
    organizationController.js
    adminController.js
  middleware/
    authMiddleware.js
  models/
    User.js
    Organization.js
    OrganizationMember.js
    Customer.js
    Quote.js
    Invoice.js
    Payment.js
    Receipt.js
    Invitation.js
  routes/
    authRoutes.js
    customerRoutes.js
    quoteRoutes.js
    invoiceRoutes.js
    paymentRoutes.js
    organizationRoutes.js
    adminRoutes.js
    publicRoutes.js
  utils/
    emailService.js
    flowHelpers.js
    receiptPdf.js
    currency.js
  server.js
```

## Environment Variables

Create `backend/.env`.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_jwt_secret
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:5000
```

Email settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
MAIL_FROM=your_email@example.com
```

Stripe:

```env
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_FALLBACK_CURRENCY=GBP
EXCHANGE_RATE_API_KEY=optional_exchange_rate_api_key
```

Optional:

```env
COMPANY_LOGO_PATH=absolute_path_to_default_logo
COMPANY_NAME=Brent labs
COMPANY_ADDRESS=Company address
COMPANY_EMAIL=accounts@example.com
```

## Setup

```bash
cd backend
npm install
npm run dev
```

API base URL:

```text
http://localhost:5000/api
```

## Scripts

```bash
npm run dev                       # Start with nodemon
npm start                         # Start production server
npm run backfill:organizations    # Backfill organization data for old records
```

## Main API Areas

Authentication:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `PATCH /api/auth/change-password`

Organization:

- `GET /api/organization/members`
- `POST /api/organization/invitations`
- `DELETE /api/organization/members/:memberId`
- `GET /api/organization/users/search`

Customers:

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

Quotes:

- `GET /api/quotes`
- `POST /api/quotes`
- `GET /api/quotes/:id`
- `PUT /api/quotes/:id`
- `POST /api/quotes/:id/send`
- `POST /api/quotes/:id/convert-to-invoice`

Invoices:

- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/invoices/:id`
- `PUT /api/invoices/:id`
- `DELETE /api/invoices/:id`
- `GET /api/invoices/:id/document-pdf`
- `POST /api/invoices/:id/send-receipt`

Payments:

- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payments/invoice/:invoiceId`

Public customer actions:

- Quote accept/reject links
- Invoice payment links

## Multi-Tenancy

Most records include an `organization` field.

The auth middleware reads:

```text
x-organization-id
```

from frontend requests and loads the user's active organization membership.

Users only access records within their organization.

## Roles and Access

- Owner/Admin: full company management.
- Staff: operational access.
- Viewer: read-only. Backend blocks write APIs.

Temporary password users are blocked from all protected APIs except:

- `/api/auth/me`
- `/api/auth/change-password`

until they change their password.

## Email and PDF Behavior

Emails are sent using SMTP through Nodemailer.

Stripe currency conversion:

- Stripe first tries the invoice currency.
- If Stripe rejects that currency, the backend converts the balance to `STRIPE_FALLBACK_CURRENCY`.
- `STRIPE_FALLBACK_CURRENCY` defaults to `GBP`.
- `EXCHANGE_RATE_API_KEY` can be used with exchangerate-api.com.
- Without `EXCHANGE_RATE_API_KEY`, the backend uses the public `open.er-api.com` endpoint.

Supported emails:

- Quote email with accept/reject links
- Payment request email
- Receipt email
- Invitation email
- Password reset email

PDFs are generated with PDFKit and attached to emails where needed.

Company logos from settings are embedded into emails and PDFs where supported.

## Deployment

Deploy the `backend` folder as the API service.

Production environment variables must include:

```env
MONGO_URI=production_mongodb_uri
JWT_SECRET=production_secret
CLIENT_URL=https://your-frontend-domain
API_URL=https://your-backend-domain
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=...
STRIPE_SECRET_KEY=...
```

Make sure MongoDB Atlas network access allows the deployed backend.
