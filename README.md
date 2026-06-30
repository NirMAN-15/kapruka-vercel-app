# 🛍️ Kapruka AI Shopping Assistant

A premium, bilingual AI-powered shopping and gift-delivery assistant for **[Kapruka.com](https://www.kapruka.com)** — Sri Lanka's largest e-commerce platform. Built with a modern React frontend and an Express.js serverless backend bridge proxying directly to a remote Kapruka Model Context Protocol (MCP) server.

---

## ✨ Features

*   🤖 **Casually Intelligent Chat:** Converses like a friendly human in English, Sinhala (සිංහල), or Tanglish (Sinhala written in English letters).
*   💬 **Smart Clarification:** If your query is vague (e.g. *"I want to buy a gift for under LKR 5000"*), the AI won't guess—it will ask a friendly clarification question to guide you (e.g. *"Sure! Are you looking for cakes, flowers, chocolates, toys, or watches?"*).
*   🎨 **Premium Aesthetic & Accessibility:** Sleek dark-mode default with a beautiful light-mode toggle featuring fully-tested high-contrast colors (no unreadable text!).
*   📱 **Fully Mobile Responsive:** Features a sliding hamburger sidebar menu drawer and overlay backdrops for comfortable mobile phone shopping.
*   🛒 **Interactive Checkout Wizard:** Add items to your cart, select delivery dates via a calendar with dynamic validation (tomorrow or later), pick canonical Sri Lankan cities from a dropdown to prevent spelling errors, and calculate real shipping rates dynamically.
*   📦 **Live Order Tracker:** Track your order in real-time with an interactive status timeline showing progress from *Received* to *Delivered*.
*   🚀 **Vercel Serverless Ready:** Structured as a monorepo optimized for instant deployment using Vercel Serverless Functions.

---

## 📁 Project Structure

```text
kapruka-monorepo/
├── api/              # Vercel serverless function entrypoint
│   └── index.js
├── client/           # React (Vite) Frontend App
│   ├── src/
│   │   ├── App.jsx   # Main application component
│   │   └── index.css # Global styles and theme tokens
│   └── index.html
├── server/           # Express.js Backend Bridge Proxy
│   └── index.js      # Main API and orchestrator
├── package.json      # Workspace root configuration
└── vercel.json       # Vercel routing rules
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
Ensure you have **Node.js 18+** installed.

### 2. Install Dependencies
Run the installation command in the monorepo root (it will automatically install dependencies for both the frontend and backend using npm workspaces):
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server/` directory:
```bash
cp server/.env.example server/.env
```
Fill in the following variables:
```env
# Google Gemini API Key (Highly Recommended)
GEMINI_API_KEY=your_gemini_api_key_here

# Kapruka MCP Server Endpoint
KAPRUKA_MCP_URL=https://mcp.kapruka.com/mcp

# Local Server Port
PORT=5000
```

### 4. Running the App
Start both frontend and backend development servers simultaneously:

**Terminal 1 (Backend):**
```bash
cd server && npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client && npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🚀 Pushing & Deploying to Vercel (Hobby Tier - Free)

This monorepo is fully optimized for Vercel.

1.  Import your GitHub repository on the **[Vercel Dashboard](https://vercel.com)**.
2.  In **Build & Development Settings**, configure these overrides:
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `client/dist`
    *   **Root Directory:** `.` (project root)
3.  Add the **Environment Variables** in the Vercel dashboard:
    *   `KAPRUKA_MCP_URL` = `https://mcp.kapruka.com/mcp`
    *   `GEMINI_API_KEY` = *(your API key)*
4.  Click **Deploy**!
