# Project

A React + Vite + TypeScript web application.

## Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Default Vite CSS setup (ready for Tailwind or other CSS frameworks)
- **Build**: Vite static build → `dist/`

## Development

- Run: `npm run dev` (starts on port 5000, host 0.0.0.0)
- Build: `npm run build`

## Deployment

Configured as a static site deployment — builds with `npm run build`, serves from `dist/`.

## Project Structure

- `src/` — React source code
- `public/` — Static assets
- `attached_assets/` — User-provided assets (e.g., Excel data files)
- `index.html` — App entry point
- `vite.config.ts` — Vite configuration (port 5000, allowedHosts: true)
