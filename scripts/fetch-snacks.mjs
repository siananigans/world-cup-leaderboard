#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Syncs snack days from a Google Sheet into src/data/players.json.
//
// The team logs snacks via a Google Form, whose responses land in a Google
// Sheet. Publish that sheet as CSV (File → Share → Publish to web → CSV) and
// put the URL in the SNACK_SHEET_CSV_URL env var. This script counts one snack
// day per response row and writes each player's `snackDays`.
//
// Because it RECOMPUTES from the full sheet every run, there's no double
// counting — to undo a snack day, just delete that row in the sheet.
//
// Run locally:   SNACK_SHEET_CSV_URL="https://docs.google.com/.../pub?output=csv" npm run snacks
// In CI:         see .github/workflows/update-scores.yml
//
// If SNACK_SHEET_CSV_URL is not set, this is a no-op (so the build still works
// before the sheet exists, and it never wipes manually-set snack days).
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLAYERS_PATH = join(__dirname, '..', 'src', 'data', 'players.json')

const CSV_URL = process.env.SNACK_SHEET_CSV_URL
if (!CSV_URL) {
  console.log('SNACK_SHEET_CSV_URL not set — skipping snack sync.')
  process.exit(0)
}

const norm = (s) => String(s).trim().toLowerCase()

// Minimal CSV parser: handles quoted fields, escaped quotes and commas.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

async function main() {
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`Failed to fetch sheet CSV: HTTP ${res.status}`)
  const rows = parseCsv(await res.text())
  if (rows.length < 1) throw new Error('Sheet appears to be empty')

  const header = rows[0].map(norm)
  // The player column is the one whose header mentions "player"/"name";
  // fall back to the second column (col 1 is usually the Form timestamp).
  let playerCol = header.findIndex((h) => h.includes('player') || h.includes('name'))
  if (playerCol === -1) playerCol = header.length > 1 ? 1 : 0

  const players = JSON.parse(readFileSync(PLAYERS_PATH, 'utf8'))
  const idByName = {}
  for (const p of players) {
    idByName[norm(p.name)] = p.id
    idByName[norm(p.id)] = p.id
  }

  const counts = {}
  let unmatched = 0
  for (const r of rows.slice(1)) {
    const id = idByName[norm(r[playerCol] ?? '')]
    if (!id) {
      unmatched++
      continue
    }
    counts[id] = (counts[id] || 0) + 1
  }

  let changed = 0
  for (const p of players) {
    const next = counts[p.id] || 0
    if ((p.snackDays ?? 0) !== next) changed++
    p.snackDays = next
  }

  writeFileSync(PLAYERS_PATH, JSON.stringify(players, null, 2) + '\n')
  console.log(
    `Snack sync: ${rows.length - 1} response row(s), ${changed} player total(s) updated` +
      (unmatched ? `, ${unmatched} row(s) had an unrecognised player name.` : '.'),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
