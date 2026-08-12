# The Fitness Gone Wild — Client Website

React + TypeScript + Vite implementation of the client/customer-facing website based on the supplied HTML/CSS design.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Structure

- `src/pages/Home.tsx` — client home page
- `src/components/home/` — Hero, trek cards, featured trips, reviews, FAQ, etc.
- `src/components/layout/` — Header and Footer
- `src/data/` — temporary UI data; replace with API data later
- `src/types/` — TypeScript models
- `src/styles/global.css` — visual design and responsive styles

## Next phase

The admin portal is intentionally not included yet. The next phase can add an admin layout, dashboard, trek CRUD, bookings, reviews, enquiries and website settings.

## Images

The supplied HTML referenced local image assets that were not included with the uploaded files. This starter therefore uses the fallback/Unsplash image URLs from the supplied HTML for the UI. Replace them with your final local/CDN assets later.
