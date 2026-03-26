# Danish Election 2026 Government Puzzle

A lightweight, static web app inspired by SVT's coalition puzzle format, adapted for the 2026 Danish general election.

## Run locally

Because this is plain HTML/CSS/JS, you can open `index.html` directly in a browser.

For module-safe local serving:

```bash
python3 -m http.server 8080
```

Then visit: `http://localhost:8080`

## What it includes

- All parties that won seats in the 2026 election (total: 179 seats)
- Two interactive areas:
  - In government
  - Not in government
- Drag-and-drop and click-to-move interactions
- Seat totals and majority status (threshold: 90)
- Stacked bar views for both groups
- A short "Most likely combinations" commentary panel
