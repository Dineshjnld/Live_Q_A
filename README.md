<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Live Q&A Word Cloud

A real-time Q&A app with an admin dashboard and an audience view. Admins can create events, pose questions, and display a live word cloud of responses. Participants can join with an access code, switch between active questions, and submit multiple responses.

## Features
- Admin: create events, view event code, switch active question, clear responses for the current question, present a fullscreen word cloud.
- Audience: join by code, switch to the active question, submit multiple responses, see your personal history per question, logout.
- Persistence: Node/Express backend with MongoDB stores events/questions/responses.
- Deployment-ready: Vite + React frontend; API base configurable via env for production.

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Express + MongoDB Node Driver
- DB: MongoDB (Atlas recommended for cloud)

## Environment Variables
Create a `.env.local` in the project root with:

- MONGO_URI=<your-mongo-connection-string>
- DB_NAME=live_qa

Optional (production frontend build):
- VITE_API_BASE=https://your-backend-host

Note: No AI/Gemini keys are required. Moderation is manual via admin tools.

## Run Locally
Prerequisite: Node.js 18+

1) Install dependencies
   npm install

2) Start the backend (terminal 1)
   npm run server

3) Start the frontend (terminal 2)
   npm run dev

Frontend runs on http://localhost:5173 and proxies /api to http://localhost:5174 in dev.

## Deploy
Recommended free-tier setup:
- Frontend: Vercel (build with Vite)
- Backend: Render (Node), or any Node host
- Database: MongoDB Atlas (M0)

Steps (high level):
1. Backend host (e.g., Render)
   - Set env vars: MONGO_URI, DB_NAME, optionally FRONTEND_ORIGIN for CORS hardening.
   - Start command: node server/index.js
   - Expose port 5174 or the platform’s assigned port.
2. Frontend host (e.g., Vercel)
   - Set env var: VITE_API_BASE=https://your-backend-url
   - Build command: vite build
   - Output directory: dist

## API Overview (selected)
- POST /api/events — create event; returns adminKey/adminPin once
- GET  /api/events/code/:code — fetch event by access code
- GET  /api/events/:eventId — fetch event by id
- POST /api/events/:eventId/questions — create and activate a new question
- GET  /api/events/:eventId/questions/active — get active question
- POST /api/events/:eventId/questions/:questionId/activate — activate question
- POST /api/events/:eventId/questions/:questionId/responses — add response
- POST /api/events/:eventId/questions/:questionId/responses/clear — clear responses (admin)
- POST /api/events/:eventId/admin/verify — verify admin credentials
- GET  /health — server health check

## Troubleshooting
- If the frontend shows network errors in dev, ensure the backend is running on port 5174.
- Check your MONGO_URI and DB_NAME in `.env.local` if server fails to start.
- For production, set VITE_API_BASE on the frontend so it calls the deployed backend URL.
