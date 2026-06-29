import React, { useMemo, useState, useEffect } from 'react'
import players from './data/players.json'
import teams from './data/teams.json'
import matches from './data/matches.json'
import fixtures from './data/fixtures.json'
import {
  buildLeaderboard,
  SCORING,
  STAGE_LABELS,
} from './scoring.js'
import SnackForm from './SnackForm.jsx'
import lanternMark from './assets/lantern-mark.png'

// Pride week: banner + masthead + leaderboard decorations visible June 22–28
const PRIDE_WEEK_START = new Date('2026-06-22T00:00:00Z')
const PRIDE_WEEK_END = new Date('2026-06-28T23:59:59Z')
const PRIDE_WEEK_ACTIVE = new Date() >= PRIDE_WEEK_START && new Date() <= PRIDE_WEEK_END

// The specific Seattle pride match: EGY vs IRN, Jun 26 local / Jun 27 03:00 UTC
// Matched by teams + venue so it works whether the fixture is upcoming or live.
const isPrideMatch = (f) =>
  f.ground === 'Seattle' &&
  ((f.home === 'EGY' && f.away === 'IRN') || (f.home === 'IRN' && f.away === 'EGY'))

const RANK_MEDAL = PRIDE_WEEK_ACTIVE
  ? { 1: '🌈 🥇', 2: '🌈 🥈', 3: '🌈 🥉' }
  : { 1: '🥇', 2: '🥈', 3: '🥉' }

function Flag({ value, name }) {
  if (value && value.startsWith('/')) {
    // Resolve against the app's base URL so image flags work on a GitHub Pages
    // project subpath (e.g. /world-cup-leaderboard/), not just the domain root.
    const src = import.meta.env.BASE_URL.replace(/\/$/, '') + value
    return <img className="team-flag-img" src={src} alt={name} title={name} />
  }
  return <span className="team-flag">{value}</span>
}

// How many match days (days on which one of our teams plays) to list. Counts
// days with games, not calendar days, so gaps between rounds don't shrink it.
const FIXTURE_DAYS = 5

// A match is "live" if it kicked off within this window and hasn't yet been
// recorded as finished in matches.json. 150 min covers 90 min + stoppages + ET.
const LIVE_WINDOW_MS = 150 * 60 * 1000

// Keys of already-completed matches so we don't show them as live.
const COMPLETED_KEYS = new Set(matches.map((m) => `${m.home}-${m.away}`))

// Code -> team record, so fixtures can show a flag + name for tracked teams.
// Untracked opponents are stored as their raw name and fall back gracefully.
const TEAM_BY_CODE = Object.fromEntries(teams.map((t) => [t.code, t]))

// Team code -> the player who drew it, so fixtures can flag whose team is
// playing. Untracked opponents have no owner and simply show nothing.
const OWNER_BY_CODE = Object.fromEntries(
  players.flatMap((p) => p.teams.map((code) => [code, p.name])),
)

function lookupTeam(codeOrName) {
  return TEAM_BY_CODE[codeOrName] || { code: codeOrName, name: codeOrName, flag: '🏳️' }
}

const DAY_FMT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const TIME_FMT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
})

function getLiveMatches() {
  const now = Date.now()
  return fixtures
    .map((f) => ({ ...f, ts: f.kickoff ? Date.parse(f.kickoff) : Infinity }))
    .filter(
      (f) =>
        Number.isFinite(f.ts) &&
        f.ts < now &&
        now - f.ts < LIVE_WINDOW_MS &&
        !COMPLETED_KEYS.has(`${f.home}-${f.away}`),
    )
    .sort((a, b) => a.ts - b.ts)
}

// Upcoming fixtures grouped by their local match day, limited to the next few
// days that have games. Done at render time (against the viewer's clock and
// timezone) so a statically-built page always shows the right days.
function upcomingByDay(maxDays) {
  const now = Date.now()
  const upcoming = fixtures
    .map((f) => ({
      ...f,
      ts: f.kickoff
        ? Date.parse(f.kickoff)
        : f.date
          ? Date.parse(`${f.date}T12:00:00Z`)
          : Infinity,
    }))
    .filter((f) => Number.isFinite(f.ts) && f.ts >= now)
    .sort((a, b) => a.ts - b.ts)

  // Group by local calendar day so the date header matches the times shown.
  const groups = []
  const byKey = new Map()
  for (const f of upcoming) {
    const d = new Date(f.ts)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    let group = byKey.get(key)
    if (!group) {
      if (groups.length >= maxDays) break // we have enough days; stop
      group = { key, label: DAY_FMT.format(d), games: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    group.games.push(f)
  }
  return groups
}

function TeamChip({ teamScore }) {
  const { team, points, played } = teamScore
  return (
    <div className="team-chip" title={`${team.name}: ${points} pts`}>
      <Flag value={team.flag} name={team.name} />
      <span className="team-name">{team.name}</span>
      <span className="team-pts">{played > 0 ? `${points}` : '–'}</span>
    </div>
  )
}

function App() {
  const [expanded, setExpanded] = useState(null)

  const leaderboard = useMemo(
    () => buildLeaderboard(players, teams, matches, fixtures),
    [],
  )

  const hasMatches = matches.length > 0

  return (
    <div className={`page${PRIDE_WEEK_ACTIVE ? ' pride-theme' : ''}`}>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <img className="brand-mark" src={lanternMark} alt="" aria-hidden="true" />
            <span className="brand-name">LanternCare</span>
          </div>
          <h1>
            World Cup <span className="ball">⚽</span> Sweepstake
          </h1>
          <p className="tagline">
            Two teams each. One trophy. Lighting the way to glory.
          </p>
        </div>
      </header>
      {PRIDE_WEEK_ACTIVE && (
        <div
          className="pride-banner"
          role="banner"
          title="Celebrating Pride on and off the pitch."
        >
          <span className="pride-rainbow" aria-hidden="true"></span>
          <span className="pride-text">
            🏳️‍🌈 Pride Match Week — June 22–28 · Celebrating with Pride
          </span>
          <span className="pride-rainbow" aria-hidden="true"></span>
        </div>
      )}

      <main className="container">
        {!hasMatches && (
          <div className="kickoff-banner">
            <span className="kickoff-emoji">🌟</span>
            The tournament hasn't kicked off yet — everyone starts at zero.
            Scores light up here as results come in.
          </div>
        )}

        <LiveMatches />

        <section className="board" aria-label="Leaderboard">
          <div className="board-head">
            <span className="col-rank">#</span>
            <span className="col-player">Player</span>
            <span className="col-teams">Teams</span>
            <span className="col-points">
              Points{PRIDE_WEEK_ACTIVE ? ' 🏳️‍🌈' : ''}
            </span>
          </div>

          {leaderboard.map((row) => {
            const isOpen = expanded === row.id
            return (
              <div
                key={row.id}
                className={`board-row${row.rank <= 3 ? ' podium' : ''}${
                  isOpen ? ' open' : ''
                }`}
              >
                <button
                  className="row-summary"
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                  aria-expanded={isOpen}
                >
                  <span className="col-rank">
                    {RANK_MEDAL[row.rank] || row.rank}
                  </span>
                  <span className="col-player">
                    {row.name}
                    {row.snackBonus > 0 && (
                      <span className="snack-badge" title={`${row.snackDays} snack day(s): +${row.snackBonus}`}>
                        🍪 +{row.snackBonus}
                      </span>
                    )}
                  </span>
                  <span className="col-teams">
                    {row.teamScores.map((ts) => (
                      <TeamChip key={ts.code} teamScore={ts} />
                    ))}
                  </span>
                  <span className="col-points">
                    <span className="points-value">{row.points}</span>
                    <span className="chevron">{isOpen ? '▲' : '▼'}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="row-detail">
                    {row.teamScores.map((ts) => (
                      <TeamBreakdown key={ts.code} teamScore={ts} />
                    ))}
                    {row.snackBonus > 0 && (
                      <div className="snack-line">
                        🍪 Snack bonus — {row.snackDays} day
                        {row.snackDays === 1 ? '' : 's'} × {SCORING.snackDay}
                        <span className="snack-pts">+{row.snackBonus}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>

        <Fixtures />

        <SnackForm />

        <ScoringLegend />
      </main>

      <footer className="footer">
        <span className="footer-brand">
          <img className="footer-mark" src={lanternMark} alt="" aria-hidden="true" />
          LanternCare
        </span>
        <span className="dot">•</span>
        <span>Scores from a JSON file — edit and redeploy to update.</span>
      </footer>
    </div>
  )
}

function statLine(label, value, pts) {
  if (!pts) return null
  return (
    <li key={label} className={pts < 0 ? 'negative' : ''}>
      <span className="stat-label">{label}</span>
      <span className="stat-detail">{value}</span>
      <span className="stat-pts">
        {pts > 0 ? '+' : ''}
        {pts}
      </span>
    </li>
  )
}

function TeamBreakdown({ teamScore }) {
  const t = teamScore
  const b = t.breakdown
  const stageLabel = t.furthestStage ? STAGE_LABELS[t.furthestStage] : '—'

  return (
    <div className="team-breakdown">
      <div className="tb-head">
        <Flag value={t.team.flag} name={t.team.name} />
        <span className="tb-name">{t.team.name}</span>
        <span className="tb-total">{t.points} pts</span>
      </div>
      {t.played === 0 ? (
        <p className="tb-empty">No matches played yet.</p>
      ) : (
        <>
          <p className="tb-record">
            {t.played} played · {t.wins}W {t.draws}D {t.losses}L · reached{' '}
            {stageLabel}
            {t.isChampion ? ' · 🏆 Champion' : ''}
          </p>
          <ul className="tb-stats">
            {statLine('Wins', `${t.wins} × ${SCORING.win}`, b.fromWins)}
            {statLine('Draws', `${t.draws} × ${SCORING.draw}`, b.fromDraws)}
            {statLine('Advanced from group', '', b.fromAdvance)}
            {statLine('Quarter-finals', '', b.fromQuarter)}
            {statLine('Semi-finals', '', b.fromSemi)}
            {statLine('Champions 🏆', '', b.fromChampion)}
          </ul>
        </>
      )}
    </div>
  )
}

function FixtureTeam({ codeOrName, align }) {
  const team = lookupTeam(codeOrName)
  const owner = OWNER_BY_CODE[codeOrName]
  return (
    <span className={`fx-team ${align}`}>
      <Flag value={team.flag} name={team.name} />
      <span className="fx-team-col">
        <span className="fx-team-name">{team.name}</span>
        {owner && (
          <span className="fx-owner" title={`${team.name} belongs to ${owner}`}>
            {owner}
          </span>
        )}
      </span>
    </span>
  )
}

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

function LiveMatches() {
  const live = useMemo(() => getLiveMatches(), [])
  const [scores, setScores] = useState({})

  useEffect(() => {
    if (live.length === 0) return
    fetch(ESPN_URL)
      .then((r) => r.json())
      .then((data) => {
        // Keyed by ESPN abbreviation so we match on our tracked team code
        // regardless of what ESPN calls the opponent.
        const map = {}
        for (const event of data.events || []) {
          const comp = event.competitions?.[0]
          if (!comp) continue
          const home = comp.competitors?.find((c) => c.homeAway === 'home')
          const away = comp.competitors?.find((c) => c.homeAway === 'away')
          if (!home || !away) continue
          const state = event.status?.type?.state
          const statusName = event.status?.type?.name
          const clock =
            state === 'post' ? 'FT'
            : statusName === 'STATUS_HALFTIME' ? 'Half-time'
            : event.status?.displayClock
          const entry = {
            homeAbbr: home.team.abbreviation,
            awayAbbr: away.team.abbreviation,
            homeScore: home.score ?? '0',
            awayScore: away.score ?? '0',
            clock,
            live: state === 'in',
          }
          map[home.team.abbreviation] = entry
          map[away.team.abbreviation] = entry
        }
        setScores(map)
      })
      .catch(() => {})
  }, [live.length])

  if (live.length === 0) return null

  return (
    <section className="live-matches" aria-label="Matches in progress">
      <h2>
        <span className="live-dot" aria-hidden="true" />
        Now Playing
      </h2>
      <ol className="fixture-list">
        {live.map((f, i) => {
          const when = f.kickoff ? new Date(f.kickoff) : null
          const pride = isPrideMatch(f)
          const scoreData = scores[f.home] || scores[f.away]
          // If our home team is ESPN's away team the scores are flipped
          const swapped = scoreData && scoreData.homeAbbr === f.away
          return (
            <li
              className={`fixture live-fixture${pride ? ' pride-fixture' : ''}`}
              key={`live-${f.home}-${f.away}-${i}`}
            >
              <span className="fx-time fx-time--live">
                {when ? TIME_FMT.format(when) : 'TBC'}
              </span>
              <span className="fx-body">
                <span className="fx-match">
                  <FixtureTeam codeOrName={f.home} align="home" />
                  <span className="fx-v">
                    <span className="live-score">
                      <span className="live-badge">
                        <span className="live-ball" aria-hidden="true">⚽</span>
                        LIVE
                      </span>
                      {scoreData && (
                        <>
                          <span className="live-score-line">
                            {swapped ? scoreData.awayScore : scoreData.homeScore}
                            {' – '}
                            {swapped ? scoreData.homeScore : scoreData.awayScore}
                          </span>
                          <span className="live-clock">{scoreData.clock}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <FixtureTeam codeOrName={f.away} align="away" />
                </span>
                {f.ground && (
                  <span className="fx-ground">
                    {f.ground}{pride ? ' 🏳️‍🌈' : ''}
                  </span>
                )}
                {pride && (
                  <span className="pride-match-badge">Official Pride Match</span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Fixtures() {
  const days = useMemo(() => upcomingByDay(FIXTURE_DAYS), [])

  if (days.length === 0) return null

  return (
    <section className="fixtures" aria-label="Upcoming fixtures">
      <h2>📅 Upcoming</h2>
      {days.map((day) => (
        <div className="fx-day-group" key={day.key}>
          <h3 className="fx-date">{day.label}</h3>
          <ol className="fixture-list">
            {day.games.map((f, i) => {
              const when = f.kickoff ? new Date(f.kickoff) : null
              const pride = isPrideMatch(f)
              return (
                <li
                  className={`fixture${pride ? ' pride-fixture' : ''}`}
                  key={`${f.date}-${f.home}-${f.away}-${i}`}
                >
                  <span className="fx-time">
                    {when ? TIME_FMT.format(when) : 'TBC'}
                  </span>
                  <span className="fx-body">
                    <span className="fx-match">
                      <FixtureTeam codeOrName={f.home} align="home" />
                      <span className="fx-v">v</span>
                      <FixtureTeam codeOrName={f.away} align="away" />
                    </span>
                    {f.ground && (
                      <span className="fx-ground">
                        {f.ground}{pride ? ' 🏳️‍🌈' : ''}
                      </span>
                    )}
                    {pride && (
                      <span className="pride-match-badge">
                        Official Pride Match
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}

function ScoringLegend() {
  return (
    <section className="legend">
      <h2>🏅 How points work</h2>
      <ul className="legend-list">
        <li>
          <span className="legend-pts pos">+{SCORING.win}</span> your country
          wins a match
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.draw}</span> your country
          draws
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.advanceFromGroup}</span>{' '}
          advances from the group stage
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.quarterFinal}</span>{' '}
          quarter-finals
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.semiFinal}</span>{' '}
          semi-finals
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.champion}</span> World Cup
          winners 🎉
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.snackDay}</span> bonus for
          every day you bring in snacks! 🍪
        </li>
      </ul>
      <p className="legend-note">
        Each player's total is the sum of both their teams, plus snack bonuses.
        Stage bonuses are cumulative. Ties are broken by total goals scored.
      </p>
    </section>
  )
}

export default App
