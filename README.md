# Biography Detective

Static one-page Astro/Svelte site for exploring an immigrant biography as an investigation. The UI and sample biography are written in Vietnamese for Vietnamese readers.

## Requirements

- Node.js 20+
- npm

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static output is generated in `dist/` and can be deployed to Netlify, Vercel, or any static host.

## Content

The interactive biography data is stored in one file:

```text
src/data/biography.json
```

It was structured from the source statement in `Текстовый документ.txt`. Each event supports date, title, description, tags, causes, consequences, context, emotion, color, graph links, stage, and map coordinates.

## Deployment placeholder

```text
https://biography-detective.netlify.app
```
