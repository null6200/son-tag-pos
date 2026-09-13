# Per-Company Deployment Guide

This project is designed for a single codebase with separate deployments, one per company. Each deployment uses its own environment file and its own PostgreSQL database, ensuring complete data isolation.

## 1) Provision per company

- Backend host (VM, Docker, or PaaS)
- PostgreSQL database (new DB per company)
- Optional: static hosting for the frontend (or serve it from the backend)

## 2) Configure environment (.env)

Create a unique backend/.env for each deployment using backend/.env.example as a template:

- DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
- JWT_SECRET=long-random-secret
- JWT_EXPIRES_IN=7d
- PORT=3000
- NODE_ENV=production
- Optional: CORS_ORIGIN=https://app.company.com
- Optional bootstrap:
  - BRANCH_BOOTSTRAP_ENABLED=true
  - BRANCH_BOOTSTRAP_NAME=Main Branch
  - BRANCH_BOOTSTRAP_LOCATION=Head Office

## 3) Backend build and run

From backend/:

- npm ci
- npx prisma generate
- npx prisma migrate deploy
- npm run build
- npm run start:prod

Health check: GET http(s)://<backend-host>:3000/api/health

## 4) Frontend options

A) Serve from backend (single origin)
- At repo root: npm run build
- Backend serves the built dist automatically if present
- Access via backend origin (e.g., https://api.company.com/)

B) Serve separately (dual origin)
- At repo root: npm run build
- Upload dist/ to your static host/CDN
- Build with VITE_API_URL set to your backend origin or ensure the app runs on the same origin behind a reverse proxy
- Enable CORS on backend with CORS_ORIGIN

## 5) Initial admin

Use the in-app Register flow to create the first ADMIN user and default branch for the company.

## 6) Operations

- Backups: schedule per-DB backups
- Monitoring: check /api/health
- Migrations: run `npx prisma migrate deploy` on deploy
- Rollback: redeploy previous build and restore DB snapshot if needed

## 7) Notes

- Each deployment is fully isolated by its own DATABASE_URL and JWT_SECRET
- Frontend must point to the correct backend (same origin preferred)
- Never share .env files or database credentials across companies
