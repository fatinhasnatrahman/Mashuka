# Socks E-Commerce Storefront & Integrated CMS

Self-hosted BDT (`৳`) socks e-commerce storefront and backend CMS dashboard built with React, Vite, Express, and embedded SQLite (`data/store.db`).

## Self-Hosting Deployment Guide

1. **Upload the project folder** to your Node.js hosting / VPS (Node.js 22+ recommended).
2. **Create `.env`** from `.env.example` and set a strong `ADMIN_SESSION_SECRET` (plus `PORT` if your host assigns a custom port).
3. **Install dependencies, build the frontend, and start the server:**
   ```bash
   npm install
   npm run build
   npm start
   ```
4. **Access the Storefront & Admin CMS:**
   - Storefront: `https://yourdomain.com/`
   - Admin CMS Dashboard: `https://yourdomain.com/admin`
   - Default Admin Password on first boot: `admin123` (change it immediately inside **Storefront CMS -> Admin Security**).

## Persistent Data Backup

- SQLite Database: `data/store.db`
- Uploaded Product & Hero Photos: `public/uploads/`
