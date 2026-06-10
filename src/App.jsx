import React, { useMemo, useState } from 'react'
import players from './data/players.json'
import teams from './data/teams.json'
import matches from './data/matches.json'
import {
  buildLeaderboard,
  SCORING,
  STAGE_LABELS,
} from './scoring.js'
import SnackForm from './SnackForm.jsx'

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function TeamChip({ teamScore }) {
  const { team, points, played } = teamScore
  return (
    <div className="team-chip" title={`${team.name}: ${points} pts`}>
      <span className="team-flag">{team.flag}</span>
      <span className="team-name">{team.name}</span>
      <span className="team-pts">{played > 0 ? `${points}` : '–'}</span>
    </div>
  )
}

function App() {
  const [expanded, setExpanded] = useState(null)

  const leaderboard = useMemo(
    () => buildLeaderboard(players, teams, matches),
    [],
  )

  const hasMatches = matches.length > 0

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <span className="brand-mark">🏮</span>
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

      <main className="container">
        {!hasMatches && (
          <div className="kickoff-banner">
            <span className="kickoff-emoji">🌟</span>
            The tournament hasn’t kicked off yet — everyone starts at zero.
            Scores light up here as results come in.
          </div>
        )}

        <section className="board" aria-label="Leaderboard">
          <div className="board-head">
            <span className="col-rank">#</span>
            <span className="col-player">Player</span>
            <span className="col-teams">Teams</span>
            <span className="col-points">Points</span>
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

        <SnackForm />

        <ScoringLegend />
      </main>

      <footer className="footer">
        <span>🏮 LanternCare</span>
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
        <span className="team-flag">{t.team.flag}</span>
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
            {statLine(
              'Red cards',
              `${t.redCards} × ${SCORING.redCard}`,
              b.fromRedCards,
            )}
          </ul>
        </>
      )}
    </div>
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
          <span className="legend-pts neg">{SCORING.redCard}</span> for any red
          cards
        </li>
        <li>
          <span className="legend-pts pos">+{SCORING.snackDay}</span> bonus for
          every day you bring in snacks! 🍪
        </li>
      </ul>
      <p className="legend-note">
        Each player’s total is the sum of both their teams, plus snack bonuses.
        Stage bonuses are cumulative. Ties are broken by total goals scored.
      </p>
    </section>
  )
}

export default App
