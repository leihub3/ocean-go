# OceanGo

A mobile-first PWA that helps users quickly decide if they can do ocean activities RIGHT NOW based on simplified, human-readable conditions.

## Features

- 🏖️ Activity recommendations for Snorkeling, Kayaking, SUP, and Fishing
- 🚦 Visual status indicators (green/yellow/red)
- 📱 Mobile-first responsive design
- 🔄 PWA-ready with offline support
- 🌍 Multi-region support (starting with Bayahibe/Dominicus, DR)

## Tech Stack

- React 18
- TypeScript (strict mode, no `any`)
- Vite
- CSS Modules
- PWA plugin for service worker

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  components/     # React components
  services/       # API/data services
  types/          # TypeScript type definitions
  data/           # Static data (regions, etc.)
  App.tsx         # Main app component
  main.tsx        # Entry point
  index.css       # Global styles
```

## Development Principles

- Functional components only
- No `any` types allowed
- Minimal inline styles
- Mobile-first layout
- Clean componentization
- Human-readable explanations (no raw metrics)

