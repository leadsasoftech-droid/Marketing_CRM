# WhatsApp Marketing CRM

Full-stack CRM for WhatsApp outreach — React frontend with Express/MongoDB backend.

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env        # Configure your environment
npm install
npm run dev                 # Starts with nodemon on port 5000

# Frontend
cd frontend
npm install
npm run dev                  # Starts on http://localhost:5173
```

## Tech Stack

| Layer    | Technology                |
|----------|---------------------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend  | Express 4, MongoDB, Mongoose, JWT |
| Design   | Inter font, Material Symbols Outlined |
| API      | Fast2SMS WhatsApp API |

## Frontend Screens

- **Login** — JWT authentication form
- **Dashboard** — Campaign metrics, messaging activity chart, active campaigns
- **Send Message** — Compose and send single WhatsApp messages
- **Bulk Message** — CSV/XLS upload for mass campaigns
- **Sent History** — Delivery tracking with filters and pagination
- **User Management** — Team access and role provisioning
- **Roles** — Role-based permission management
- **Profile** — User account details and password management
- **Provider** — WhatsApp provider configuration

## Backend Features

- Bootstrap signup for first super_admin
- Admin creation and CRM access ID assignment
- Login by email or crmAccessId
- Single and bulk WhatsApp send APIs
- Message history with filters and pagination
- Security: CORS, Helmet, rate limiting, request sanitizing, validation

## Environment Notes

- Runtime backend secrets live in `backend/.env`.
- The local workspace backend is configured to use MongoDB Atlas through `MONGO_URI` in `backend/.env`.
- `backend/.env.example` and `backend/example.env` remain sanitized templates for setup and documentation.
- WhatsApp sending now uses Fast2SMS session messaging with `FAST2SMS_API_KEY` and `FAST2SMS_PHONE_NUMBER_ID`.

## Project Structure

```
CRM/
├── agents.md              ← AI agent instructions (read first!)
├── .agents/workflows/     ← Agent workflow automation files
├── backend/               ← Express API
└── frontend/              ← React + Vite + Tailwind
    ├── stitch_ref/        ← Original design reference (read-only)
    └── src/               ← Application source code
```

## For AI Agents

Read [`agents.md`](agents.md) before making any changes — it contains the complete design system, architecture details, and modification guides.
