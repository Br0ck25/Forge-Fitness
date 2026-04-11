# Forge Fitness

Forge Fitness is a mobile-first calorie tracking Progressive Web App built with Vite, React, TypeScript, Tailwind CSS, React Router, local browser storage, and `vite-plugin-pwa`.

The app is designed for fast daily use:

- optional onboarding
- manual goals always allowed
- bottom navigation on every screen
- barcode scanning with Open Food Facts
- favorites and reusable custom meals
- offline-first local persistence with local browser storage
- installable PWA with service worker caching

## Tech stack

- Vite 7
- React 19 + TypeScript
- Tailwind CSS 4
- React Router
- localStorage
- `vite-plugin-pwa`
- `@zxing/browser` for barcode scanning
- Open Food Facts API for product search and barcode lookup

## Features

### Core calorie tracking

- daily calorie total
- remaining calories
- macro progress for protein, carbs, and fat
- meal sections for breakfast, lunch, dinner, and snacks
- add / edit / delete entries
- move logged entries between meals

### Optional profile + manual goals

- first-visit modal shown on first load only
- skip is always available
- optional profile fields:
  - age
  - sex
  - height
  - weight
  - activity level
- BMR + TDEE calorie suggestion using Mifflin–St Jeor
- manual calorie and macro goals always editable in Settings

### Food logging flows

- manual entry
- food name search
- barcode scanning with camera
- manual barcode fallback
- save foods as favorites
- create reusable custom meals from multiple items

### PWA + offline

- installable on supported mobile browsers
- app shell cached via service worker
- local persistence via local browser storage
- works offline for:
  - viewing logs
  - viewing favorites and meals
  - adding manual entries

## Routes

- `/` — Home dashboard + daily log
- `/search` — Food search
- `/scan` — Barcode scanner
- `/saved` — Favorites + custom meals
- `/settings` — Profile, goals, units, reset, app info

## Project structure

```text
src/
  components/
    layout/
    navigation/
    ui/
  features/
    home/
    saved/
    scan/
    search/
    settings/
  hooks/
  store/
  types/
  utils/
```

## Getting started

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open the local URL shown by Vite.

### Build for production

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Notes for barcode scanning

- camera access requires user permission
- mobile browser camera support works best on `https:` or `localhost`
- if camera access is denied, the app supports:
  - manual barcode lookup
  - full manual food entry

## Data storage

The app stores all user data locally in browser storage (`localStorage`):

- settings
- optional profile
- goals
- favorites
- custom meals
- daily log entries
- first-visit state

No server database is required.

## API notes

Open Food Facts is used for:

- search by food name
- barcode lookup

The search flow is submit-based rather than search-as-you-type to be respectful of the API's published rate limits.

## Verification

Verified in this workspace:

- `npm run lint`
- `npm run build`

## Future improvements

- add charts/history views
- add recent foods
- add export / import backup
- add richer offline caching for previously seen API foods
- split scan dependencies even further if native-like startup speed becomes the top priority
