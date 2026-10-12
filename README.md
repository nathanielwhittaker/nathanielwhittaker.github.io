# Portfolio

Static site: plain HTML/CSS/JS with no build step. Live at **https://nathanielwhittaker.github.io**.

- `index.html` — the main page
- `projects.js` — **all home-page content** (projects, professional highlights, pipeline stages). Edit this file to add or change projects.
- `main.js` — home-page interactivity (filters, card tilt, modal + gallery, pipeline stepper, ember particles, theme toggle)
- `design.html` + `design.js` — the ARPG design-rationale page. All of its content (decision cards, the evolution timeline) is in `design.js`.
- `styles.css` — styling for both pages (dark/light themes via CSS variables)
- `assets/img/` — screenshots (JPG, ≤1600px wide)
- `assets/docs/` — resume PDF (the public copy has no phone number)

## Run locally

```bash
npx http-server . -p 5173 -c-1
```

## Deploy

GitHub Pages serves the `main` branch root (Settings → Pages → Deploy from a branch → `main` / `/`).
Pushing to `main` publishes the site. `.nojekyll` makes Pages serve the files as-is.

Deep links:
- `/#project/<id>` opens a project modal directly, e.g. `/#project/arpg`
- `/design.html#technical` and `/design.html#game` open the design page with a filter applied
