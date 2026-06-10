# 🏮 LanternCare World Cup Sweepstake ⚽

A simple leaderboard for our office sweepstake. Each player drew **two teams**;
their score is the sum of both teams' points, computed from real match results.

Built with Vite + React, no backend — all data lives in JSON files and the site
is hosted on **GitHub Pages**.

## Scores update automatically

A scheduled GitHub Action (`.github/workflows/update-scores.yml`) runs every
30 minutes, pulls played matches from the free, public-domain
[openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)
dataset (no API key), writes `src/data/matches.json`, then rebuilds and
redeploys. Run it on demand from the **Actions** tab, or locally:

```bash
npm run scores
```

Two things stay manual: **red cards** (not in the dataset — add `homeReds` /
`awayReds` to a match by hand; the fetch script preserves them) and **snacks**
(see below).

> Note: API-Football's free tier doesn't cover the 2026 season, which is why we
> use openfootball. The data is volunteer-maintained, so results can lag from
> minutes to a few hours behind real life.

## Editing scores by hand

> The auto-fetch regenerates `matches.json` each run (it preserves any
> `homeReds`/`awayReds` you add, but other hand-added matches get replaced).
> Use this if you're not running the scheduled fetch.

You only ever enter **facts** (the actual match scores). Points are computed
automatically by the rules in `src/scoring.js`.

Add each match to `src/data/matches.json`:

```json
{ "stage": "group", "home": "ENG", "away": "FRA", "homeGoals": 2, "awayGoals": 1, "homeReds": 0, "awayReds": 1 }
```

- `stage` is one of: `group`, `round16`, `quarter`, `semi`, `final`.
- `home` / `away` are team codes from `src/data/teams.json`.
- `homeReds` / `awayReds` are optional red-card counts (default 0).
- Stage and champion bonuses are derived automatically: a team that appears in
  a `round16` match advanced from the group, one in a `quarter` match reached
  the quarters, and the team that wins a `final` match is champion.

**Snack days** are per player — bump `snackDays` in `src/data/players.json`
(+7 each), or use the in-app snack form (see below).

Commit and push to `main` — the GitHub Action rebuilds and redeploys.

## Snacks via Google Form + Sheet (optional)

Snacks are logged through a **Google Form** (free, no code, no tokens). The
cron job reads the form's responses and updates `snackDays` for you.

**Setup (one-time):**

1. Create a **Google Form** with a single required question — a dropdown of the
   players' names (matching `name` in `players.json`). One submission = one
   snack day. Optionally add an "Email" or leave it anonymous.
2. In the form's **Responses** tab, link it to a Google Sheet.
3. In that Sheet: **File → Share → Publish to web → Comma-separated values
   (.csv)**. Copy the published URL.
4. In the GitHub repo (Settings → Secrets and variables → Actions →
   **Variables**) add:
   - `SNACK_SHEET_CSV_URL` = the published CSV URL.
   - `VITE_SNACK_FORM_URL` = the public form link (so the site shows the button).

That's it. The script counts one snack day per response row and writes
`snackDays`, recomputing from scratch each run — so **to undo a snack day, just
delete that row** in the Sheet. Test it locally with:

```bash
SNACK_SHEET_CSV_URL="https://docs.google.com/.../pub?output=csv" npm run snacks
```

If `VITE_SNACK_FORM_URL` is unset the button is hidden; if `SNACK_SHEET_CSV_URL`
is unset the sync is skipped (manual `snackDays` edits are left untouched).

## Scoring rules

Edit the `SCORING` object in `src/scoring.js`. Current rules:

| Event                       | Points |
| --------------------------- | ------ |
| Win                         | +3     |
| Draw                        | +1     |
| Advance from group stage    | +5     |
| Reach quarter-finals        | +10    |
| Reach semi-finals           | +10    |
| World Cup winners 🎉        | +15    |
| Red card                    | −2     |
| Snack day (per player) 🍪   | +7     |

Stage bonuses are **cumulative** (a team reaching the semis banks group +
quarter + semi). Ties are broken by total goals scored across both teams.

## Players & teams

- `src/data/players.json` — each player and their two team codes.
- `src/data/teams.json` — team codes, display names, and flag emoji.

## Local development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

## Deploying to GitHub Pages (one-time setup)

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set **Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which builds and
   publishes the site. The Pages URL appears in the Actions run summary.

`vite.config.js` uses `base: './'` so it works on a project Pages URL
(`https://<user>.github.io/<repo>/`) without hard-coding the repo name.
