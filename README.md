# Cabin Crew Drill

A static, no-build website designed around the iPad Air 4 landscape viewport (1180 × 820 CSS pixels).

## What it does

- Select aircraft registration and cabin crew position P1–P8.
- Enter scheduled departure date and time.
- Calculates reporting time as **departure − 75 minutes**.
- Uses the **reporting calendar day** to select Q&A Day 01–31.
- Shows assigned attendant station, passenger safety briefing station, safety/emergency equipment station, cleaning zone, security check area, equipment checklist, and vital emergency equipment.
- Shows the aircraft seat configuration extracted from the Emergency Drill Checklist diagrams.
- Shows the matching daily Q&A manual pages directly below the drill result.

Example: departure **16 Sep 00:30** → reporting **15 Sep 23:15** → **Q&A Day 15**.

## GitHub Pages

There is no build step.

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Commit/push.
4. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
5. Select your main branch and `/ (root)`.

The website uses only local HTML/CSS/JS/data/images, so it does not require npm or an external CDN.

## Main files

- `index.html` — page structure
- `styles.css` — iPad-first responsive styling
- `app.js` — form logic, reporting-time calculation, results, and Q&A selection
- `assets/data/app-data.js` — extracted aircraft/checklist data
- `assets/aircraft/` — extracted aircraft seat maps
- `assets/qna/` — Q&A pages for Day 01–31

## Data note

`vitalEmergency: true` is used only where the source checklist explicitly labels an item as Vital Emergency Equipment.

The cleaning-zone chart supplied separately does not contain an ALL EY TYPE I-B column. Those cleaning-zone entries therefore remain unavailable rather than being guessed.
