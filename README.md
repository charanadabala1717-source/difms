# DIFMS

Digital Invoicing and Financial Management System.

DIFMS is a multi-tenant SaaS platform for businesses to manage customers, quotes, invoices, payments, receipts, company settings, and team access from a private organization workspace.

## Project Structure

```text
difms/
  backend/    Express.js API, MongoDB models, auth, emails, PDFs, Stripe flow
  frontend/   Next.js dashboard application
```

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, lucide-react
- Backend: Node.js, Express.js, MongoDB, Mongoose
- Auth: JWT authentication
- Email: Nodemailer SMTP
- Payments: Stripe Checkout/payment links
- PDFs: PDFKit
- Database: MongoDB Atlas or local MongoDB
- Deployment: Vercel frontend and backend

## Core Flow

1. Create customers with identity details only.
2. Create quotes for existing customers.
3. Add quote line items/services.
4. Send quote email to customer.
5. Customer accepts or rejects the quote.
6. Accepted quote can be converted into an invoice.
7. Payment email is sent for the invoice.
8. Payment updates invoice status.
9. Receipt PDF/email is available after payment.

## Multi-Tenancy

Each business works inside its own organization.

- Customers, quotes, invoices, payments, and receipts are tied to an organization.
- Users only see data for their active organization.
- Company name, logo, address, currency, tax, and discount settings are stored per organization.
- PDFs and emails use the active organization's branding.

## Roles

- Owner: full access to company settings and team management.
- Admin: can manage users, company settings, customers, quotes, invoices, and payments inside their organization.
- Staff: can work with operational records; backend supports removing members they invited.
- Viewer: read-only access. Viewers cannot create, edit, delete, send quotes, convert quotes, send invoice emails, or record payments.
- Super Admin: platform-level access for managing companies and selected platform operations.

## User Invitation Flow

Admins/owners invite team members from Company Settings.

- If the email belongs to a new user, the backend creates an account and sends a temporary password.
- The invited user logs in with the temporary password.
- The user is forced to change the password before accessing the dashboard.
- If the email already belongs to an existing user, DIFMS gives that existing account access to the organization instead of resetting their password.

## Company Settings

Company settings control:

- Company name
- Company email
- Phone and address
- Logo upload
- Currency: GBP or ZMW
- Default tax percentage
- Default discount percentage
- Team users and roles

Tax is automatically applied to quotes and invoices. Discount is applied to quotes only when the quote discount toggle is enabled.

## Key Backend Modules

- `models/User.js`
- `models/Organization.js`
- `models/OrganizationMember.js`
- `models/Customer.js`
- `models/Quote.js`
- `models/Invoice.js`
- `models/Payment.js`
- `models/Receipt.js`
- `controllers/authController.js`
- `controllers/organizationController.js`
- `controllers/customerController.js`
- `controllers/quoteController.js`
- `controllers/invoiceController.js`
- `utils/flowHelpers.js`
- `utils/receiptPdf.js`
- `utils/emailService.js`

## Key Frontend Pages

- Login: `frontend/app/page.tsx`
- Change password: `frontend/app/change-password/page.tsx`
- Forgot/reset password: `frontend/app/forgot-password`, `frontend/app/reset-password`
- Overview: `frontend/app/dashboards/overview/page.tsx`
- Customers: `frontend/app/dashboards/customers/page.tsx`
- Quotes: `frontend/app/dashboards/quotes/page.tsx`
- Invoices: `frontend/app/dashboards/invoices/page.tsx`
- Settings: `frontend/app/dashboards/settings/page.tsx`
- Super Admin Companies: `frontend/app/dashboards/super-admin/companies/page.tsx`

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

Required environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_secret
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:5000
SUPER_ADMIN_CREATOR_EMAIL=owner@example.com
```

Optional email variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
MAIL_FROM=your_email@example.com
```

Optional Stripe variable:

```env
STRIPE_SECRET_KEY=sk_test_or_live_key
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Required frontend environment variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPER_ADMIN_CREATOR_EMAIL=owner@example.com
```

## Local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

## Deployment Notes

For Vercel deployment:

- Deploy `frontend` as a Next.js app.
- Deploy `backend` as the API service.
- Set production environment variables on both projects.
- `CLIENT_URL` should point to the deployed frontend URL.
- `API_URL` should point to the deployed backend URL.
- `NEXT_PUBLIC_API_URL` should point to the deployed backend `/api` URL.
- MongoDB Atlas network access must allow the deployed backend.

## Current Status

The system is production-deployed with:

- JWT login
- Multi-tenant organization isolation
- Customer management
- Quotes with line items
- Quote accept/reject flow
- Invoice conversion
- Stripe payment flow
- Invoice and receipt PDFs
- SMTP emails with PDF attachments
- Company branding in emails and PDFs
- Roles and read-only viewer restrictions
- Team invitations with temporary password flow
- Organization member removal
