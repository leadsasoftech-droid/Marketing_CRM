---
description: How to start the CRM frontend and backend dev servers
---

# Dev Server Workflow

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally or a remote connection string in `backend/.env`

## Steps

### 1. Start the Backend
// turbo
```bash
cd /home/ashutosh/Documents/CRM/backend && npm install && npm run start
```
The backend starts on the port defined in `backend/.env` (default 5000).

### 2. Start the Frontend
// turbo
```bash
cd /home/ashutosh/Documents/CRM/frontend && npm install && npm run dev -- --host 0.0.0.0 --port 5173
```
The frontend is available at `http://localhost:5173/`.

### 3. Verify
- Open `http://localhost:5173/login` — you should see the login card
- Open `http://localhost:5173/dashboard` — you should see the dashboard with sidebar

## Notes
- Frontend and backend are **decoupled** — the frontend uses static mock data currently
- Backend requires `WHATSAPP_API_MODE=mock` in `.env` for local testing
- If port 5173 is busy, Vite will auto-increment to the next free port
