# Interview Biography

Static one-page Astro/Svelte site for helping a Vietnamese-speaking interviewee reread and prepare her biography before an interview.

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

It was structured from the source statement in `Текстовый документ.md`. Each event supports date, title, description, tags, causes, consequences, context, emotion, color, graph links, stage, and map coordinates.

## Deployment placeholder

```text
https://interview-biography.netlify.app
```
