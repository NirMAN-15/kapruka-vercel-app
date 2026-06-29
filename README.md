# Kapruka AI Shopping Agent

An AI-powered shopping assistant for [Kapruka.com](https://www.kapruka.com) — Sri Lanka's leading e-commerce and gift delivery platform.

## Project Structure

```
kapruka/
├── client/          # React (Vite) frontend
│   └── src/
│       ├── App.jsx  # Main app component
│       └── index.css
├── server/          # Express.js backend bridge
│   └── index.js    # API proxy to Kapruka MCP
├── .gitignore
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- A Gemini or Anthropic API key
- Access to Kapruka MCP server

### Installation
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd client && npm install
```

### Environment Variables
Copy `.env.example` to `.env` in the `server/` directory and fill in:
```
GEMINI_API_KEY=your_key_here
KAPRUKA_MCP_URL=https://mcp.kapruka.com/mcp
PORT=5000
```

### Running Development
```bash
# Terminal 1 - Start backend
cd server && npm run dev

# Terminal 2 - Start frontend
cd client && npm run dev
```

The app will be available at `http://localhost:5173`

## Features
- 🤖 AI-powered product search and recommendations
- 🛒 Full shopping cart with checkout wizard
- 📦 Live order tracking
- 🌐 Bilingual support (English, Sinhala, Tanglish)
- 🚀 Direct integration with Kapruka MCP server
