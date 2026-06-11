#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Pulls World Cup matches from the openfootball/worldcup.json dataset (free,
// public domain, no API key). Played matches go to src/data/matches.json in
// the shape our scoring engine expects; upcoming matches go to
// src/data/fixtures.json so the site can show the next few games.
//
// Run locally:   node scripts/fetch-scores.mjs   (or: npm run scores)
// In CI:         see .github/workflows/update-scores.yml (runs on a cron)
//
// Notes / judgement calls (easy to change):
//  - A match is "played" once it has a score; otherwise it's a fixture.
//  - Knockout games decided on penalties count as a DRAW for match points
//    (FIFA's official record); the winner still banks the stage bonus because
//    they appear in the next round's fixtures. We use extra-time score if
//    present, otherwise full-time.
//  - The third-place play-off is tagged "semi" so its win/goal points count
//    without granting an extra stage bonus.
//  - Red cards are NOT in this dataset, so any homeReds/awayReds you have
//    entered by hand in matches.json are PRESERVED across runs.
//  - Both files keep only matches involving at least one tracked team.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MATCHES_PATH = join(__dirname, '..', 'src', 'data', 'matches.json')
const FIXTURES_PATH = join(__dirname, '..', 'src', 'data', 'fixtures.json')

const SOURCE_URL =
  process.env.WORLDCUP_JSON_URL ||
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

// Map openfootball team names -> our team codes (see src/data/teams.json).
// Keys are normalised (lowercased, accents/punctuation stripped) so variants
// like "Türkiye" / "Cote d'Ivoire" still resolve.
const NAME_TO_CODE = {
  egypt: 'EGY',
  spain: 'ESP',
  norway: 'NOR',
  japan: 'JPN',
  belgium: 'BEL',
  england: 'ENG',
  portugal: 'POR',
  france: 'FRA',
  turkey: 'TUR',
  turkiye: 'TUR',
  brazil: 'BRA',
  germany: 'GER',
  cotedivoire: 'CIV',
  ivorycoast: 'CIV',
  scotland: 'SCO',
  paraguay: 'PAR',
  iran: 'IRN',
  iriran: 'IRN',
  czechrepublic: 'CZE',
  czechia: 'CZE',
  algeria: 'ALG',
  canada: 'CAN',
  colombia: 'COL',
  netherlands: 'NED',
  newzealand: 'NZL',
  switzerland: 'SUI',
  austria: 'AUT',
  croatia: 'CRO',
  morocco: 'MAR',
  uzbekistan: 'UZB',
  argentina: 'ARG',
  haiti: 'HAI',
}

const TRACKED = new Set(Object.values(NAME_TO_CODE))

function normalise(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // strip spaces & punctuation
}

// Resolve a team name to a stable identifier: our code if tracked, else a
// readable fallback so unmapped opponents still appear (they don't affect
// scoring, which only matches our codes).
function resolve(name) {
  return NAME_TO_CODE[normalise(name)] || name
}

function stageFromRound(round) {
  const r = round.toLowerCase()
  if (r.startsWith('matchday')) return 'group'
  if (r.includes('round of 16') || r.includes('last 16')) return 'round16'
  if (r.includes('quarter')) return 'quarter'
  if (r.includes('semi')) return 'semi'
  if (r.includes('third place') || r.includes('3rd place')) return 'semi'
  if (r.includes('final')) return 'final'
  return 'group'
}

// Turn openfootball's date ("2026-06-11") + time ("13:00 UTC-6") into an ISO
// instant in UTC, so the browser can render it in each viewer's local zone.
// Returns null when the time is missing or unparseable (date-only fixtures).
function parseKickoff(date, time) {
  if (!date || !time) return null
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::?(\d{2}))?/i)
  if (!m) return null
  const [, hh, mm, offH, offM] = m
  const [y, mo, d] = date.split('-').map(Number)
  const offHours = Number(offH)
  const offMins = (offHours < 0 ? -1 : 1) * Number(offM || 0)
  // A clock reading hh:mm at UTC(offset) is (hh - offset) in UTC; Date.UTC
  // normalises any hour/minute overflow across day boundaries for us.
  const utcMs = Date.UTC(y, mo - 1, d, Number(hh) - offHours, Number(mm) - offMins)
  return new Date(utcMs).toISOString()
}

// Sortable timestamp for ordering fixtures; falls back to midday on the date
// when no kickoff time is known, and to the far future when neither exists.
function fixtureSortKey(f) {
  if (f.kickoff) return Date.parse(f.kickoff)
  if (f.date) return Date.parse(`${f.date}T12:00:00Z`)
  return Infinity
}

async function main() {
  const res = await fetch(SOURCE_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${res.status}`)
  }
  const data = await res.json()

  // Preserve manually-entered red cards, keyed by stage|home|away.
  let existing = []
  try {
    existing = JSON.parse(readFileSync(MATCHES_PATH, 'utf8'))
  } catch {
    existing = []
  }
  const redsByKey = {}
  for (const m of existing) {
    if (m.homeReds || m.awayReds) {
      redsByKey[`${m.stage}|${m.home}|${m.away}`] = {
        homeReds: m.homeReds ?? 0,
        awayReds: m.awayReds ?? 0,
      }
    }
  }

  const out = []
  const fixtures = []
  let skipped = 0
  for (const m of data.matches || []) {
    const home = resolve(m.team1)
    const away = resolve(m.team2)
    // Only keep matches involving at least one of our players' teams.
    if (!TRACKED.has(home) && !TRACKED.has(away)) {
      skipped++
      continue
    }

    const stage = stageFromRound(m.round)

    if (!m.score || !m.score.ft) {
      // Not played yet — record it as an upcoming fixture.
      fixtures.push({
        stage,
        home,
        away,
        date: m.date || null,
        time: m.time || null,
        kickoff: parseKickoff(m.date, m.time),
        ground: m.ground || null,
        group: m.group || null,
      })
      continue
    }

    // Prefer the after-extra-time score if the match went that far.
    const decisive = m.score.et || m.score.ft
    const key = `${stage}|${home}|${away}`
    const reds = redsByKey[key] || { homeReds: 0, awayReds: 0 }

    out.push({
      stage,
      home,
      away,
      homeGoals: decisive[0],
      awayGoals: decisive[1],
      homeReds: reds.homeReds,
      awayReds: reds.awayReds,
    })
  }

  fixtures.sort((a, b) => fixtureSortKey(a) - fixtureSortKey(b))

  writeFileSync(MATCHES_PATH, JSON.stringify(out, null, 2) + '\n')
  writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2) + '\n')
  console.log(
    `Wrote ${out.length} played match(es) to matches.json and ` +
      `${fixtures.length} upcoming fixture(s) to fixtures.json ` +
      `(skipped ${skipped} not involving our teams).`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
